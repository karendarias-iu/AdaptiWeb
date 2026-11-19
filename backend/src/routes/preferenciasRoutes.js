const express = require('express');
const verificarToken = require('../middleware/authMiddleware');
const { obtenerPreferencias, guardarPreferencias } = require('../controllers/preferenciasController');

const router = express.Router();

// Todas las rutas exigen sesión iniciada
router.get('/', verificarToken, obtenerPreferencias);
router.put('/', verificarToken, guardarPreferencias);

module.exports = router;
