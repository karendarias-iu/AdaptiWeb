/**
 * ============================================================================
 * textoRoutes.js - Enrutador de procesamiento de texto y extracción web en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Define los endpoints bajo el prefijo `/api/texto` montado en `server.js`.
 *   2. Protege las peticiones mediante el middleware local `verificarToken`, que valida
 *      el token JWT en la cabecera `Authorization: Bearer <token>` e inyecta `req.usuario`.
 *   3. Enruta la petición `POST /api/texto/procesar` hacia el controlador `procesarContenido`,
 *      encargado de normalizar texto plano o extraer el contenido limpio de una URL externa.
 *
 * Dependencias:
 *   - express -> creación del enrutador modular (`express.Router()`).
 *   - jsonwebtoken -> verificación de firma y vigencia del token JWT de sesión.
 *   - ../controllers/textoController -> `procesarContenido` para limpieza de texto y scraping HTML.
 *
 * Variables de entorno (.env):
 *   - JWT_SECRET: clave secreta compartida para verificar los tokens JWT.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { procesarContenido } = require('../controllers/textoController');

/**
 * Constantes de configuración del enrutador
 * 
 * router: instancia del enrutador de Express para el recurso `/api/texto`
 * JWT_SECRET: llave secreta cargada desde variables de entorno (o valor de respaldo local)
 */
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

/**
 * Middleware local que verifica la validez del token JWT antes de procesar contenido
 * 
 * Extrae el token del encabezado `Authorization: Bearer <token>`, lo decodifica con `jwt.verify`
 * y adjunta el payload en `req.usuario`
 * 
 * @param {import('express').Request} req - Objeto de petición HTTP Express
 * @param {import('express').Response} res - Objeto de respuesta HTTP Express
 * @param {import('express').NextFunction} next - Función para continuar al controlador
 * @returns {import('express').Response|void} Respuesta HTTP 401 si no hay token o expiró, o llama a `next()`
 */
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token de sesión requerido.' });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Sesión expirada o inválida.' });
  }
}

/**
 * POST /api/texto/procesar
 * Procesa texto directo ingresado por el usuario o extrae texto legible desde una URL externa
 */
router.post('/procesar', verificarToken, procesarContenido);

module.exports = router;
