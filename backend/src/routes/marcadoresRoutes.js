/**
 * ============================================================================
 * marcadoresRoutes.js - Enrutador de marcadores y favoritos en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Define los endpoints bajo el prefijo `/api/marcadores` montado en `server.js`.
 *   2. Protege todas las rutas mediante el middleware local `verificarToken`, que valida
 *      el token JWT en la cabecera `Authorization: Bearer <token>` e inyecta `req.usuario`.
 *   3. Enruta las operaciones CRUD de marcadores hacia `marcadoresController`:
 *      - `GET /api/marcadores` -> lista los marcadores del usuario (favoritos primero).
 *      - `POST /api/marcadores` -> crea un nuevo marcador validando título y URL.
 *      - `PATCH /api/marcadores/:id/favorito` -> alterna el estado de favorito.
 *      - `DELETE /api/marcadores/:id` -> elimina un marcador existente.
 *
 * Dependencias:
 *   - express -> creación del enrutador modular (`express.Router()`).
 *   - jsonwebtoken -> verificación de firma y vigencia del token JWT de sesión.
 *   - ../controllers/marcadoresController -> controladores de lógica de negocio y SQL.
 *
 * Variables de entorno (.env):
 *   - JWT_SECRET: clave secreta compartida para verificar los tokens JWT.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  listarMarcadores,
  crearMarcador,
  actualizarFavorito,
  eliminarMarcador
} = require('../controllers/marcadoresController');

/**
 * Constantes de configuración del enrutador
 * 
 * router: instancia del enrutador de Express para el recurso `/api/marcadores`
 * JWT_SECRET: llave secreta cargada desde variables de entorno (o valor de respaldo local)
 */
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

/**
 * Middleware local que verifica la validez del token JWT en cada petición de marcadores
 * 
 * Extrae el token del encabezado `Authorization: Bearer <token>`, lo decodifica con `jwt.verify`
 * y adjunta el payload en `req.usuario` para aislar los marcadores por cuenta
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

router.get('/', verificarToken, listarMarcadores);
router.post('/', verificarToken, crearMarcador);
router.patch('/:id/favorito', verificarToken, actualizarFavorito);
router.delete('/:id', verificarToken, eliminarMarcador);

module.exports = router;
