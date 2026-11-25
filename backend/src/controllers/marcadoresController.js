/**
 * ============================================================================
 * marcadoresController.js - Controlador de marcadores y favoritos en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica y crea automáticamente la tabla `Marcadores` en MySQL si aún no existe,
 *      además de migrar columnas antiguas (`favorito`, longitudes de `titulo` y `url`).
 *   2. Consulta y lista los marcadores del usuario autenticado (`GET /api/marcadores`),
 *      ordenando siempre los favoritos primero y luego los más recientes.
 *   3. Valida y registra nuevos enlaces (`POST /api/marcadores`), asegurando que usen
 *      protocolo HTTP o HTTPS y recortando las cadenas a la longitud máxima de la tabla.
 *   4. Alterna el estado de favorito de un marcador específico (`PATCH /api/marcadores/:id/favorito`).
 *   5. Elimina marcadores pertenecientes al usuario autenticado (`DELETE /api/marcadores/:id`).
 *
 * Dependencias:
 *   - ../../db -> piscina de conexiones MySQL (`pool`).
 *   - Middleware de autenticación -> inyecta `req.usuario.id` para aislar los datos por cuenta.
 *
 * Tablas afectadas en la base de datos:
 *   - Marcadores (id_marcador, id_usuario, titulo, url, favorito, fecha_creacion).
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const pool = require('../../db');
/**
 * Variables de estado del módulo
 * 
 * tablaVerificada: bandera booleana en memoria que evita ejecutar las consultas de
 *   verificación/migración del esquema DDL en cada petición HTTP tras la primera comprobación
 */
let tablaVerificada = false;
/**
 * Función asíncrona que garantiza la existencia y estructura actualizada de la tabla `Marcadores`
 * 
 * Crea la tabla si no existe, inspecciona `information_schema.COLUMNS` para añadir la columna
 * `favorito` en instalaciones antiguas y ajusta las longitudes máximas de `titulo` y `url`
 * 
 * @async
 * @returns {Promise<void>}
 */
async function asegurarTablaMarcadores() {
  if (tablaVerificada) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS Marcadores (
      id_marcador INT AUTO_INCREMENT PRIMARY KEY,
      id_usuario INT NOT NULL,
      titulo VARCHAR(150) NOT NULL,
      url VARCHAR(2048) NOT NULL,
      favorito TINYINT(1) NOT NULL DEFAULT 0,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_marcadores_usuario (id_usuario)
    )
  `);

  // Si la tabla ya existía con el esquema original (sin "favorito" y con columnas más cortas), la actualiza
  const [columnas] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Marcadores'`
  );
  const nombres = columnas.map((c) => c.COLUMN_NAME.toLowerCase());
  if (!nombres.includes('favorito')) {
    await pool.query('ALTER TABLE Marcadores ADD COLUMN favorito TINYINT(1) NOT NULL DEFAULT 0');
  }
  await pool.query('ALTER TABLE Marcadores MODIFY titulo VARCHAR(150) NOT NULL, MODIFY url VARCHAR(2048) NOT NULL');

  tablaVerificada = true;
}

/**
 * Función auxiliar que transforma una fila cruda de MySQL al formato JSON esperado por el frontend
 * 
 * @param {{id_marcador: number, titulo: string, url: string, favorito: number}} fila - Registro de BD
 * @returns {{id: number, titulo: string, url: string, favorito: boolean}} Objeto normalizado
 */
function formatearFila(fila) {
  return {
    id: fila.id_marcador,
    titulo: fila.titulo,
    url: fila.url,
    favorito: Boolean(fila.favorito)
  };
}

/**
 * Controlador GET /api/marcadores - Lista todos los marcadores del usuario autenticado
 * 
 * Ordena los resultados colocando los favoritos en la parte superior (`favorito DESC`)
 * y dentro de cada grupo del más reciente al más antiguo (`id_marcador DESC`)
 * 
 * @async
 * @param {import('express').Request} req - Petición Express con `req.usuario.id`
 * @param {import('express').Response} res - Respuesta Express
 * @returns {Promise<import('express').Response>} Arreglo JSON de marcadores del usuario
 */
async function listarMarcadores(req, res) {
  try {
    await asegurarTablaMarcadores();
    const [filas] = await pool.query(
      `SELECT id_marcador, titulo, url, favorito
         FROM Marcadores
        WHERE id_usuario = ?
        ORDER BY favorito DESC, id_marcador DESC`,
      [req.usuario.id]
    );
    return res.status(200).json(filas.map(formatearFila));
  } catch (error) {
    console.error('Error al listar marcadores:', error);
    return res.status(500).json({ message: 'Error interno al consultar los marcadores.' });
  }
}

/**
 * Controlador POST /api/marcadores - Crea y guarda un nuevo marcador para el usuario
 * 
 * Valida que el título y la URL existan, verifica con `new URL()` que el protocolo sea
 * `http:` o `https:` y recorta los valores a los límites de la tabla antes de insertar
 * 
 * @async
 * @param {import('express').Request} req - Petición Express con `{ titulo, url, favorito }` en `req.body`
 * @param {import('express').Response} res - Respuesta Express
 * @returns {Promise<import('express').Response>} Objeto JSON del marcador recién creado (HTTP 201)
 */
async function crearMarcador(req, res) {
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  const favorito = req.body?.favorito ? 1 : 0;

  if (!titulo || !url) {
    return res.status(400).json({ message: 'El título y la URL son obligatorios.' });
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return res.status(400).json({ message: 'La URL debe usar protocolo HTTP o HTTPS.' });
    }
  } catch {
    return res.status(400).json({ message: 'La URL ingresada no es válida.' });
  }

  try {
    await asegurarTablaMarcadores();
    const [resultado] = await pool.query(
      `INSERT INTO Marcadores (id_usuario, titulo, url, favorito)
       VALUES (?, ?, ?, ?)`,
      [req.usuario.id, titulo.slice(0, 150), url.slice(0, 2048), favorito]
    );

    return res.status(201).json({
      id: resultado.insertId,
      titulo: titulo.slice(0, 150),
      url: url.slice(0, 2048),
      favorito: Boolean(favorito)
    });
  } catch (error) {
    console.error('Error al crear marcador:', error);
    return res.status(500).json({ message: 'Error interno al guardar el marcador.' });
  }
}

/**
 * Controlador PATCH /api/marcadores/:id/favorito - Actualiza el estado de favorito
 * 
 * Valida que `:id` sea un entero positivo y actualiza la fila únicamente si pertenece
 * al usuario autenticado (`WHERE id_marcador = ? AND id_usuario = ?`)
 * 
 * @async
 * @param {import('express').Request} req - Petición Express con `req.params.id` y `req.body.favorito`
 * @param {import('express').Response} res - Respuesta Express
 * @returns {Promise<import('express').Response>} Objeto JSON `{ id, favorito }` actualizado
 */
async function actualizarFavorito(req, res) {
  const idMarcador = Number(req.params.id);
  const favorito = req.body?.favorito ? 1 : 0;

  if (!Number.isInteger(idMarcador) || idMarcador <= 0) {
    return res.status(400).json({ message: 'ID de marcador no válido.' });
  }

  try {
    await asegurarTablaMarcadores();
    const [resultado] = await pool.query(
      `UPDATE Marcadores
          SET favorito = ?
        WHERE id_marcador = ? AND id_usuario = ?`,
      [favorito, idMarcador, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ message: 'Marcador no encontrado.' });
    }

    return res.status(200).json({ id: idMarcador, favorito: Boolean(favorito) });
  } catch (error) {
    console.error('Error al actualizar favorito:', error);
    return res.status(500).json({ message: 'Error interno al actualizar favorito.' });
  }
}

/**
 * Controlador DELETE /api/marcadores/:id - Elimina un marcador del usuario
 * 
 * Verifica que el ID sea un entero positivo y elimina el registro filtrando siempre
 * por `id_usuario` para impedir que un usuario borre marcadores ajenos
 * 
 * @async
 * @param {import('express').Request} req - Petición Express con `req.params.id`
 * @param {import('express').Response} res - Respuesta Express
 * @returns {Promise<import('express').Response>} Mensaje JSON de confirmación
 */
async function eliminarMarcador(req, res) {
  const idMarcador = Number(req.params.id);

  if (!Number.isInteger(idMarcador) || idMarcador <= 0) {
    return res.status(400).json({ message: 'ID de marcador no válido.' });
  }

  try {
    await asegurarTablaMarcadores();
    const [resultado] = await pool.query(
      `DELETE FROM Marcadores
        WHERE id_marcador = ? AND id_usuario = ?`,
      [idMarcador, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ message: 'Marcador no encontrado.' });
    }

    return res.status(200).json({ message: 'Marcador eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar marcador:', error);
    return res.status(500).json({ message: 'Error interno al eliminar el marcador.' });
  }
}

module.exports = {
  listarMarcadores,
  crearMarcador,
  actualizarFavorito,
  eliminarMarcador
};
