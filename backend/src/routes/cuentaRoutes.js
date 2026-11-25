/**
 * ============================================================================
 * cuentaRoutes.js - Enrutador de gestión de cuenta de usuario en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Define los endpoints bajo el prefijo `/api/cuenta` montado en `server.js`.
 *   2. Protege las rutas mediante el middleware `verificarToken` para exigir una sesión JWT activa.
 *   3. Enruta la petición `DELETE /api/cuenta` hacia el controlador `eliminarCuenta`,
 *      encargado de borrar la cuenta y todos los datos asociados al usuario.
 *
 * Dependencias:
 *   - express -> creación del enrutador modular (`express.Router()`).
 *   - ../middleware/authMiddleware -> `verificarToken` para validar la identidad del usuario.
 *   - ../controllers/cuentaController -> `eliminarCuenta` para ejecutar la lógica de borrado.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const express = require('express');
const verificarToken = require('../middleware/authMiddleware');
const { eliminarCuenta } = require('../controllers/cuentaController');

/**
 * Instancia del enrutador de Express para el recurso `/api/cuenta`
 * @type {import('express').Router}
 */
const router = express.Router();

/**
 * DELETE /api/cuenta
 * Elimina definitivamente la cuenta del usuario autenticado y todos sus registros asociados
 */
router.delete('/', verificarToken, eliminarCuenta);

module.exports = router;