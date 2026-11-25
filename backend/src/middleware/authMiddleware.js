/**
 * ============================================================================
 * authMiddleware.js - Middleware de autenticación mediante JWT en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Intercepta las peticiones HTTP dirigidas a rutas protegidas de la API.
 *   2. Extrae el token JWT desde la cabecera `Authorization: Bearer <token>`.
 *   3. Verifica la firma digital y vigencia del token utilizando `JWT_SECRET`.
 *   4. Valida que el payload contenga la propiedad `id` para impedir que tokens
 *      temporales de recuperación de contraseña sean utilizados como tokens de sesión.
 *   5. Inyecta los datos verificados del usuario (`id`, `email`, `nombre`) en `req.usuario`
 *      y cede el control al siguiente controlador mediante `next()`.
 *
 * Dependencias:
 *   - jsonwebtoken -> verificación criptográfica y decodificación del token JWT.
 *
 * Variables de entorno (.env):
 *   - JWT_SECRET: clave secreta compartida para firmar y validar los tokens de sesión.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
const jwt = require('jsonwebtoken');
/**
 * Constantes de configuración del middleware
 * 
 * JWT_SECRET: llave secreta cargada desde variables de entorno (o valor de respaldo local)
 */
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

/**
 * Middleware Express que valida el token de sesión JWT en cada petición protegida
 * 
 * Comprueba el formato `Bearer <token>`, decodifica el JWT, verifica que corresponda
 * a una sesión válida (`datos.id`) y adjunta `req.usuario` antes de continuar
 * 
 * @param {import('express').Request} req - Objeto de petición HTTP Express
 * @param {import('express').Response} res - Objeto de respuesta HTTP Express
 * @param {import('express').NextFunction} next - Función para continuar al siguiente middleware o controlador
 * @returns {import('express').Response|void} Respuesta HTTP 401 si falla la validación, o llama a `next()`
 */
function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const [tipo, token] = encabezado.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Debes iniciar sesión.' });
  }

  try {
    const datos = jwt.verify(token, JWT_SECRET);

    // El token de recuperación de contraseña también se firma con este secreto
    // pero no trae "id"; así evitamos que se use como token de sesión.
    if (!datos.id) {
      return res.status(401).json({ message: 'Token no válido.' });
    }

    req.usuario = { id: datos.id, email: datos.email, nombre: datos.nombre };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'La sesión expiró o no es válida. Inicia sesión de nuevo.' });
  }
}

module.exports = verificarToken;
