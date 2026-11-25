/**
 * ============================================================================
 * db.js - Configuración y piscina de conexiones a la base de datos MySQL en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Carga las variables de entorno privadas definidas en el archivo `.env`.
 *   2. Crea y configura un pool (piscina) de conexiones reutilizables hacia el servidor
 *      MySQL mediante la versión basada en promesas (`mysql2/promise`).
 *   3. Administra hasta 10 conexiones simultáneas en cola sin límite (`queueLimit: 0`)
 *      para optimizar el rendimiento frente a múltiples peticiones concurrentes.
 *   4. Exporta la instancia `pool` para ser importada por `server.js` y todos los
 *      controladores de la aplicación.
 *
 * Dependencias:
 *   - mysql2/promise -> driver MySQL compatible con `async/await`.
 *   - dotenv -> lectura de credenciales desde `.env`.
 *
 * Variables de entorno (.env):
 *   - DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 */
//carga las variables de (.env)
require('dotenv').config();

// Importa el driver de MySQL con soporte nativo para promesas (async/await)
const mysql = require('mysql2/promise');


/**
 * Piscina de conexiones (Connection Pool) hacia la base de datos MySQL
 * 
 * Mantiene conexiones abiertas y listas para ser reutilizadas en cada consulta SQL,
 * evitando la sobrecarga de abrir y cerrar una conexión TCP por cada petición HTTP
 * 
 * @type {import('mysql2/promise').Pool}
 */
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