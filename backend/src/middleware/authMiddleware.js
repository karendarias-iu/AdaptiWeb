/**
 * Middleware de autenticación
 *
 * Lee el token JWT del encabezado "Authorization: Bearer <token>", verifica
 * su firma y expiración, y deja los datos del usuario en req.usuario.
 * El id del usuario SIEMPRE sale del token, nunca del body de la petición.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

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
