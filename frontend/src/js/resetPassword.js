document.addEventListener('DOMContentLoaded', () => {
  /**
   * Elementos de la página
   * 
   * formularioNewPassword: formulario para cambiar la contraseña
   * panelMensaje: panel que muestra el mensaje apenas se cambie la contraseña
   * inputNewPassword: campo de contraseña
   * inputConfirmarPassword: campo para confirmar la contraseña
   * botonesOjo: botones de ojito para ver/ocultar contraseña
   * inputsPassword: campos de contraseña
   * panelError: panel flotante para mostrar errores/adevertiencias/información
   * mensajeError: mensaje que va dentro del panelError
   * botonGuardarPassword: boton del cual se actualiza o guarda la nueva contraseña
   * botonVolverInicio: boton para volver al inicio de la página (página principal)
   */
  const formularioNewPassword = document.getElementById('form-new-password');
  const panelMensaje = document.getElementById('panelMensaje');
  const inputNewPassword = document.getElementById('nuevaPassword');
  const inputConfirmarPassword = document.getElementById('confirmarPassword');
  const botonesOjo = document.querySelectorAll('.botonOjo');
  const inputsPassword = document.querySelectorAll('.password');
  const panelError = document.getElementById('panelError');
  const mensajeError = document.getElementById('mensajeError');
  const botonGuardarPassword = document.getElementById('botonGuardarPassword');
  const botonVolverInicio = document.getElementById('botonVolverInicio');
  /**
   * Variables
   * 
   * temporizadorError: tiempo en ms que maneja el tiempo en que se muestra el mensaje en el panelError
   */
  let temporizadorError;

  // Extraer el token almacenado en la URL
  const params = new URLSearchParams(window.location.search);
  //extrae el token
  const token = params.get('token');

  //Si no existe muestra el mensaje de error y bloquea el boton
  if (!token) {
    mostrarError('Enlace inválido o incompleto. Solicita uno nuevo.', 6000);
    botonGuardarPassword.disabled = true;
  }

  /**
   * Evento click en boton ojo
   * 
   * Recorre cada ojo y detecta el click para cambiar el respectivo formato de 'password' a 'text', para ver/ocultar la contraseña
   */
  botonesOjo.forEach(boton => {
    boton.addEventListener('click', () => {
      inputsPassword.forEach(input => {
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  });
  /**
   * Evento click boton volver inicio
   * 
   * Redirige el usuario a la pagina principal 
   */
  botonVolverInicio.addEventListener('click', () => {
    window.location.href = 'Inicio.html';
  });
  /**
   * Formulario contraseña nueva
   * 
   * 
   */
  formularioNewPassword.addEventListener('submit', async (e) => {
    //evita que se recargue la página
    e.preventDefault();
    //obtien los valores de ambos campos
    const nuevaPassword = inputNewPassword.value;
    const confirmarPassword = inputConfirmarPassword.value;
    //Validación: contraseña mayor o igual a 8 carácteres
    if (nuevaPassword.length < 8) {
      mostrarError('La contraseña debe tener mínimo 8 caracteres.', 3000);
      return;
    }
    //validación: coincidencia en las contraseñas
    if (nuevaPassword !== confirmarPassword) {
      mostrarError('Las contraseñas no coinciden.', 3000);
      return;
    }
    //desactiva temporalmente el boton mientras se ejecuta la petición
    botonGuardarPassword.disabled = true;
    botonGuardarPassword.textContent = 'Guardando...';

    try {
      //petición al servidor
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: nuevaPassword })
      });
      //respuesta del servidor
      const data = await response.json();
      //si llega al servidor y es correcto oculta el panel de error y el formulario, y muestra el panel con el mensaje
      if (response.ok) {
        formularioNewPassword.classList.add('oculto');
        ocultarError();
        panelMensaje.classList.remove('oculto');
      } else {
        const textoError = data.message || data.error || 'Este enlace ya fue utilizado o ha expirado. Solicita uno nuevo.';
        mostrarError(textoError, 4500);
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarError('No se pudo procesar el enlace. Es posible que ya haya sido usado o expirado.', 3000);
    } finally{
        //vuelve a habilitar el boton
        botonGuardarPassword.disabled = false;
        botonGuardarPassword.textContent = 'Guardar contraseña';
    }
  });

  /**
   * Muestra el error/advertencia en un panel flotante
   * 
   * @param {String} texto texto del mensaje de error
   * @param {number} tiempo tiempo en ms que se muestra el mensaje
   */
  function mostrarError(texto, tiempo) {
    panelError.classList.remove('oculto');
    logoAlerta.classList.remove('oculto');
    mensajeError.textContent = texto;
    clearTimeout(temporizadorError);
    temporizadorError = setTimeout(ocultarError, tiempo);
  }
  /**
   * Oculta el error/advertencia en el panel flotante
   */
  function ocultarError() {
    panelError.classList.add('oculto');
    mensajeError.textContent = '';
  }
});