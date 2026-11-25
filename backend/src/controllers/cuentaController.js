/**
 * ============================================================================
 * cuentaController.js - Controlador de gestión y eliminación de cuenta en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Procesa la eliminación definitiva de la cuenta del usuario autenticado (`DELETE /api/cuenta`).
 *   2. Extrae el identificador del usuario directamente del token JWT verificado (`req.usuario.id`),
 *      evitando cualquier manipulación desde el cuerpo de la petición.
 *   3. Ejecuta el borrado dentro de una transacción SQL atómica (`beginTransaction` / `commit` / `rollback`)
 *      para garantizar integridad referencial: primero elimina los registros en las tablas hijas
 *      (Tareas, Marcadores, Pomodoro, Preferencias) y finalmente el registro padre en `Usuarios`.
 *   4. Ignora de forma segura el error MySQL `ER_NO_SUCH_TABLE` (1146) en caso de que alguna tabla
 *      dinámica aún no haya sido creada para ese entorno.
 *
 * Dependencias:
 *   - ../../db -> piscina de conexiones MySQL (`pool`) para obtener una conexión dedicada.
 *   - Middleware de autenticación -> inyecta `req.usuario.id` antes de ejecutar el controlador.
 *
 * Tablas afectadas en la base de datos:
 *   - Tareas, Marcadores, Pomodoro, Preferencias (tablas hijas) -> Usuarios (tabla principal).
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const pool = require('../../db');

/**
 * Constantes de configuración del controlador
 * 
 * TABLAS_DEL_USUARIO: lista ordenada de tablas dependientes vinculadas por `id_usuario`
 *   (si se añade una nueva tabla asociada al usuario en la BD, debe registrarse aquí)
 * ER_NO_SUCH_TABLE: código de error nativo de MySQL (1146) cuando una tabla aún no existe
 */

const TABLAS_DEL_USUARIO = ['Tareas', 'Marcadores', 'Pomodoro', 'Preferencias'];
const ER_NO_SUCH_TABLE = 1146;

/**
 * Controlador asíncrono que elimina la cuenta del usuario y todos sus datos asociados
 * 
 * Abre una conexión exclusiva del pool, inicia una transacción SQL, limpia cada tabla hija
 * respetando las llaves foráneas y borra el registro de la tabla `Usuarios`. Si ocurre algún
 * fallo o el usuario no existe, revierte todos los cambios con `rollback()`.
 * 
 * @async
 * @param {import('express').Request} req - Objeto de petición Express (contiene `req.usuario.id`)
 * @param {import('express').Response} res - Objeto de respuesta Express
 * @returns {Promise<import('express').Response>} Respuesta HTTP JSON con el resultado de la operación
 */
async function eliminarCuenta(req, res) {
  const idUsuario = req.usuario.id;
  let conexion;

  try {
    conexion = await pool.getConnection();
    await conexion.beginTransaction();

    for (const tabla of TABLAS_DEL_USUARIO) {
      try {
        await conexion.query(`DELETE FROM ${tabla} WHERE id_usuario = ?`, [idUsuario]);
      } catch (error) {
        // Algunas tablas (p. ej. Marcadores) se crean la primera vez que se usan: si aún no existe, no hay nada que borrar
        if (error.errno !== ER_NO_SUCH_TABLE) throw error;
      }
    }

    const [resultado] = await conexion.query('DELETE FROM Usuarios WHERE id_usuario = ?', [idUsuario]);

    if (resultado.affectedRows === 0) {
      await conexion.rollback();
      return res.status(404).json({ message: 'La cuenta no existe o ya fue eliminada.' });
    }

    await conexion.commit();
    return res.status(200).json({ message: 'Su cuenta fue eliminada exitosamente.' });
  } catch (error) {
    if (conexion) await conexion.rollback().catch(() => {});
    console.error('Error al eliminar la cuenta:', error);
    return res.status(500).json({ message: 'No se pudo eliminar la cuenta. Inténtalo de nuevo.' });
  } finally {
    if (conexion) conexion.release();
  }
}

module.exports = { eliminarCuenta };
