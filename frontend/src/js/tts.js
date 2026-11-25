/**
 * ============================================================================
 * tts.js - Lector por voz (Text-to-Speech) en el visor de AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Controla la apertura y cierre del panel flotante del lector por voz.
 *   2. Extrae el texto mostrado en el visor (`#cuadro-lectura`) y lo envía al
 *      backend (`POST /api/tts`) junto con la voz seleccionada (femenina o masculina).
 *   3. Recibe el flujo de audio (Blob MP3 generado por ElevenLabs) y lo reproduce
 *      mediante el objeto nativo `Audio` del navegador.
 *   4. Implementa un caché en memoria (`cacheKey` + `blobCache`) para reproducir
 *      al instante sin gastar peticiones extra si se repite el mismo texto y voz.
 *   5. Gestiona los estados de los controles (detenido, cargando, leyendo, pausado),
 *      libera la memoria de las URLs temporales (`URL.revokeObjectURL`) y detiene
 *      la lectura automáticamente si el usuario cambia de voz o abandona la página.
 *
 * Dependencias:
 *   - Backend -> endpoint POST /api/tts (conecta con la API de ElevenLabs).
 *
 * Datos que usa del navegador:
 *   - localStorage: lee 'adaptiweb_token' para autenticar la petición de audio.
 *   - Web Audio / HTMLAudioElement & URL.createObjectURL: reproducción y manejo en memoria del MP3.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 * @author Elkin Alzate Londoño
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Elementos de la página
   * 
   * lector: contenedor del panel desplegable de controles de lectura por voz
   * btnAbrir: botón principal ("Lector por voz") que despliega o contrae el panel
   * btnReproducir: botón que inicia la síntesis y reproducción del texto en voz alta
   * btnPausar: botón que alterna entre pausar y reanudar el audio en curso
   * btnDetener: botón que detiene por completo la lectura y reinicia el audio
   * selectVoz: menú desplegable (<select>) para elegir entre voz femenina o masculina
   * mensaje: elemento de texto donde se muestran estados como "Generando voz..." o errores
   * cuadroLectura: contenedor del visor de donde se extrae el texto que será leído
   */
  const lector = document.getElementById('lector');
  const btnAbrir = document.getElementById('lector-toggle');
  const btnReproducir = document.getElementById('tts-reproducir');
  const btnPausar = document.getElementById('tts-pausar');
  const btnDetener = document.getElementById('tts-detener');
  const selectVoz = document.getElementById('tts-voz');
  const mensaje = document.getElementById('tts-estado');
  const cuadroLectura = document.getElementById('cuadro-lectura');
  // Si falta algún elemento esencial del reproductor en el DOM, detiene la inicialización
  if (!lector || !btnAbrir || !btnReproducir || !btnPausar || !btnDetener || !cuadroLectura) return;
  /**
   * Constantes y variables
   * 
   * estado: estado actual del reproductor ('detenido' | 'cargando' | 'leyendo' | 'pausado')
   * audioActual: instancia activa de HTMLAudioElement que reproduce el MP3 (o null)
   * urlAudioActual: URL temporal en memoria (ObjectURL) asociada al Blob de audio activo
   * cacheKey: llave compuesta `"voz::texto"` para identificar si el audio ya fue generado
   * blobCache: archivo Blob de audio MP3 guardado en memoria para reutilización inmediata
   */
  let estado = 'detenido';
  let audioActual = null;
  let urlAudioActual = null;
  let cacheKey = '';
  let blobCache = null;

  /**
   * Función que muestra mensajes informativos o de error del lector en pantalla
   * 
   * @param {string} texto - Mensaje a mostrar (cadena vacía para limpiar)
   * @returns {void}
   */
  function mostrarMensaje(texto) {
    if (mensaje) mensaje.textContent = texto || '';
  }

  /**
   * Función que actualiza el estado lógico del lector y habilita/deshabilita los botones
   * 
   * Sincroniza la disponibilidad de cada control y el texto del botón Pausar/Reanudar
   * según la fase del reproductor
   * @param {'detenido'|'cargando'|'leyendo'|'pausado'} nuevo - Nuevo estado a aplicar
   * @returns {void}
   */
  function cambiarEstado(nuevo) {
    estado = nuevo;
    btnReproducir.disabled = nuevo !== 'detenido';
    btnPausar.disabled = nuevo === 'detenido' || nuevo === 'cargando';
    btnDetener.disabled = nuevo === 'detenido';
    if (selectVoz) selectVoz.disabled = nuevo === 'cargando';
    btnPausar.textContent = nuevo === 'pausado' ? 'Reanudar' : 'Pausar';
  }

  /**
   * Evento click en botón abrir/cerrar panel del lector
   * 
   * Alterna la clase CSS 'abierto' y actualiza el atributo de accesibilidad aria-expanded
   */
  btnAbrir.addEventListener('click', () => {
    const abierto = lector.classList.toggle('abierto');
    btnAbrir.setAttribute('aria-expanded', String(abierto));
  });

  /**
   * Función que detiene el audio activo y libera los recursos en memoria
   * 
   * Pausa la reproducción, reinicia el tiempo a 0 y revoca la ObjectURL del navegador
   * para evitar fugas de memoria
   * @returns {void}
   */
  function limpiarAudio() {
    if (audioActual) {
      audioActual.pause();
      audioActual.currentTime = 0;
      audioActual = null;
    }
    if (urlAudioActual) {
      URL.revokeObjectURL(urlAudioActual);
      urlAudioActual = null;
    }
  }

  /**
   * Función que crea un reproductor Audio a partir de un Blob MP3 e inicia su lectura
   * 
   * Configura los eventos de finalización (`onended`) y error (`onerror`) para restaurar
   * los controles y devolver el foco por accesibilidad
   * @param {Blob} blob - Archivo de audio en formato audio/mpeg
   * @returns {void}
   */
  function iniciarReproduccionBlob(blob) {
    limpiarAudio();
    urlAudioActual = URL.createObjectURL(blob);
    audioActual = new Audio(urlAudioActual);

    audioActual.onended = () => {
      limpiarAudio();
      cambiarEstado('detenido');
      btnReproducir.focus();
    };

    audioActual.onerror = () => {
      limpiarAudio();
      mostrarMensaje('Error al reproducir el audio.');
      cambiarEstado('detenido');
    };

    audioActual.play();
    cambiarEstado('leyendo');
    btnPausar.focus();
  }

  /**
   * Función asíncrona que obtiene y reproduce el audio del texto del visor
   * 
   * Valida que exista texto, verifica si el audio ya está en caché local (mismo texto y voz)
   * y, de no estarlo, solicita la generación al backend mediante POST /api/tts
   * @async
   * @returns {Promise<void>}
   */
  async function reproducir() {
    const texto = (cuadroLectura.textContent || '').trim();
    if (!texto) {
      mostrarMensaje('No hay texto para leer.');
      return;
    }

    const vozElegida = selectVoz ? selectVoz.value : 'femenina';
    const llaveActual = `${vozElegida}::${texto}`;

    // Reutiliza el audio si es el mismo texto y la misma voz
    if (llaveActual === cacheKey && blobCache) {
      mostrarMensaje('');
      iniciarReproduccionBlob(blobCache);
      return;
    }

    mostrarMensaje('Generando voz...');
    cambiarEstado('cargando');

    try {
      const token = localStorage.getItem('adaptiweb_token');
      const respuesta = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ texto, voz: vozElegida })
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo obtener el audio de ElevenLabs');
      }

      const blob = await respuesta.blob();
      cacheKey = llaveActual;
      blobCache = blob;

      mostrarMensaje('');
      iniciarReproduccionBlob(blob);
    } catch (error) {
      console.error('Error TTS ElevenLabs:', error);
      mostrarMensaje('No se pudo cargar la voz.');
      cambiarEstado('detenido');
    }
  }

  // Si cambia la voz mientras está leyendo o pausado, detiene la actual para aplicar la nueva
  selectVoz?.addEventListener('change', () => {
    if (estado !== 'detenido') {
      detener();
    }
  });

  /**
   * Función que alterna entre pausar y reanudar el audio en curso
   * 
   * @returns {void}
   */
  function pausarOReanudar() {
    if (!audioActual) return;

    if (estado === 'leyendo') {
      audioActual.pause();
      cambiarEstado('pausado');
    } else if (estado === 'pausado') {
      audioActual.play();
      cambiarEstado('leyendo');
    }
  }

  /**
   * Función que detiene la lectura actual, limpia mensajes y restaura el estado inicial
   * 
   * @returns {void}
   */
  function detener() {
    limpiarAudio();
    mostrarMensaje('');
    cambiarEstado('detenido');
    btnReproducir.focus();
  }

  // Asignación de eventos a los botones de control y limpieza al salir de la página
  btnReproducir.addEventListener('click', reproducir);
  btnPausar.addEventListener('click', pausarOReanudar);
  btnDetener.addEventListener('click', detener);
  window.addEventListener('pagehide', limpiarAudio);

  //Estado inicial
  cambiarEstado('detenido');
});