/**
 * Importación de librerias
 * 
 * express: es un framework que permite crear el servidor http, escuchar las peticiones y definir rutas
 * bcrypt: permite pasar las contraseñas a un hash seguro para guardarla en la base de datos
 * pool: importa la configuración del db.js, da acceso a la piscina de conexiones para realizar consultas sql en la base de datos
 * path: ayuda a construir y gestionar las rutas de los archivos del proyecto
 */
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('./db');
const path = require('path');

//lee el archivo (.env) y carga las variables privadas de la base de datos
require('dotenv').config();

//crea el objeto donde se registra el middleware, las rutas API y las configuraciones del servidor
const app = express();
//define el puerto de red, por defecto el 3000
const PORT = process.env.PORT || 3000;

//activa el parser json (interpreta los datos enviados, pasandolos a un objeto javaScript accesible)
app.use(express.json());

//declara la carpeta frontend/public como estatica, para acceder a archivos y assets desde ahi
app.use(express.static(path.join(__dirname, '../frontend/public')));

//pone en servicio la carpeta src para acceder a la hoja de estilos (css) y a lo correspondiente de js
app.use('/src', express.static(path.join(__dirname, '../frontend/src')));

//Registro de usuarios
//define la ruta de tipo POST, esta recibe los datos del formulario
app.post('/api/register', async (req, res) => {
  //desestructura los valores contenidos en el formulario
  const { nombre, email, password } = req.body;

  try {
    //se verifica si el correo ya existe en la base de datos
    //se hace un arreglo de nombre usuarios en donde se almacena el o los usuarios que tengan el mismo correo (email)
    const [usuarios] = await pool.query('SELECT id_usuario FROM Usuarios WHERE correo = ?', [email]);
    //si hay almenos un valor en el arreglo es porque el correo ya ha sido registrado
    if (usuarios.length > 0) {
      //se envia una respuesta de tipo 400 (bad request) que corresponde a un error de entrada por el usuario
      //adicional pasa el objeto javaScript a json con el mensaje correspondiente
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    //Encriptar la contraseña con bcrypt, alpilca el algoritmo con una alteracion de 10 rondas
    const passwordHash = await bcrypt.hash(password, 10);

    //Insertar el usuario en la tabla usuario en MySQL
    const [resultado] = await pool.query(
      'INSERT INTO Usuarios (nombre, correo, contraseña, condicion) VALUES (?, ?, ?, ?)',
      [nombre, email, passwordHash, 'Ninguna']
    );

    //Muestra el mensaje de que el usuario fue registrado con exito
    return res.status(201).json({ message: 'Usuario registrado exitosamente.' });

  } catch (error) {
    //en caso de error lo muestra
    console.error('Error en el registro:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

//inicializa el servidor, esta atenta de las peticiones en el puerto definido
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));