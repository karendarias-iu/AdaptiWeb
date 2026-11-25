/**
 * ============================================================================
 * preferenciasRoutes.js - Enrutador de preferencias de accesibilidad en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Define los endpoints bajo el prefijo `/api/preferencias` montado en `server.js`.
 *   2. Protege todas las rutas mediante el middleware `verificarToken`, exigiendo
 *      una sesión JWT activa antes de consultar o modificar ajustes visuales.
 *   3. Enruta las operaciones hacia `preferenciasController`:
 *      - `GET /api/preferencias` -> obtiene las preferencias visuales actuales del usuario.
 *      - `PUT /api/preferencias` -> valida y guarda los cambios de tipografía y contraste.
 *
 * Dependencias:
 *   - express -> creación del enrutador modular (`express.Router()`).
 *   - ../middleware/authMiddleware -> `verificarToken` para autenticar al usuario.
 *   - ../controllers/preferenciasController -> `obtenerPreferencias` y `guardarPreferencias`.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const express = require('express');
const verificarToken = require('../middleware/authMiddleware');
const { obtenerPreferencias, guardarPreferencias } = require('../controllers/preferenciasController');

/**
 * Instancia del enrutador de Express para el recurso `/api/preferencias`
 * @type {import('express').Router}
 */
const router = express.Router();

/**
 * Definición de rutas protegidas para `/api/preferencias`
 */
router.get('/', verificarToken, obtenerPreferencias);
router.put('/', verificarToken, guardarPreferencias);

module.exports = router;
