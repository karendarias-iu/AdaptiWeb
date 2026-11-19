/**
 * Controlador de preferencias de accesibilidad
 *
 * Maneja la lectura y el guardado de las preferencias de texto de cada usuario:
 * fuente, tamaño, interlineado, espacio entre letras, espacio entre palabras y contraste.
 */
const pool = require('../../db');

// Fuentes permitidas (deben coincidir con la lista de frontend/src/js/tema.js)
const FUENTES = [
  'Botones',
  // Pensadas para accesibilidad
  'Lexend', 'Atkinson Hyperlegible', 'OpenDyslexic', 'Comic Sans MS',
  // Sans-serif
  'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Calibri', 'Segoe UI', 'Helvetica',
  'Century Gothic', 'Open Sans', 'Roboto', 'Lato', 'Nunito', 'Montserrat', 'Poppins',
  'Source Sans 3', 'Noto Sans', 'Inter',
  // Serif
  'Georgia', 'Times New Roman', 'Cambria', 'Garamond', 'Palatino Linotype', 'Book Antiqua',
  'Merriweather', 'Lora', 'Noto Serif',
  // Monoespaciadas
  'Courier New', 'Consolas', 'Lucida Console'
];

const CONTRASTES = ['claro', 'oscuro'];

// Límites de los campos numéricos (mismos que en el frontend)
const LIMITES = {
  tamanio_fuente:   { nombre: 'El tamaño de fuente',          min: 8, max: 120 }, // px
  interlineado:     { nombre: 'El interlineado',              min: 1, max: 5 },   // multiplicador
  espacio_letras:   { nombre: 'El espacio entre letras',      min: 0, max: 20 },  // px
  espacio_palabras: { nombre: 'El espacio entre palabras',    min: 0, max: 50 }   // px
};

const PREDETERMINADAS = {
  fuente: 'Botones',
  tamanio_fuente: 16,
  interlineado: 1.5,
  espacio_letras: 0,
  espacio_palabras: 0,
  contraste: 'oscuro',
  fecha_actualizacion: null
};

// Convierte "1,5" o "1.5" o 1.5 en número. Si no es un número válido devuelve NaN.
function aNumero(valor) {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : NaN;
  if (typeof valor !== 'string') return NaN;
  const texto = valor.trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(texto) ? parseFloat(texto) : NaN;
}

// Valida el body. Devuelve { errores, datos } (datos ya con números limpios)
function validar(body) {
  const errores = [];
  const datos = {};

  if (!FUENTES.includes(body.fuente)) errores.push('La fuente seleccionada no es válida.');
  else datos.fuente = body.fuente;

  if (!CONTRASTES.includes(body.contraste)) errores.push('El contraste seleccionado no es válido.');
  else datos.contraste = body.contraste;

  for (const [campo, { nombre, min, max }] of Object.entries(LIMITES)) {
    const numero = aNumero(body[campo]);
    if (Number.isNaN(numero)) {
      errores.push(`${nombre} debe ser un número.`);
    } else if (numero < min || numero > max) {
      errores.push(`${nombre} debe estar entre ${min} y ${max}.`);
    } else {
      datos[campo] = Math.round(numero * 100) / 100; // 2 decimales, como DECIMAL(10,2)
    }
  }

  return { errores, datos };
}

// MySQL devuelve los DECIMAL como texto ("16.00"): los pasamos a número
function formatear(fila) {
  return {
    fuente: fila.fuente,
    tamanio_fuente: Number(fila.tamanio_fuente),
    interlineado: Number(fila.interlineado),
    espacio_letras: Number(fila.espacio_letras),
    espacio_palabras: Number(fila.espacio_palabras),
    contraste: fila.contraste,
    fecha_actualizacion: fila.fecha_actualizacion
  };
}

// Función reutilizable (también la usa /api/login). Si no hay registro, devuelve las predeterminadas.
async function obtenerPreferenciasUsuario(idUsuario) {
  const [filas] = await pool.query(
    `SELECT fuente, tamanio_fuente, interlineado, espacio_letras, espacio_palabras,
            contraste, fecha_actualizacion
       FROM Preferencias WHERE id_usuario = ?
      ORDER BY fecha_actualizacion DESC, id_preferencia DESC
      LIMIT 1`,
    [idUsuario]
  );
  return filas.length ? formatear(filas[0]) : { ...PREDETERMINADAS };
}

// GET /api/preferencias
async function obtenerPreferencias(req, res) {
  try {
    const preferencias = await obtenerPreferenciasUsuario(req.usuario.id);
    return res.status(200).json(preferencias);
  } catch (error) {
    console.error('Error al obtener preferencias:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

// PUT /api/preferencias  (crea o actualiza)
async function guardarPreferencias(req, res) {
  const { errores, datos } = validar(req.body || {});
  if (errores.length) {
    return res.status(400).json({ message: errores.join(' '), errores });
  }

  try {
    // Fecha y hora exactas en que se pulsó "Guardar" (momento en que llega la petición).
    const ahora = new Date();

    // 1) Si el usuario ya tiene preferencias, se actualizan (así nunca se duplican filas,
    //    exista o no el índice único en id_usuario).
    const [resultado] = await pool.query(
      `UPDATE Preferencias
          SET fuente = ?, tamanio_fuente = ?, interlineado = ?, espacio_letras = ?,
              espacio_palabras = ?, contraste = ?, fecha_actualizacion = ?
        WHERE id_usuario = ?`,
      [
        datos.fuente, datos.tamanio_fuente, datos.interlineado, datos.espacio_letras,
        datos.espacio_palabras, datos.contraste, ahora, req.usuario.id
      ]
    );

    // 2) Si no tenía ninguna fila, se crea la primera.
    if (resultado.affectedRows === 0) {
      await pool.query(
        `INSERT INTO Preferencias
           (id_usuario, fuente, tamanio_fuente, interlineado, espacio_letras,
            espacio_palabras, contraste, fecha_actualizacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           fuente = VALUES(fuente),
           tamanio_fuente = VALUES(tamanio_fuente),
           interlineado = VALUES(interlineado),
           espacio_letras = VALUES(espacio_letras),
           espacio_palabras = VALUES(espacio_palabras),
           contraste = VALUES(contraste),
           fecha_actualizacion = VALUES(fecha_actualizacion)`,
        [
          req.usuario.id, datos.fuente, datos.tamanio_fuente, datos.interlineado,
          datos.espacio_letras, datos.espacio_palabras, datos.contraste, ahora
        ]
      );
    }

    const preferencias = await obtenerPreferenciasUsuario(req.usuario.id);
    return res.status(200).json({ message: 'Preferencias guardadas correctamente.', preferencias });
  } catch (error) {
    console.error('Error al guardar preferencias:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

module.exports = {
  obtenerPreferencias,
  guardarPreferencias,
  obtenerPreferenciasUsuario,
  validar,
  FUENTES
};
