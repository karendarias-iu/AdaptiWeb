document.addEventListener('DOMContentLoaded', () => {
  /* Elementos de la pagina
   * 
   * panelInicio: es el panel principal que contiene panelOpciones y los formularios de registro, inicio de sesio y recuperacion de contraseña
   * panelOpciones: contenedor que tiene el lema y botones de 'Iniciar sesion' y 'Registrarse'
   * panelError: panel tipo ventana flotante para mostrar advertencias, mensajes o errores al usuario al momento de registrarse o iniciar sesion
   * panelFormularioRecuperacion: panel que tiene el formulario de recuperacion
   * camposFormularios: entradas de los formularios
   * logo: imagen del logotipo de la pagina, es usado para registrar un evento click que hace que devuelva al usuario al inicio desde cualquier parte
   * formularioRegistro: formulario de registro de usuario
   * formularioInicioSesion: formulario de inicio de sesion del usuario
   * formularioRecuperacion: formulario recuperacion de contraseña del usuario
   * botonRegistro: Boton de envio del formulario de registro
   * botonInicioSesion: Boton de envio del formulario de inicio de sesion
   * botonSalirRecuperacion: Boton para volver al panel principal desde la recuperacion de contraseña
   * botonesOjo: Botones con icono de ojito para ver/ocultar la contraseña
   * mensajeEnvioRecuperacion: panel con el mensaje que se muestra una vez envia el formulario para recuperar la contraseña
   * mensajeError: mensaje que se muestra en el panel de error flotante
   * logoAlerta: logo de simbolo de advertencia que puede mostrarse o no segun el mensaje en el panel flotante
   * inputPassword: entradas de formulario con campos de contraseña
   * linkRecuperarPassword: elemento tipo enlace que cambia al formulario de recuperar contraseña
   */
  const panelInicio = document.getElementById('contenedorPanel');
  const panelOpciones = document.getElementById('panelOpciones');
  const panelError = document.getElementById('panelError');
  const panelFormularioRecuperacion = document.querySelector('.formularioRecuperacion');
  const camposFormularios = document.querySelectorAll('.camposFormulario')
  const logo = document.getElementById('logotipo');
  const formularioRegistro = document.getElementById('form-register');
  const formularioInicioSesion = document.getElementById('form-login');
  const formularioRecuperacion = document.getElementById('form-reset');
  const botonRegistro = document.getElementById('botonRegistro');
  const botonInicioSesion = document.getElementById('botonInicioSesion');
  const botonSalirRecuperacion = document.getElementById('botonSalirRecuperacion');
  const botonesOjo = document.querySelectorAll('.botonOjo');
  const mensajeEnvioRecuperacion = document.querySelector('.mensajeEnvioRecuperacion');
  const mensajeError = document.getElementById('mensajeError');
  const logoAlerta = document.querySelector('.logoAlerta');
  const inputPassword = document.querySelectorAll('.password');
  const linkRecuperarPassword = document.querySelector('.linkRecuperar');

  /**
   * variables
   * 
   * temporizadorError: guarda el tiempo transcurrido para manejar el tiempo con que se muestra un mensaje de error en el panel flotante
   * temporizadorInformacion: guarda el tiempo transcurrido para manejar el tiempo con que se muestra un mensaje informativo en el panel flotante
   */
  let temporizadorError;
  let temporizadorInformacion;

  /**
   * Evento click boton registro 'Registrarse'
   * 
   * muestra el formulario de registro con fondo negro y oculta los demas elementos
   */
  botonRegistro.addEventListener('click', () => {
    formularioRegistro.classList.remove('oculto');
    formularioInicioSesion.classList.add('oculto');
    panelOpciones.classList.add('oculto');
    panelInicio.style.background = '#000000';
  });

  /**
   * Evento click boton Inicio de sesion 'Iniciar Sesion'
   * 
   * muestra el formulario de inicio de sesion con fondo negro y oculta los demas elementos
   */
  botonInicioSesion.addEventListener('click', () => {
    formularioInicioSesion.classList.remove('oculto');
    formularioRegistro.classList.add('oculto');
    panelOpciones.classList.add('oculto');
    panelInicio.style.background = '#000000';
  });

  /**
   * Evento click boton salir de recuperacion
   * 
   * llama a la funcion redirigirInicio(), para devolver al usuario a el panel principal
   */
  botonSalirRecuperacion.addEventListener('click', () => {
    redirigirInicio();
  });

  /**
   * Evento click enlace recuperar contraseña
   * 
   * muestra el formulario de recuperar la contraseña con fondo negro y oculta los demas elementos
   */
  linkRecuperarPassword.addEventListener('click', () => {
    formularioRecuperacion.classList.remove('oculto');
    panelFormularioRecuperacion.classList.remove('oculto');
    mensajeEnvioRecuperacion.classList.add('oculto');
    formularioInicioSesion.classList.add('oculto');
  });

  /**
   * Evento click en la imagen del logo
   * 
   * llama a la funcion redirigirInicio(), para devolver al usuario a el panel principal
   */
  logo.addEventListener('click', () => {
    redirigirInicio();
  });

  /**
   * Evento click para cada ojito de ver/ocultar contraseña
   * 
   * cambia el campo de entrada de password a texto en la entrada de contraseña correspondiente al ojito
   */
  botonesOjo.forEach(boton => {
    //Evento boton ojito
    boton.addEventListener('click', () => {
      //Recorre los campos de contraseña y cambia de tipo password a texto
      inputPassword.forEach(input => {
        const esPassword = input.type === 'password';
        input.type = esPassword ? 'text' : 'password';
      });
    });
  });

  /**
   * Formulario de registro
   * 
   * se realizan validaciones (campos completos, correo valido, contraseña mayor o igual a 8 caracteres)
   * se hace envio de los datos al servidor
   * se muestran mensajes de advertencia, error o información en el panel flotante
   */
  formularioRegistro.addEventListener('submit', async (e) => {
    //evita que se recargue la pagina
    e.preventDefault();

    //Se obtienen los valores de los campos de el formulario, se guarda en una lista (entradas)
    const entradas = formularioRegistro.querySelectorAll('input');
    //valores separados
    const nombre = entradas[0].value.trim();
    const correo = entradas[1].value.trim();
    const password = entradas[2].value;

    // Validación: todos los campos completados
    if (!nombre || !correo || !password) {
      mostrarError('Debe completar todos los campos del formulario',3000);
      return;
    }

    //nombre formateado con la primera letra mayuscula
    const nombreFormateado = formatoNombre(nombre);

    // Validación: Correo valido
    //validación
    const validacionCorreo = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|autonoma\.edu\.co)$/i;
    if (!validacionCorreo.test(correo)) {
      mostrarError('Por favor Ingrese un correo valido',3000)
      return;
    }

    // Validación: Contraseña de 8 o más caracteres
    if (password.length <= 8) {
      mostrarError('La contraseña debe tener minimo 8 caracteres',3000);
      return;
    }

    // Petición al Backend para guardar en base de datos
    try {
      //Peticion al server.js (conexion)
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombreFormateado, email: correo, password })
      });
      
      //respuesta del servidor
      const data = await response.json();
      
      //se valida si fue aceptado
      if (response.ok) {
        //limpia los campos y muestra informacion
        formularioRegistro.reset();
        mostrarInformacion('Usuario Registrado con éxito',1500);
      } else {
        //muestra el error al crear la cuenta
        mostrarError(data.message || 'Error al crear la cuenta',3000);
      }
    } catch (error) {
      //muestra el error de conexión
      console.error('Error de conexión:', error);
      mostrarError('Ocurrio un error al conectar con el servidor',3000);
    }
  });

  /**
  * Formulario de recuperación
  * 
  * se realiza la validacion de correo valido  
  * se hace envio de los datos al servidor
  * se muestran mensajes de advertencia, error o información en el panel flotante
  */
  formularioRecuperacion.addEventListener('submit', async (e) => {
    //evita que se recargue la pagina
    e.preventDefault();

    //obtiene el correo electronico ingresado
    const campoCorreo = formularioRecuperacion.querySelector('input[type="email"]');
    const correo = campoCorreo.value.trim();

    //si no ha puesto correo se le inidica que lo ingrese
    //validación de correo valido
    const validacionCorreo = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|autonoma\.edu\.co)$/i;
    if (!validacionCorreo.test(correo) || !correo) {
      mostrarError('Por favor Ingrese un correo valido',3000)
      return;
    }

    try {
      //se hace la petición al servidor con el email
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo })
      });

      //respuesta del servidor
      const data = await response.json();

      //si todo fue recibido y es valido
      if (response.ok) {
        //limpia los campos del formulario
        formularioRecuperacion.reset();
        //oculta el panel de formulario y muestra un mensaje
        panelFormularioRecuperacion.classList.add('oculto');
        mensajeEnvioRecuperacion.classList.remove('oculto');
        //muestra el link en consola para pruebas
        if (data.link) console.log('Link de prueba:', data.link);
      } else {
        mostrarError(data.message || 'No se pudo procesar la solicitud', 3000);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarError('Ocurrió un error al conectar con el servidor', 3000);
    }
  });

  /**
   * Formulario de inicio de sesion
   * 
   * se realizan validaciones (campos completos, correo valido, contraseña mayor o igual a 8 caracteres)
   * se hace envio de los datos al servidor
   * se muestran mensajes de advertencia, error o información en el panel flotante
   */
  formularioInicioSesion.addEventListener('submit', async (e) => {
    //evita que se recargue la pagina
    e.preventDefault();
    //obtiene los valores del formulario
    const entradas = formularioInicioSesion.querySelectorAll('input');
    //separa los datos
    const correo = entradas[0].value.trim();
    const password = entradas[1].value;
    //validacion: campos completos
    if (!correo || !password) {
      mostrarError('Debe completar correo y contraseña', 3000);
      return;
    }
    //validación: correo valido
    const validacionCorreo = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|autonoma\.edu\.co)$/i;
    if (!validacionCorreo.test(correo)) {
      mostrarError('Por favor Ingrese un correo valido',3000)
      return;
    }
    //se bloquea el boton mientras se hace la conexión con el servidor
    const botonIngresar = formularioInicioSesion.querySelector('button[type="submit"]');
    botonIngresar.disabled = true;
    botonIngresar.textContent = 'Ingresando...';

    try {
      //peticion hacia el servidor, envia los datos
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: correo, password })
      });
      //respuesta del servidor
      const data = await response.json();
      //si se conecta con el servidor y los datos son correctos
      if (response.ok) {
        //Guarda el token y los datos básicos del usuario en localStorage
        localStorage.setItem('adaptiweb_token', data.token);
        localStorage.setItem('adaptiweb_usuario', JSON.stringify(data.usuario));
        //Redirige el usuario al panel principal
        window.location.href = 'dashboard.html';
      } else {
        mostrarError(data.message || 'Credenciales incorrectas', 3000);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      mostrarError('Ocurrió un error al conectar con el servidor', 3000);
    } finally {
      //vuelve a activar el boton
      botonIngresar.disabled = false;
      botonIngresar.textContent = 'Ingresar';
    }
  });

  /**
   * Funcion que muestra el error
   * 
   * Pone visibles el panel y el logo de la alerta, adicional de poner el texto del error
   * limpia la variable temporizador y establece una funcion en 3 segundos (3000ms)
   * @param {String} texto texto de error a mostrar
   * @param {number} tiempo tiempo en ms en que se llama la siguiente función
   */
  function mostrarError(textoError,tiempo){
    panelError.classList.remove('oculto');
    logoAlerta.classList.remove('oculto');
    mensajeError.textContent= textoError;
    clearTimeout(temporizadorError);
    temporizadorError = setTimeout(ocultarError,tiempo);
  }

  /**
   * Funcion que oculta el panel de advertencia y quita el mensaje
   */
  function ocultarError(){
    panelError.classList.add('oculto');
    mensajeError.textContent = '';
  }

  /**
   * Funcion que muestra información
   * 
   * Pone visibles el panel y el oculta el logo de alerta, adicional de poner el texto del error
   * limpia la variable temporizador y establece una funcion en 3 segundos (3000ms)
   * Redirige al inicio
   * @param {String} texto texto con la información
   * @param {number} tiempo tiempo en ms
   */
  function mostrarInformacion(texto,tiempo){
    panelError.classList.remove('oculto');
    logoAlerta.classList.add('oculto');
    mensajeError.textContent= texto;
    clearTimeout(temporizadorInformacion);
    temporizadorInformacion = setTimeout(ocultarError,tiempo);
    redirigirInicio();
  }

  /**
   * Funcion volver a inicio
   * 
   * oculta el panel de registro o inicio, muestra el panel de opciones y cambia el fondo
   * limpia las entradas de los campos
   */
  function redirigirInicio(){
    formularioRegistro.classList.add('oculto');
    formularioInicioSesion.classList.add('oculto');
    formularioRecuperacion.classList.add('oculto');
    panelOpciones.classList.remove('oculto');
    formularioRecuperacion.classList.add('oculto');
    mensajeEnvioRecuperacion.classList.add('oculto');
    camposFormularios.forEach(input => input.value = '');
    panelInicio.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('assets/fondo.gif') no-repeat center center / cover`;
  }

  //funcion para darle formato al nombre
  function formatoNombre(texto) {
    const textoLimpio = texto.trim().toLowerCase();
    return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
  }
});