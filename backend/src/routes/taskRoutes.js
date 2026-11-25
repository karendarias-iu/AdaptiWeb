/**
 * ============================================================================
 * taskRoutes.js - Enrutador de gestión de tareas y recordatorios en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Define los endpoints bajo el prefijo `/api/tareas` montado en `server.js`.
 *   2. Aplica de forma global el middleware `verificarToken` (`router.use(verificarToken)`)
 *      para exigir una sesión JWT válida en todas las operaciones del módulo.
 *   3. Enruta las peticiones hacia `taskController`:
 *      - `GET /api/tareas` -> lista las tareas del usuario (pendientes primero).
 *      - `GET /api/tareas/recordatorios/pendientes` -> consulta recordatorios pendientes por avisar.
 *      - `POST /api/tareas` -> crea una nueva tarea.
 *      - `PATCH /api/tareas/:id/completar` -> marca o desmarca una tarea como finalizada.
 *      - `PATCH /api/tareas/:id/recordatorio` -> programa o elimina la fecha de recordatorio.
 *      - `PATCH /api/tareas/:id/recordatorio-notificado` -> marca el recordatorio como notificado.
 *      - `DELETE /api/tareas/:id` -> elimina permanentemente una tarea ya finalizada.
 *
 * Dependencias:
 *   - express -> creación del enrutador modular (`express.Router()`).
 *   - ../middleware/authMiddleware -> `verificarToken` para autenticar al usuario.
 *   - ../controllers/taskController -> controladores de lógica de negocio y consultas SQL.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const express = require('express');
const verificarToken = require('../middleware/authMiddleware');
const controlador = require('../controllers/taskController');

/**
 * Instancia del enrutador de Express para el recurso `/api/tareas`
 * @type {import('express').Router}
 */
const router = express.Router();

// Protege todas las rutas de este enrutador exigiendo un token JWT de sesión válido
router.use(verificarToken);

/**
 * Definición de rutas protegidas para `/api/tareas`
 */
router.get('/', controlador.listarTareas);
router.get('/recordatorios/pendientes', controlador.listarRecordatoriosPendientes);
router.post('/', controlador.crearTarea);
router.patch('/:id/completar', controlador.alternarCompletada);
router.patch('/:id/recordatorio', controlador.actualizarRecordatorio);
router.patch('/:id/recordatorio-notificado', controlador.marcarRecordatorioNotificado);
router.delete('/:id', controlador.eliminarTarea);

module.exports = router;
