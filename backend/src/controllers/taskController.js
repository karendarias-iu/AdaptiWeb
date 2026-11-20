const pool = require('../../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ message: 'Token de autenticación requerido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = {
      id: decoded.id,
      email: decoded.email,
      nombre: decoded.nombre
    };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}

function formatearRecordatorioParaMySQL(fechaStr) {
  if (!fechaStr) return null;
  const fecha = new Date(fechaStr);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 19).replace('T', ' ');
}

// GET /api/tareas
async function listarTareas(req, res) {
  try {
    const [filas] = await pool.query(
      `SELECT id_tarea, titulo, recordatorio, completada, creada_en
         FROM Tareas
        WHERE id_usuario = ?
        ORDER BY completada ASC, recordatorio IS NULL ASC, recordatorio ASC, id_tarea DESC`,
      [req.usuario.id]
    );

    const tareas = filas.map((fila) => ({
      id_tarea: fila.id_tarea,
      titulo: fila.titulo,
      recordatorio: fila.recordatorio,
      completada: Boolean(fila.completada),
      creada_en: fila.creada_en
    }));

    return res.status(200).json({ tareas });
  } catch (error) {
    console.error('Error al listar tareas:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// POST /api/tareas
async function crearTarea(req, res) {
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const recordatorioRaw = req.body?.recordatorio || null;

  if (!titulo) {
    return res.status(400).json({ message: 'El título de la tarea es obligatorio.' });
  }
  if (titulo.length > 180) {
    return res.status(400).json({ message: 'El título no puede superar los 180 caracteres.' });
  }

  const recordatorio = formatearRecordatorioParaMySQL(recordatorioRaw);
  if (recordatorioRaw && !recordatorio) {
    return res.status(400).json({ message: 'La fecha u hora del recordatorio no es válida.' });
  }

  try {
    const [resultado] = await pool.query(
      `INSERT INTO Tareas (id_usuario, titulo, recordatorio, completada)
       VALUES (?, ?, ?, 0)`,
      [req.usuario.id, titulo, recordatorio]
    );

    const [creada] = await pool.query(
      `SELECT id_tarea, titulo, recordatorio, completada, creada_en
         FROM Tareas
        WHERE id_tarea = ? AND id_usuario = ?`,
      [resultado.insertId, req.usuario.id]
    );

    const t = creada[0];
    return res.status(201).json({
      message: 'Tarea agregada correctamente.',
      tarea: {
        id_tarea: t.id_tarea,
        titulo: t.titulo,
        recordatorio: t.recordatorio,
        completada: Boolean(t.completada),
        creada_en: t.creada_en
      }
    });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// PATCH /api/tareas/:id/completar
async function alternarCompletada(req, res) {
  const idTarea = Number(req.params.id);
  if (!Number.isInteger(idTarea) || idTarea <= 0) {
    return res.status(400).json({ message: 'ID de tarea inválido.' });
  }

  try {
    const [actuales] = await pool.query(
      'SELECT id_tarea, completada FROM Tareas WHERE id_tarea = ? AND id_usuario = ?',
      [idTarea, req.usuario.id]
    );

    if (actuales.length === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada.' });
    }

    const nuevoEstado =
      typeof req.body?.completada === 'boolean'
        ? (req.body.completada ? 1 : 0)
        : (actuales[0].completada ? 0 : 1);

    await pool.query(
      'UPDATE Tareas SET completada = ? WHERE id_tarea = ? AND id_usuario = ?',
      [nuevoEstado, idTarea, req.usuario.id]
    );

    return res.status(200).json({
      message: nuevoEstado ? 'Tarea marcada como completada.' : 'Tarea marcada como pendiente.',
      id_tarea: idTarea,
      completada: Boolean(nuevoEstado)
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// DELETE /api/tareas/:id
async function eliminarTarea(req, res) {
  const idTarea = Number(req.params.id);
  if (!Number.isInteger(idTarea) || idTarea <= 0) {
    return res.status(400).json({ message: 'ID de tarea inválido.' });
  }

  try {
    const [resultado] = await pool.query(
      'DELETE FROM Tareas WHERE id_tarea = ? AND id_usuario = ?',
      [idTarea, req.usuario.id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada.' });
    }

    return res.status(200).json({ message: 'Tarea eliminada correctamente.', id_tarea: idTarea });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = {
  verificarToken,
  listarTareas,
  crearTarea,
  alternarCompletada,
  eliminarTarea
};
