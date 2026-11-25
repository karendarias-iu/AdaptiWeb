/**
 * ============================================================================
 * timer.js - Temporizador Pomodoro accesible en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica que el usuario tenga una sesión activa (si no, redirige a Inicio.html).
 *   2. Gestiona ciclos automáticos de concentración (25 minutos) y descanso (5 minutos)
 *      bajo la técnica Pomodoro.
 *   3. Permite iniciar, pausar/reanudar y reiniciar el conteo regresivo en segundos.
 *   4. Emite una alerta sonora sutil generada por síntesis mediante Web Audio API
 *      (sin depender de archivos MP3 externos) y un destello visual al cambiar de ciclo.
 *
 * Dependencias:
 *   - Web Audio API (window.AudioContext / webkitAudioContext) -> genera el tono de aviso.
 *
 * Datos que usa del navegador:
 *   - localStorage: lee 'adaptiweb_token' y 'adaptiweb_usuario' para validar la sesión.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Elementos de la página
   * 
   * displayTiempo: contenedor donde se muestra el reloj en formato MM:SS
   * estadoCiclo: texto informativo que indica el modo actual (concentración, descanso o pausado)
   * cuadroTemporizador: contenedor principal del reloj al que se aplica el destello visual de alerta
   * btnIniciar: botón que comienza el ciclo de 25 minutos de concentración
   * btnPausar: botón que alterna entre pausar y reanudar el conteo activo
   * btnReiniciar: botón que detiene el temporizador y vuelve el contador a 00:00
   */
  const displayTiempo = document.getElementById('tiempo-display');
  const estadoCiclo = document.getElementById('estado-ciclo');
  const cuadroTemporizador = document.getElementById('cuadro-temporizador');
  const btnIniciar = document.getElementById('btn-iniciar');
  const btnPausar = document.getElementById('btn-pausar');
  const btnReiniciar = document.getElementById('btn-reiniciar');

  /**
   * Constantes y variables
   * 
   * token: token JWT del usuario almacenado en el localStorage
   * usuarioGuardado: datos del usuario almacenados en el localStorage
   * TIEMPO_TRABAJO: duración del intervalo de concentración en segundos (25 min = 1500 s)
   * TIEMPO_DESCANSO: duración del intervalo de descanso en segundos (5 min = 300 s)
   * segundosRestantes: contador regresivo de segundos del ciclo actual
   * intervaloId: identificador del setInterval activo (o null si está detenido)
   * pausado: bandera booleana que indica si el conteo está en pausa
   * modo: estado actual del ciclo ('inactivo' | 'trabajo' | 'descanso')
   * audioCtx: instancia de AudioContext para sintetizar el sonido de alarma
   */
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');
  // Verifica si el usuario tiene sesión activa, si no lo devuelve al inicio
  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  const TIEMPO_TRABAJO = 25 * 60; // 25 minutos en segundos
  const TIEMPO_DESCANSO = 5 * 60; // 5 minutos en segundos
  let segundosRestantes = 0;
  let intervaloId = null;
  let pausado = false;
  let modo = 'inactivo'; // 'inactivo' | 'trabajo' | 'descanso'
  let audioCtx = null;

  /**
   * Función que convierte una cantidad de segundos a formato reloj MM:SS
   * 
   * @param {number} totalSegundos - Cantidad total de segundos a formatear
   * @returns {string} Tiempo formateado con ceros a la izquierda (ej. "25:00", "04:09")
   */
  function formatearTiempo(totalSegundos) {
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
  }

  /**
   * Función que actualiza el texto del reloj en pantalla con los segundos restantes
   * 
   * @returns {void}
   */
  function actualizarVista() {
    if (displayTiempo) {
      displayTiempo.textContent = formatearTiempo(segundosRestantes);
    }
  }

  /**
   * Función que actualiza el mensaje descriptivo del ciclo actual
   * 
   * Indica si el usuario está en concentración, descanso, pausado o listo para iniciar
   * @returns {void}
   */
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

  /**
   * Función que genera una alerta sonora suave y un destello visual al terminar un ciclo
   * 
   * Sintetiza dos notas musicales consecutivas (Do5 y Mi5) usando osciladores de onda
   * senoidal mediante Web Audio API y aplica temporalmente la clase CSS `alerta-cambio`
   * @returns {void}
   */
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

  /**
   * Función que detiene y limpia el temporizador activo si existe
   * 
   * @returns {void}
   */
  function detenerIntervalo() {
    if (intervaloId !== null) {
      clearInterval(intervaloId);
      intervaloId = null;
    }
  }

  /**
   * Función que inicia el conteo regresivo segundo a segundo
   * 
   * Al llegar a cero, emite la alarma y alterna automáticamente entre
   * el modo 'trabajo' (25 min) y el modo 'descanso' (5 min)
   * @returns {void}
   */
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

  /**
   * Evento click en botón Iniciar
   * 
   * Desbloquea el contexto de audio del navegador tras la interacción del usuario,
   * establece el ciclo de trabajo en 25 minutos y arranca el conteo regresivo
   */
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

  /**
   * Evento click en botón Pausar / Reanudar
   * 
   * Alterna el estado de pausa siempre que exista un ciclo activo
   */
  btnPausar?.addEventListener('click', () => {
    if (modo === 'inactivo') return;

    pausado = !pausado;
    btnPausar.textContent = pausado ? 'Reanudar' : 'Pausar';
    actualizarTextoEstado();
  });

  /**
   * Evento click en botón Reiniciar
   * 
   * Detiene el intervalo activo, reinicia el estado a 'inactivo' y vuelve el reloj a 00:00
   */
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
  //Renderizado inicial del reloj (00:00)
  actualizarVista();
});
