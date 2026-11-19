/**
 * Lógica de la pantalla preferencias.html
 * Depende de tema.js (window.AdaptiPrefs), que se carga en el <head>.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('adaptiweb_token');
  if (!token || !localStorage.getItem('adaptiweb_usuario')) {
    window.location.href = 'Inicio.html';
    return;
  }

  const { PREDETERMINADAS, LIMITES, GRUPOS_FUENTES } = window.AdaptiPrefs;

  const formulario = document.getElementById('form-preferencias');
  const selectFuente = document.getElementById('fuente');
  const selectContraste = document.getElementById('contraste');
  const botonGuardar = document.getElementById('boton-guardar');
  const vistaPrevia = document.getElementById('vista-previa');
  const mensajeEstado = document.getElementById('mensaje-estado');
  const ultimaModificacion = document.getElementById('ultima-modificacion');
  const camposNumericos = Object.keys(LIMITES); // tamanio_fuente, interlineado, espacio_letras, espacio_palabras

  // ---------- 1. Llenar el menú desplegable de fuentes (agrupado) ----------
  GRUPOS_FUENTES.forEach(({ grupo, fuentes }) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = grupo;
    fuentes.forEach(([valor, etiqueta]) => {
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = etiqueta;
      opcion.style.fontFamily = window.AdaptiPrefs.PILAS[valor]; // cada opción se ve en su fuente
      optgroup.appendChild(opcion);
    });
    selectFuente.appendChild(optgroup);
  });

  // ---------- 2. Validación de los campos numéricos ----------
  // Acepta "1.5" o "1,5". Solo dígitos y un separador decimal; sin letras, signos ni espacios.
  function aNumero(texto) {
    const limpio = String(texto).trim().replace(',', '.');
    return /^\d+(\.\d+)?$/.test(limpio) ? parseFloat(limpio) : NaN;
  }

  // Devuelve el texto del error, o '' si el campo es válido
  function errorDeCampo(campo) {
    const { nombre, min, max } = LIMITES[campo];
    const valor = document.getElementById(campo).value;
    if (valor.trim() === '') return `${nombre} es obligatorio.`;
    const numero = aNumero(valor);
    if (Number.isNaN(numero)) return `${nombre} debe ser un número (solo dígitos y un punto o coma decimal).`;
    if (numero < min || numero > max) return `${nombre} debe estar entre ${min} y ${max}.`;
    return '';
  }

  function mostrarError(campo, texto) {
    const input = document.getElementById(campo);
    document.getElementById(`error-${campo}`).textContent = texto;
    if (texto) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  // ---------- 3. Vista previa (no guarda nada, solo muestra cómo quedaría) ----------
  function actualizarVistaPrevia() {
    const valores = { fuente: selectFuente.value };
    for (const campo of camposNumericos) {
      const numero = aNumero(document.getElementById(campo).value);
      if (Number.isNaN(numero)) return; // si hay un valor inválido, deja la vista previa como estaba
      valores[campo] = numero;
    }
    window.AdaptiPrefs.aplicarTipografia(valores, vistaPrevia);
    vistaPrevia.dataset.contraste = selectContraste.value;
  }

  camposNumericos.forEach(campo => {
    const input = document.getElementById(campo);
    // Mientras escribe, quita el error en cuanto el valor se vuelve válido
    input.addEventListener('input', () => {
      if (input.hasAttribute('aria-invalid') && !errorDeCampo(campo)) mostrarError(campo, '');
      actualizarVistaPrevia();
    });
    // Al salir del campo, muestra el error si lo hay
    input.addEventListener('blur', () => mostrarError(campo, errorDeCampo(campo)));
  });
  selectFuente.addEventListener('change', actualizarVistaPrevia);
  selectContraste.addEventListener('change', actualizarVistaPrevia);

  // ---------- 4. Mostrar datos en pantalla ----------
  function llenarFormulario(prefs) {
    selectFuente.value = prefs.fuente;
    camposNumericos.forEach(campo => {
      document.getElementById(campo).value = String(prefs[campo]);
      mostrarError(campo, '');
    });
    selectContraste.value = prefs.contraste;
    actualizarVistaPrevia();
  }

  function mostrarFecha(fechaIso) {
    if (!fechaIso) {
      ultimaModificacion.textContent = 'Aún no has guardado preferencias.';
      return;
    }
    const fecha = new Date(fechaIso).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
    ultimaModificacion.textContent = `Último cambio: ${fecha}`;
  }

  function mostrarEstado(texto, esError) {
    mensajeEstado.textContent = texto;
    mensajeEstado.classList.toggle('error', Boolean(esError));
  }

  // ---------- 5. Cargar las preferencias guardadas ----------
  try {
    const prefs = await window.AdaptiPrefs.cargarDesdeServidor(token);
    llenarFormulario(prefs);
    mostrarFecha(prefs.fecha_actualizacion);
  } catch (error) {
    // Si no se pudo consultar, usa lo que haya en caché o los valores por defecto
    llenarFormulario(window.AdaptiPrefs.leerCache() || PREDETERMINADAS);
    mostrarFecha((window.AdaptiPrefs.leerCache() || {}).fecha_actualizacion);
    mostrarEstado('No se pudieron cargar tus preferencias guardadas.', true);
  }

  // ---------- 6. Guardar ----------
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    mostrarEstado('', false);

    // Valida todos los campos numéricos; si alguno falla, NO se guarda nada
    let primerInvalido = null;
    camposNumericos.forEach(campo => {
      const error = errorDeCampo(campo);
      mostrarError(campo, error);
      if (error && !primerInvalido) primerInvalido = campo;
    });
    if (primerInvalido) {
      document.getElementById(primerInvalido).focus();
      mostrarEstado('Corrige los campos marcados para poder guardar.', true);
      return;
    }

    const cuerpo = {
      fuente: selectFuente.value,
      contraste: selectContraste.value
    };
    camposNumericos.forEach(campo => { cuerpo[campo] = aNumero(document.getElementById(campo).value); });

    botonGuardar.disabled = true;
    botonGuardar.textContent = 'Guardando...';

    try {
      const respuesta = await fetch('/api/preferencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(cuerpo)
      });
      const datos = await respuesta.json();

      if (respuesta.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }
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
      console.error('Error al guardar preferencias:', error);
      mostrarEstado('Error de conexión con el servidor. Inténtalo de nuevo.', true);
    } finally {
      botonGuardar.disabled = false;
      botonGuardar.textContent = 'Guardar';
    }
  });
});
