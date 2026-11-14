/**
 * Importación de librerias
 * 
 * express: es un framework que permite crear el servidor http, escuchar las peticiones y definir rutas
 * bcrypt: permite pasar las contraseñas a un hash seguro para guardarla en la base de datos
 * pool: importa la configuración del db.js, da acceso a la piscina de conexiones para realizar consultas sql en la base de datos
 * path: ayuda a construir y gestionar las rutas de los archivos del proyecto
 * jwt: ayuda a la generación del token para recuperar la contraseña
 * nodemailer: hace el envio de correo
 */
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('./db');
const path = require('path');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

//lee el archivo (.env) y carga las variables privadas de la base de datos
require('dotenv').config();

//crea el objeto donde se registra el middleware, las rutas API y las configuraciones del servidor
const app = express();
//define el puerto de red, por defecto el 3000
const PORT = process.env.PORT || 3000;
//llave secreta
const JWT_SECRET = process.env.JWT_SECRET || 'clave_secreta_adaptiweb';

//se configuran datos para enviar el correo desde una cuenta
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Tu correo Gmail
    pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación de 16 caracteres
  }
});

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


//Post recuperación de contraseña
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    //valida si la cuenta existe
    const [usuarios] = await pool.query('SELECT * FROM Usuarios WHERE correo = ?', [email]);
    if (usuarios.length === 0) {
      return res.status(404).json({ message: 'No existe una cuenta con ese correo.' });
    }

    // Genera un token que expira automáticamente en 15 minutos
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '15m' });

    // Guarda el token en la tabla Usuarios
    await pool.query('UPDATE Usuarios SET reset_token = ? WHERE correo = ?', [token, email]);

    const resetLink = `https://${req.get('host')}/reset-password.html?token=${token}`;

    await transporter.sendMail({
     from: `"AdaptiWeb" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Restablece tu contraseña de AdaptiWeb',
      // Versión en texto plano (muy valorada por filtros antispam)
      text: `Hola ${usuarios[0].nombre},\n\nRecibimos una solicitud para restablecer tu contraseña en AdaptiWeb.\nCopia y pega el siguiente enlace en tu navegador (válido por 15 minutos):\n\n${resetLink}\n\nSi no solicitaste este cambio, puedes ignorar este correo.`,
      // Versión HTML con botón limpio (sin mostrar la URL gigante)
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; color: #333;">
          <h2 style="color: #000;">Restablecer contraseña</h2>
          <p>Hola <strong>${usuarios[0].nombre}</strong>,</p>
          <p>Recibimos una solicitud para cambiar la contraseña de tu cuenta en <strong>AdaptiWeb</strong>.</p>
          <p style="margin: 25px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #000000; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            Crear nueva contraseña
          </a>
          </p>
          <p style="font-size: 13px; color: #666;">Este enlace expirará automáticamente en <strong>15 minutos</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Si no solicitaste este cambio, ignora este mensaje. Tu contraseña actual seguirá funcionando.</p>
        </div>
      `
    });

    return res.status(200).json({
      message: 'El enlace se ha enviado a tu correo electrónico',
      link: resetLink
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// POST restablecer contraseña con token
app.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Faltan datos obligatorios.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 8 caracteres.' });
  }

  try {
    // 1. Verifica firma y expiración (15m) del JWT
    const decoded = jwt.verify(token, JWT_SECRET);

    // 2. Comprueba que el token coincida con el guardado en la BD (evita doble uso)
    const [usuarios] = await pool.query(
      'SELECT id_usuario FROM Usuarios WHERE correo = ? AND reset_token = ?',
      [decoded.email, token]
    );

    if (usuarios.length === 0) {
      return res.status(400).json({ message: 'Este enlace ya fue utilizado o no es válido.' });
    }

    // 3. Encripta la nueva contraseña y limpia el token
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE Usuarios SET contraseña = ?, reset_token = NULL WHERE correo = ?',
      [passwordHash, decoded.email]
    );

    return res.status(200).json({ message: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'El enlace ha expirado (15 minutos). Solicita uno nuevo.' });
    }
    console.error('Error en reset-password:', error);
    return res.status(400).json({ message: 'Enlace inválido o alterado.' });
  }
});

// POST iniciar sesión
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Por favor ingresa correo y contraseña.' });
  }

  try {
    const [usuarios] = await pool.query(
      'SELECT id_usuario, nombre, correo, contraseña FROM Usuarios WHERE correo = ?',
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }

    const usuario = usuarios[0];
    const passwordValida = await bcrypt.compare(password, usuario.contraseña);

    if (!passwordValida) {
      return res.status(401).json({ message: 'Correo o contraseña incorrectos.' });
    }

    // Genera el JWT de sesión
    const token = jwt.sign(
      { id: usuario.id_usuario, email: usuario.correo, nombre: usuario.nombre },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        correo: usuario.correo
      }
    });
  } catch (error) {
    console.error('Error en /api/login:', error);
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

//inicializa el servidor, esta atenta de las peticiones en el puerto definido
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));

module.exports = app;