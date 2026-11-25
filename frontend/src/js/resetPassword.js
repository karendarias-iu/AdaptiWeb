/**
 * ============================================================================
 * resetPassword.js - Restablecimiento de contraseña en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Extrae y valida el token de recuperación desde los parámetros de la URL (?token=...).
 *   2. Bloquea el formulario si el enlace está incompleto o no contiene un token válido.
 *   3. Permite alternar la visibilidad de los campos de contraseña (mostrar/ocultar).
 *   4. Valida que la nueva contraseña tenga mínimo 8 caracteres y coincida con su confirmación.
 *   5. Envía la solicitud de actualización al backend mediante POST /api/reset-password.
 *   6. Muestra notificaciones flotantes de error o el panel de confirmación final con
 *      acceso directo para volver a Inicio.html.
 *
 * Dependencias:
 *   - Backend -> endpoint POST /api/reset-password.
 *
 * Datos que usa del navegador:
 *   - URLSearchParams (window.location.search): lee el parámetro 'token' del enlace de correo.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 */
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
   * Constantes y variables
   * 
   * temporizadorError: referencia al setTimeout que controla la duración del panel flotante de error
   * params: objeto URLSearchParams con los parámetros de consulta de la URL actual
   * token: token JWT de recuperación extraído del parámetro 'token' de la URL
   */
  let temporizadorError;
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  // Verifica que exista un token en la URL
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