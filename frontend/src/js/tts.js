document.addEventListener('DOMContentLoaded', () => {
  const lector = document.getElementById('lector');
  const btnAbrir = document.getElementById('lector-toggle');
  const btnReproducir = document.getElementById('tts-reproducir');
  const btnPausar = document.getElementById('tts-pausar');
  const btnDetener = document.getElementById('tts-detener');
  const selectVoz = document.getElementById('tts-voz');
  const mensaje = document.getElementById('tts-estado');
  const cuadroLectura = document.getElementById('cuadro-lectura');

  if (!lector || !btnAbrir || !btnReproducir || !btnPausar || !btnDetener || !cuadroLectura) return;

  let estado = 'detenido';
  let audioActual = null;
  let urlAudioActual = null;
  let cacheKey = '';
  let blobCache = null;

  function mostrarMensaje(texto) {
    if (mensaje) mensaje.textContent = texto || '';
  }

  function cambiarEstado(nuevo) {
    estado = nuevo;
    btnReproducir.disabled = nuevo !== 'detenido';
    btnPausar.disabled = nuevo === 'detenido' || nuevo === 'cargando';
    btnDetener.disabled = nuevo === 'detenido';
    if (selectVoz) selectVoz.disabled = nuevo === 'cargando';
    btnPausar.textContent = nuevo === 'pausado' ? 'Reanudar' : 'Pausar';
  }

  btnAbrir.addEventListener('click', () => {
    const abierto = lector.classList.toggle('abierto');
    btnAbrir.setAttribute('aria-expanded', String(abierto));
  });

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

  function detener() {
    limpiarAudio();
    mostrarMensaje('');
    cambiarEstado('detenido');
    btnReproducir.focus();
  }

  btnReproducir.addEventListener('click', reproducir);
  btnPausar.addEventListener('click', pausarOReanudar);
  btnDetener.addEventListener('click', detener);
  window.addEventListener('pagehide', limpiarAudio);

  cambiarEstado('detenido');
});