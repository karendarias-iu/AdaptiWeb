/**
 * ============================================================================
 * preferencias.js - Preferencias visuales en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica que el usuario tenga una sesión activa, si no, redirige el usuario a Inicio.html
 *   2. Carga las opciones de tipografía agrupadas en el selector de fuentes
 *   3. Valida los campos numéricos (tamaño, interlineado, espaciado)
 *   4. Actualiza una vista previa de cómo se verá el texto sin guardar cambios
 *   5. Carga las preferencias actuales desde la base de datos y permite guardar
 *      las modificaciones mediante PUT /api/preferencias, aplicándolas a toda la interfaz
 *
 * Dependencias:
 *   - tema.js -> usa window.AdaptiPrefs (PREDETERMINADAS, LIMITES, GRUPOS_FUENTES, PILAS, etc.).
 *   - Backend -> endpoint PUT /api/preferencias (y GET interno desde cargarDesdeServidor).
 *
 * Datos que usa del navegador:
 *   - localStorage: token, usuario y caché de preferencias visuales.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 * @requires tema.js window.AdaptiPrefs
 */
document.addEventListener('DOMContentLoaded', async () => {
  /**
   * Elementos de la pagina
   * 
   * formulario: formulario principal que agrupa los campos de preferencias visuales
   * selectFuente: menú desplegable <select> con las tipografías disponibles agrupadas por categoría
   * selectContraste: menú desplegable <select> para elegir el tema o esquema de contraste
   * botonGuardar: botón de envío del formulario para guardar las preferencias en la base de datos
   * vistaPrevia: cuadro de texto de ejemplo donde se previsualizan los cambios en tiempo real
   * mensajeEstado: parrafo donde se muestran alertas de éxito o error al guardar
   * ultimaModificacion: parrafo informativo que indica la fecha y hora del último cambio guardado
   */
  const formulario = document.getElementById('form-preferencias');
  const selectFuente = document.getElementById('fuente');
  const selectContraste = document.getElementById('contraste');
  const botonGuardar = document.getElementById('boton-guardar');
  const vistaPrevia = document.getElementById('vista-previa');
  const mensajeEstado = document.getElementById('mensaje-estado');
  const ultimaModificacion = document.getElementById('ultima-modificacion');
  /**
   * Constantes y variables
   * 
   * token: token del usuario almacenado en el localStorage
   * PREDETERMINADAS: objeto con los valores de accesibilidad por defecto desde tema.js
   * LIMITES: objeto con los rangos mínimos, máximos y nombres legibles de cada campo numérico
   * GRUPOS_FUENTES: arreglo con las categorías y opciones de tipografías disponibles
   * camposNumericos: lista con las llaves de los campos numéricos (tamanio_fuente, interlineado, etc.)
   */
  const token = localStorage.getItem('adaptiweb_token');
  //Verifica si el usuario tiene sesion activa, si no lo devuelve al inicio
  if (!token || !localStorage.getItem('adaptiweb_usuario')) {
    window.location.href = 'Inicio.html';
    return;
  }

  const { PREDETERMINADAS, LIMITES, GRUPOS_FUENTES } = window.AdaptiPrefs;
  const camposNumericos = Object.keys(LIMITES); // tamanio_fuente, interlineado, espacio_letras, espacio_palabras

  /**
   * Inicializar el selector de fuentes
   * 
   * Recorre el arreglo de GRUPOS_FUENTES con sus grupos y las fuentes que contienen y añade las opciones en el selector
   */
  GRUPOS_FUENTES.forEach(({ grupo, fuentes }) => {
    //Grupo de fuente con su nombre
    const optgroup = document.createElement('optgroup');
    optgroup.label = grupo;
    //recorre las fuentes de cada grupo
    fuentes.forEach(([valor, etiqueta]) => {
      //añade la fuente y su nombre en las opciones
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = etiqueta;
      //muestra la fuente con su tipo de fuente
      opcion.style.fontFamily = window.AdaptiPrefs.PILAS[valor]; // cada opción se ve en su fuente
      optgroup.appendChild(opcion);
    });
    selectFuente.appendChild(optgroup);
  });

  /**
   * Función que convierte una entrada de texto en número decimal válido
   * 
   * Acepta (. y ,), rechaza letras, signos o espacios
   * @param {string} texto  Valor ingresado en el campo de entrada numérico
   * @returns {number} Número flotante válido o NaN si el formato es incorrecto
   */
  function aNumero(texto) {
    const limpio = String(texto).trim().replace(',', '.');
    return /^\d+(\.\d+)?$/.test(limpio) ? parseFloat(limpio) : NaN;
  }

  /**
   * Función que valida un campo numérico si esta fuera de los limites
   * 
   * Comprueba que no esté vacío, que sea un número válido y que esté dentro de los limites
   * @param {string} campo campo numérico a evaluar
   * @returns {string} mensaje descriptivo del error, o cadena vacía '' si es válido
   */
  function errorDeCampo(campo) {
    //diccionario de nombre, minimo y máximo con los valores de los limites
    const { nombre, min, max } = LIMITES[campo];
    //valor del campo
    const valor = document.getElementById(campo).value;
    //Valida si el campo esta vacio
    if (valor.trim() === '') return `${nombre} es obligatorio.`;
    //valor del numero
    const numero = aNumero(valor);
    //Valida que solo se ingresen números en el campo
    if (Number.isNaN(numero)) return `${nombre} debe ser un número (solo dígitos y un punto o coma decimal).`;
    if (numero < min || numero > max) return `${nombre} debe estar entre ${min} y ${max}.`;
    return '';
  }

  /**
   * Función que muestra u oculta el mensaje de validación en el campo
   * 
   * Actualiza el texto de error asociado
   * @param {string} campo ID del campo evaluado
   * @param {string} texto Texto de error a mostrar (vacío para limpiar el error)
   * @returns {void}
   */
  function mostrarError(campo, texto) {
    const input = document.getElementById(campo);
    document.getElementById(`error-${campo}`).textContent = texto;
    if (texto) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  /**
   * Función que actualiza el cuadro de vista previa en tiempo real
   * 
   * Toma los valores actuales del formulario y aplica la tipografía y el contraste dentro del recuadro
   * @returns {void}
   */
  function actualizarVistaPrevia() {
    //almacena el tipo de letra que escogio el usuario
    const valores = { fuente: selectFuente.value };
    //recorre cada campo
    for (const campo of camposNumericos) {
      const numero = aNumero(document.getElementById(campo).value);
      // si hay un valor inválido, deja la vista previa como estaba
      if (Number.isNaN(numero)) return;
      //llena la lista de valores
      valores[campo] = numero;
    }
    //aplica las tipografias y contraste en la vista previa
    window.AdaptiPrefs.aplicarTipografia(valores, vistaPrevia);
    vistaPrevia.dataset.contraste = selectContraste.value;
  }
  /**
   * validaciones en vivo
   * 
   * recorre los campos y muestra sus errores
   */
  camposNumericos.forEach(campo => {
    //campo actual
    const input = document.getElementById(campo);
    //Evento cada que se escribe en el campo
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid') && !errorDeCampo(campo)) mostrarError(campo, '');
      actualizarVistaPrevia();
    });
    // Al salir del campo, muestra si hay error
    input.addEventListener('blur', () => mostrarError(campo, errorDeCampo(campo)));
  });
  //si hay cambios, se actualiza la vista previa
  selectFuente.addEventListener('change', actualizarVistaPrevia);
  selectContraste.addEventListener('change', actualizarVistaPrevia);

  /**
   * Función que rellena los formularios con preferencias
   * 
   * Asigna fuente, valores numéricos, contraste, limpia errores previos y actualiza la vista previa
   * @param {Object} prefs Objeto con las preferencias visuales del usuario
   * @returns {void}
   */
  function llenarFormulario(prefs) {
    //preferencia de fuente
    selectFuente.value = prefs.fuente;
    //recorre los campos
    camposNumericos.forEach(campo => {
      document.getElementById(campo).value = String(prefs[campo]);
      mostrarError(campo, '');
    });
    //preferencia de contraste y actualiza la vista previa
    selectContraste.value = prefs.contraste;
    actualizarVistaPrevia();
  }

  /**
   * Función que formatea y muestra la fecha de la última actualización
   * 
   * Convierte la fecha ISO a formato legible en español o muestra mensaje inicial
   * @param {string|null|undefined} fechaIso Cadena de fecha en formato ISO
   * @returns {void}
   */
  function mostrarFecha(fechaIso) {
    //si no se han guardado aún las preferencias
    if (!fechaIso) {
      ultimaModificacion.textContent = 'Aún no has guardado preferencias.';
      return;
    }
    //fecha actual
    const fecha = new Date(fechaIso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
    //aplica y muestra la fecha
    ultimaModificacion.textContent = `Último cambio: ${fecha}`;
  }

  /**
   * Función que muestra mensajes generales de estado (éxito o error) al usuario
   * 
   * @param {string} texto Mensaje informativo a mostrar
   * @param {boolean} esError Indica si se debe aplicar el estilo visual de error
   * @returns {void}
   */
  function mostrarEstado(texto, esError) {
    mensajeEstado.textContent = texto;
    mensajeEstado.classList.toggle('error', Boolean(esError));
  }

  /**
   * Carga inicial de preferencias desde el servidor
   * 
   * Consulta las preferencias guardadas en la base de datos
   * Si falla la conexión usa los de localStorage
   */
  try {
    //petición a servidor, llena el formulario con las preferencias y muestra la fecha de actualización
    const prefs = await window.AdaptiPrefs.cargarDesdeServidor(token);
    llenarFormulario(prefs);
    mostrarFecha(prefs.fecha_actualizacion);
  } catch (error) {
    // Si no se pudo consultar, usa lo que hay en la localStorage
    llenarFormulario(window.AdaptiPrefs.leerCache() || PREDETERMINADAS);
    mostrarFecha((window.AdaptiPrefs.leerCache() || {}).fecha_actualizacion);
    mostrarEstado('No se pudieron cargar tus preferencias guardadas.', true);
  }

  /**
   * Formulario de guardado de preferencias
   * 
   * Valida todos los campos numéricos antes de enviar
   * Envía los datos mediante PUT /api/preferencias y aplica los cambios a toda la interfaz
   */
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarEstado('', false);

    // Valida todos los campos numéricos
    let primerInvalido = null;
    camposNumericos.forEach(campo => {
      const error = errorDeCampo(campo);
      mostrarError(campo, error);
      if (error && !primerInvalido) primerInvalido = campo;
    });
    //requiere todos los campos válidos
    if (primerInvalido) {
      document.getElementById(primerInvalido).focus();
      mostrarEstado('Corrige los campos marcados para poder guardar.', true);
      return;
    }
    //objeto con los valores para enviar al backend
    const cuerpo = {
      fuente: selectFuente.value,
      contraste: selectContraste.value
    };

    camposNumericos.forEach(campo => { cuerpo[campo] = aNumero(document.getElementById(campo).value); });
    //desabilita los botones
    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando...';
    //petición al servidor con el cuerpo y el token del usuario
    try {
      const respuesta = await fetch('/api/preferencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cuerpo)
      });
      //respuesta del servidor
      const datos = await respuesta.json();
      //Error 401: token expirado, redirige al inicio
      if (respuesta.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }
      //si hay error muestra el mensaje de error
      if (!respuesta.ok) {
        mostrarEstado(datos.message || 'No se pudieron guardar las preferencias.', true);
        return;
      }

      // Aplica todos los cambios de una vez (contraste de la página + tipografía) y los recuerda
      window.AdaptiPrefs.guardarCache(datos.preferencias);
      window.AdaptiPrefs.aplicar(datos.preferencias);
      llenarFormulario(datos.preferencias);
      mostrarFecha(datos.preferencias.fecha_actualizacion);
      mostrarEstado('Preferencias guardadas correctamente.', false);
    } catch (error) {
      //muestra errores
      console.error('Error al guardar preferencias:', error);
      mostrarEstado('Error de conexión con el servidor. Inténtalo de nuevo.', true);
    } finally {
      //habilita los botones
      botonGuardar.disabled = false;
      botonGuardar.textContent = 'Guardar';
    }
  });
});
