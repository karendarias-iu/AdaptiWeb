document.addEventListener('DOMContentLoaded', () => {
  // 1. Verificar sesión activa
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');

  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  const TIEMPO_TRABAJO = 25 * 60; // 25 minutos en segundos
  const TIEMPO_DESCANSO = 5 * 60; // 5 minutos en segundos

  const displayTiempo = document.getElementById('tiempo-display');
  const estadoCiclo = document.getElementById('estado-ciclo');
  const cuadroTemporizador = document.getElementById('cuadro-temporizador');
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnPausar = document.getElementById('btn-pausar');
  const btnReiniciar = document.getElementById('btn-reiniciar');

  let segundosRestantes = 0;
  let intervaloId = null;
  let pausado = false;
  let modo = 'inactivo'; // 'inactivo' | 'trabajo' | 'descanso'
  let audioCtx = null;

  function formatearTiempo(totalSegundos) {
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }

  function actualizarVista() {
    if (displayTiempo) {
      displayTiempo.textContent = formatearTiempo(segundosRestantes);
    }
  }

  function actualizarTextoEstado() {
    if (!estadoCiclo) return;
    if (modo === 'trabajo') {
      estadoCiclo.textContent = pausado ? 'Concentración (25 min) — Pausado' : 'Intervalo de concentración (25 min)';
    } else if (modo === 'descanso') {
      estadoCiclo.textContent = pausado ? 'Descanso (5 min) — Pausado' : 'Intervalo de descanso (5 min)';
    } else {
      estadoCiclo.textContent = 'Listo para iniciar';
    }
  }

  // Sonido sutil generado con Web Audio API (sin depender de archivos mp3 externos)
  function reproducirAlarmaSutil() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      if (!audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const ahora = audioCtx.currentTime;
      const notas = [523.25, 659.25]; // Do5 -> Mi5 suave

      notas.forEach((frecuencia, indice) => {
        const osc = audioCtx.createOscillator();
        const ganancia = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(frecuencia, ahora + indice * 0.22);

        ganancia.gain.setValueAtTime(0.0001, ahora + indice * 0.22);
        ganancia.gain.exponentialRampToValueAtTime(0.14, ahora + indice * 0.22 + 0.04);
        ganancia.gain.exponentialRampToValueAtTime(0.0001, ahora + indice * 0.22 + 0.55);

        osc.connect(ganancia);
        ganancia.connect(audioCtx.destination);

        osc.start(ahora + indice * 0.22);
        osc.stop(ahora + indice * 0.22 + 0.58);
      });
    } catch {
      // Si el navegador bloquea el audio, continúa sin interrumpir el ciclo
    }

    // Destello visual sutil complementario
    if (cuadroTemporizador) {
      cuadroTemporizador.classList.add('alerta-cambio');
      setTimeout(() => cuadroTemporizador.classList.remove('alerta-cambio'), 900);
    }
  }

  function detenerIntervalo() {
    if (intervaloId !== null) {
      clearInterval(intervaloId);
      intervaloId = null;
    }
  }

  function iniciarConteo() {
    detenerIntervalo();
    intervaloId = setInterval(() => {
      if (pausado) return;

      if (segundosRestantes > 0) {
        segundosRestantes -= 1;
        actualizarVista();
      }

      if (segundosRestantes === 0) {
        reproducirAlarmaSutil();

        if (modo === 'trabajo') {
          modo = 'descanso';
          segundosRestantes = TIEMPO_DESCANSO;
        } else {
          modo = 'trabajo';
          segundosRestantes = TIEMPO_TRABAJO;
        }

        actualizarTextoEstado();
        actualizarVista();
      }
    }, 1000);
  }

  // Botón Iniciar: fija automáticamente 25 minutos y empieza a contar hacia abajo
  btnIniciar?.addEventListener('click', () => {
    // Desbloquear contexto de audio en la interacción del usuario
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass && !audioCtx) {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch {
      // Ignorar
    }

    modo = 'trabajo';
    pausado = false;
    segundosRestantes = TIEMPO_TRABAJO;

    if (btnPausar) {
      btnPausar.disabled = false;
      btnPausar.textContent = 'Pausar';
    }

    actualizarTextoEstado();
    actualizarVista();
    iniciarConteo();
  });

  // Botón Pausar / Reanudar
  btnPausar?.addEventListener('click', () => {
    if (modo === 'inactivo') return;

    pausado = !pausado;
    btnPausar.textContent = pausado ? 'Reanudar' : 'Pausar';
    actualizarTextoEstado();
  });

  // Botón Reiniciar: para todo el proceso y fija el tiempo a 0
  btnReiniciar?.addEventListener('click', () => {
    detenerIntervalo();
    modo = 'inactivo';
    pausado = false;
    segundosRestantes = 0;

    if (btnPausar) {
      btnPausar.disabled = true;
      btnPausar.textContent = 'Pausar';
    }

    actualizarTextoEstado();
    actualizarVista();
  });

  actualizarVista();
});
