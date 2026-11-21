/**
 * Controlador de tareas
 *
 * Tabla Tareas: id_tarea, id_usuario, titulo, descripcion, fecha_tarea (fecha/hora de finalización),
 * recordatorio, recordatorio_notificado, estado ('Sin Terminar' | 'Terminada'), fecha_creacion.
 *
 * - El id del usuario SIEMPRE sale del token (req.usuario), nunca del body: cada usuario solo ve y toca sus tareas.
 * - Las fechas se manejan como "hora de reloj" (sin zona horaria): lo que el usuario escribe es lo que se guarda y
 *   lo que se devuelve (DATE_FORMAT), para que no se desplacen al pasar por el servidor.
 */
const pool = require('../../db');
const verificarToken = require('../middleware/authMiddleware');

const ESTADO_PENDIENTE = 'Sin Terminar';
const ESTADO_TERMINADA = 'Terminada';
const MAX_TITULO = 100;       // VARCHAR(100)
const MAX_DESCRIPCION = 255;  // VARCHAR(255)

const COLUMNAS = `id_tarea, titulo, descripcion,
  DATE_FORMAT(fecha_tarea, '%Y-%m-%dT%H:%i:%s') AS fecha_tarea,
  DATE_FORMAT(recordatorio, '%Y-%m-%dT%H:%i:%s') AS recordatorio,
  recordatorio_notificado, estado`;

function formatear(fila) {
  return {
    id_tarea: fila.id_tarea,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    fecha_tarea: fila.fecha_tarea,
    recordatorio: fila.recordatorio,
    recordatorio_notificado: Boolean(fila.recordatorio_notificado),
    completada: fila.estado === ESTADO_TERMINADA
  };
}

// Acepta "2026-11-21T15:30", "2026-11-21T15:30:00" o con espacio. Devuelve "YYYY-MM-DD HH:MM:SS" o null si no es válida.
function normalizarFecha(valor) {
  if (typeof valor !== 'string') return null;
  const m = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;

  const [, a, mes, d, h, mi, s = '00'] = m;
  const f = new Date(Date.UTC(+a, +mes - 1, +d, +h, +mi, +s));
  const valida =
    f.getUTCFullYear() === +a && f.getUTCMonth() === +mes - 1 && f.getUTCDate() === +d &&
    f.getUTCHours() === +h && f.getUTCMinutes() === +mi && f.getUTCSeconds() === +s;

  return valida ? `${a}-${mes}-${d} ${h}:${mi}:${s}` : null;
}

function leerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function buscarTarea(idTarea, idUsuario) {
  const [filas] = await pool.query(
    `SELECT ${COLUMNAS} FROM Tareas WHERE id_tarea = ? AND id_usuario = ?`,
    [idTarea, idUsuario]
  );
  return filas[0] ? formatear(filas[0]) : null; // ya formateada: incluye "completada"
}

function errorInterno(res, accion, error) {
  console.error(`Error al ${accion}:`, error);
  return res.status(500).json({ message: 'Error interno del servidor.' });
}

// GET /api/tareas  -> pendientes primero, por fecha de finalización; las terminadas al final
async function listarTareas(req, res) {
  try {
    const [filas] = await pool.query(
      `SELECT ${COLUMNAS} FROM Tareas
        WHERE id_usuario = ?
        ORDER BY (estado = ?) ASC, fecha_tarea ASC, id_tarea ASC`,
      [req.usuario.id, ESTADO_TERMINADA]
    );
    return res.status(200).json({ tareas: filas.map(formatear) });
  } catch (error) {
    return errorInterno(res, 'listar tareas', error);
  }
}

// GET /api/tareas/recordatorios/pendientes -> tareas sin terminar con recordatorio que aún no se ha avisado.
// El navegador compara la hora con su reloj local (el servidor no conoce la zona horaria del usuario).
async function listarRecordatoriosPendientes(req, res) {
  try {
    const [filas] = await pool.query(
      `SELECT ${COLUMNAS} FROM Tareas
        WHERE id_usuario = ? AND estado <> ? AND recordatorio IS NOT NULL AND recordatorio_notificado = 0
        ORDER BY recordatorio ASC`,
      [req.usuario.id, ESTADO_TERMINADA]
    );
    return res.status(200).json({ tareas: filas.map(formatear) });
  } catch (error) {
    return errorInterno(res, 'listar recordatorios', error);
  }
}

// POST /api/tareas  { titulo, descripcion, fecha_tarea }
async function crearTarea(req, res) {
  const titulo = typeof req.body?.titulo === 'string' ? req.body.titulo.trim() : '';
  const descripcion = typeof req.body?.descripcion === 'string' ? req.body.descripcion.trim() : '';
  const fechaTarea = normalizarFecha(req.body?.fecha_tarea);

  if (!titulo) return res.status(400).json({ message: 'El título de la tarea es obligatorio.' });
  if (titulo.length > MAX_TITULO) {
    return res.status(400).json({ message: `El título no puede superar los ${MAX_TITULO} caracteres.` });
  }
  if (descripcion.length > MAX_DESCRIPCION) {
    return res.status(400).json({ message: `La descripción no puede superar los ${MAX_DESCRIPCION} caracteres.` });
  }
  if (!fechaTarea) {
    return res.status(400).json({ message: 'La fecha y hora de finalización no es válida.' });
  }

  try {
    const [resultado] = await pool.query(
      `INSERT INTO Tareas (id_usuario, titulo, descripcion, fecha_tarea, estado, fecha_creacion)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [req.usuario.id, titulo, descripcion, fechaTarea, ESTADO_PENDIENTE]
    );

    const tarea = await buscarTarea(resultado.insertId, req.usuario.id);
    return res.status(201).json({ message: 'Tarea creada con éxito.', tarea: tarea });
  } catch (error) {
    return errorInterno(res, 'crear tarea', error);
  }
}

// PATCH /api/tareas/:id/completar  { completada?: boolean }  (sin body: alterna el estado)
async function alternarCompletada(req, res) {
  const idTarea = leerId(req);
  if (!idTarea) return res.status(400).json({ message: 'ID de tarea inválido.' });

  try {
    const actual = await buscarTarea(idTarea, req.usuario.id);
    if (!actual) return res.status(404).json({ message: 'Tarea no encontrada.' });

    const terminar = typeof req.body?.completada === 'boolean' ? req.body.completada : !actual.completada;
    await pool.query(
      'UPDATE Tareas SET estado = ? WHERE id_tarea = ? AND id_usuario = ?',
      [terminar ? ESTADO_TERMINADA : ESTADO_PENDIENTE, idTarea, req.usuario.id]
    );

    const tarea = await buscarTarea(idTarea, req.usuario.id);
    return res.status(200).json({
      message: terminar ? 'Tarea finalizada.' : 'Tarea marcada como pendiente.',
      tarea: tarea
    });
  } catch (error) {
    return errorInterno(res, 'actualizar tarea', error);
  }
}

// PATCH /api/tareas/:id/recordatorio  { recordatorio: "YYYY-MM-DDTHH:MM" | null }
async function actualizarRecordatorio(req, res) {
  const idTarea = leerId(req);
  if (!idTarea) return res.status(400).json({ message: 'ID de tarea inválido.' });

  const crudo = req.body?.recordatorio;
  const recordatorio = crudo === null || crudo === '' || crudo === undefined ? null : normalizarFecha(crudo);
  if (crudo && !recordatorio) {
    return res.status(400).json({ message: 'La fecha y hora del recordatorio no es válida.' });
  }

  try {
    const actual = await buscarTarea(idTarea, req.usuario.id);
    if (!actual) return res.status(404).json({ message: 'Tarea no encontrada.' });
    if (actual.completada) {
      return res.status(409).json({ message: 'Una tarea finalizada no puede tener recordatorio.' });
    }

    // Al cambiar el recordatorio se vuelve a "no avisado"
    await pool.query(
      'UPDATE Tareas SET recordatorio = ?, recordatorio_notificado = 0 WHERE id_tarea = ? AND id_usuario = ?',
      [recordatorio, idTarea, req.usuario.id]
    );

    const tarea = await buscarTarea(idTarea, req.usuario.id);
    return res.status(200).json({
      message: recordatorio ? 'Recordatorio guardado.' : 'Recordatorio eliminado.',
      tarea: tarea
    });
  } catch (error) {
    return errorInterno(res, 'guardar recordatorio', error);
  }
}

// PATCH /api/tareas/:id/recordatorio-notificado  (el navegador ya mostró el aviso)
async function marcarRecordatorioNotificado(req, res) {
  const idTarea = leerId(req);
  if (!idTarea) return res.status(400).json({ message: 'ID de tarea inválido.' });

  try {
    const [resultado] = await pool.query(
      'UPDATE Tareas SET recordatorio_notificado = 1 WHERE id_tarea = ? AND id_usuario = ?',
      [idTarea, req.usuario.id]
    );
    if (resultado.affectedRows === 0) return res.status(404).json({ message: 'Tarea no encontrada.' });
    return res.status(200).json({ message: 'Recordatorio marcado como avisado.', id_tarea: idTarea });
  } catch (error) {
    return errorInterno(res, 'marcar recordatorio', error);
  }
}

// DELETE /api/tareas/:id  (solo tareas ya finalizadas)
async function eliminarTarea(req, res) {
  const idTarea = leerId(req);
  if (!idTarea) return res.status(400).json({ message: 'ID de tarea inválido.' });

  try {
    const actual = await buscarTarea(idTarea, req.usuario.id);
    if (!actual) return res.status(404).json({ message: 'Tarea no encontrada.' });
    if (!actual.completada) {
      return res.status(409).json({ message: 'Solo se pueden eliminar tareas finalizadas.' });
    }

    await pool.query('DELETE FROM Tareas WHERE id_tarea = ? AND id_usuario = ?', [idTarea, req.usuario.id]);
    return res.status(200).json({ message: 'Tarea eliminada correctamente.', id_tarea: idTarea });
  } catch (error) {
    return errorInterno(res, 'eliminar tarea', error);
  }
}

module.exports = {
  verificarToken,
  listarTareas,
  listarRecordatoriosPendientes,
  crearTarea,
  alternarCompletada,
  actualizarRecordatorio,
  marcarRecordatorioNotificado,
  eliminarTarea
};
