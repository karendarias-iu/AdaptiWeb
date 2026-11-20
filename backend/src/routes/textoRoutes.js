/**
 * Rutas de procesamiento de texto y extracción desde URL
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { procesarContenido } = require('../controllers/textoController');

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

router.post('/procesar', verificarToken, procesarContenido);

module.exports = router;
