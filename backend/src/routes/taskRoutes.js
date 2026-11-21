/**
 * Rutas de tareas  (montadas en server.js bajo /api/tareas)
 * Todas requieren sesión iniciada (token JWT).
 */
const express = require('express');
const verificarToken = require('../middleware/authMiddleware');
const controlador = require('../controllers/taskController');

const router = express.Router();

router.use(verificarToken);

router.get('/', controlador.listarTareas);
router.get('/recordatorios/pendientes', controlador.listarRecordatoriosPendientes);
router.post('/', controlador.crearTarea);
router.patch('/:id/completar', controlador.alternarCompletada);
router.patch('/:id/recordatorio', controlador.actualizarRecordatorio);
router.patch('/:id/recordatorio-notificado', controlador.marcarRecordatorioNotificado);
router.delete('/:id', controlador.eliminarTarea);

module.exports = router;
