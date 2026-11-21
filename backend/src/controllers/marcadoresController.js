/**
 * Controlador de Marcadores por usuario
 *
 * Crea automáticamente la tabla Marcadores si no existe en MySQL y permite
 * listar, crear, marcar/desmarcar favorito y eliminar enlaces del usuario.
 */
const pool = require('../../db');

let tablaVerificada = false;

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

function formatearFila(fila) {
  return {
    id: fila.id_marcador,
    titulo: fila.titulo,
    url: fila.url,
    favorito: Boolean(fila.favorito)
  };
}

// GET /api/marcadores
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

// POST /api/marcadores
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

// PATCH /api/marcadores/:id/favorito
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

// DELETE /api/marcadores/:id
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
