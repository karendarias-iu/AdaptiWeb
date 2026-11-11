document.addEventListener('DOMContentLoaded', () => {
  //Elementos de la pagina
  const logo = document.getElementById('logotipo');
  const panelOpciones = document.getElementById('panelOpciones');
  const camposFormularios = document.querySelectorAll('.camposFormulario')
  const panelInicio = document.getElementById('contenedorPanel');
  const formularioRegistro = document.getElementById('form-register');
  const botonRegistro = document.getElementById('botonRegistro');
  const panelError = document.getElementById('panelError');
  const mensajeError = document.getElementById('mensajeError');
  const logoAlerta = document.querySelector('.logoAlerta');
  const botonOjo = document.querySelector('.botonOjo');
  const inputPassword = document.getElementById('password');
  let temporizadorError;
  let temporizadorInformacion;

  botonRegistro?.addEventListener('click', () => {
    formularioRegistro?.classList.remove('oculto');
    panelOpciones.classList.add('oculto');
    panelInicio.style.background = '#000000';
  });

  logo?.addEventListener('click', () => {
    redirigirInicio();
  });

  //cambia el formato del campo de entrada de la variable contraseña para mostrarla u ocultarla
  botonOjo?.addEventListener('click', () => {
    const esPassword = inputPassword.type === 'password';
    inputPassword.type = esPassword ? 'text' : 'password';
  });

  //Validacion de envio de formulario
  formularioRegistro?.addEventListener('submit', async (e) => {
    e.preventDefault();

    //Obtener los valores de los campos de el formulario
    const entradas = formularioRegistro.querySelectorAll('input');
    const nombre = entradas[0].value.trim();
    const correo = entradas[1].value.trim();
    const password = entradas[2].value;

    // Validación: todos los campos completados
    if (!nombre || !correo || !password) {
      mostrarError('Debe completar todos los campos del formulario',3000);
      return;
    }

    //pone en mayuscula la primera letra
    const nombreFormateado = formatoNombre(nombre);

    // Validación: Correo valido
    //estructura valida
    const validacionCorreo = /^[^\s@]+@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|autonoma\.edu\.co)$/i;
    if (!validacionCorreo.test(correo)) {
      mostrarError('Por favor Ingrese un correo valido',3000)
      return;
    }

    // Validación: Contraseña de 8 caracteres
    if (password.length <= 8) {
      mostrarError('La contraseña debe tener minimo 8 caracteres',3000);
      return;
    }

    // Petición al Backend para guardar en base de datos
    try {
      //Peticion al server.js
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
    formularioRegistro?.classList.add('oculto');
    panelOpciones.classList.remove('oculto');
    camposFormularios.forEach(input => input.value = '');
    panelInicio.style.background = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('assets/fondo.gif') no-repeat center center / cover`;
  }

  //funcion para darle formato al nombre
  function formatoNombre(texto) {
    const textoLimpio = texto.trim().toLowerCase();
    return textoLimpio.charAt(0).toUpperCase() + textoLimpio.slice(1);
  }
});