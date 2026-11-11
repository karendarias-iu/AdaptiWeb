//importa la libreria actual
const mysql = require('mysql2/promise');
//carga las variables de (.env)
require('dotenv').config();

//crea el enlace para mantener conexion con la base de datos de forma constante en cada petición
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'adaptiweb',
  port: process.env.DB_PORT || 3306, // <-- Añadimos el puerto
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

//exporta el objeto pool que se usara en server.js
module.exports = pool;