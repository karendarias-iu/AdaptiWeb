/**
 * Rutas de marcadores personales del usuario
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const {
  listarMarcadores,
  crearMarcador,
  actualizarFavorito,
  eliminarMarcador
} = require('../controllers/marcadoresController');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

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
