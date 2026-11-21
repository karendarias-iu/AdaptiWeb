/**
 * Lector por voz del visor (Web Speech API nativa: window.speechSynthesis).
 *
 * Estados:  detenido -> leyendo <-> pausado -> detenido
 *   - detenido: solo "Reproducir" está habilitado.
 *   - leyendo:  "Reproducir" deshabilitado; "Pausar" y "Detener" habilitados.
 *   - pausado:  el botón de pausa cambia a "Reanudar"; "Detener" sigue habilitado.
 *
 * El texto se lee por fragmentos (frases) en cola: así se evita el corte de audio que algunos
 * navegadores (Chrome) tienen con textos largos, y detener/pausar responden al instante.
 */
document.addEventListener('DOMContentLoaded', () => {
  const lector = document.getElementById('lector');
  const btnAbrir = document.getElementById('lector-toggle');
  const btnReproducir = document.getElementById('tts-reproducir');
  const btnPausar = document.getElementById('tts-pausar');
  const btnDetener = document.getElementById('tts-detener');
  const mensaje = document.getElementById('tts-estado');
  const cuadroLectura = document.getElementById('cuadro-lectura');

  if (!lector || !btnAbrir || !btnReproducir || !btnPausar || !btnDetener || !cuadroLectura) return;

  const sintesis = window.speechSynthesis;
  const soportado = Boolean(sintesis) && typeof window.SpeechSynthesisUtterance === 'function';

  const MAX_FRAGMENTO = 200;                                  // caracteres por fragmento
  const IDIOMAS = ['es-CO', 'es-419', 'es-MX', 'es-US', 'es-ES']; // orden de preferencia

  let estado = 'detenido';
  let fragmentos = [];
  let indice = 0;
  let sesion = 0;   // se incrementa en cada reproducción/parada: los eventos de lecturas anteriores se ignoran
  let voz = null;

  // ---------- Interfaz ----------
  function mostrarMensaje(texto) {
    mensaje.textContent = texto || '';
  }

  function cambiarEstado(nuevo) {
    estado = nuevo;
    btnReproducir.disabled = nuevo !== 'detenido';
    btnPausar.disabled = nuevo === 'detenido';
    btnDetener.disabled = nuevo === 'detenido';
    btnPausar.textContent = nuevo === 'pausado' ? 'Reanudar' : 'Pausar';
  }

  btnAbrir.addEventListener('click', () => {
    const abierto = lector.classList.toggle('abierto');
    btnAbrir.setAttribute('aria-expanded', String(abierto));
  });

  if (!soportado) {
    btnReproducir.disabled = true;
    btnPausar.disabled = true;
    btnDetener.disabled = true;
    mostrarMensaje('Tu navegador no admite la lectura por voz.');
    return;
  }

  // ---------- Texto y voz ----------
  function dividirTexto(texto) {
    const piezas = texto.replace(/\r\n/g, '\n').match(/[^.!?…\n]+[.!?…]*/g) || [];
    const resultado = [];

    piezas.forEach((pieza) => {
      let t = pieza.trim();
      while (t.length > MAX_FRAGMENTO) {
        let corte = t.lastIndexOf(' ', MAX_FRAGMENTO);
        if (corte <= 0) corte = MAX_FRAGMENTO;
        resultado.push(t.slice(0, corte).trim());
        t = t.slice(corte).trim();
      }
      if (t && /[\p{L}\p{N}]/u.test(t)) resultado.push(t);
    });

    return resultado;
  }

  function elegirVoz() {
    const espanolas = sintesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('es'));
    for (const idioma of IDIOMAS) {
      const encontrada = espanolas.find((v) => v.lang.toLowerCase().replace('_', '-') === idioma.toLowerCase());
      if (encontrada) return encontrada;
    }
    return espanolas[0] || null;
  }

  // Cancela lo pendiente y quita el estado "pausado" (si no, Chrome puede quedarse mudo en la siguiente lectura)
  function limpiarSintesis() {
    sintesis.cancel();
    sintesis.resume();
  }

  // ---------- Lectura ----------
  function leerFragmento(miSesion) {
    if (miSesion !== sesion) return;

    if (indice >= fragmentos.length) {
      // Terminó el texto de forma natural: vuelve a estar listo para reproducir
      sesion += 1;
      cambiarEstado('detenido');
      btnReproducir.focus();
      return;
    }

    const frase = new SpeechSynthesisUtterance(fragmentos[indice]);
    frase.lang = voz ? voz.lang : 'es-CO';
    if (voz) frase.voice = voz;

    frase.onend = () => {
      if (miSesion !== sesion) return;
      indice += 1;
      leerFragmento(miSesion);
    };

    frase.onerror = (evento) => {
      if (miSesion !== sesion) return;
      if (evento.error === 'canceled' || evento.error === 'interrupted') return;
      mostrarMensaje('No se pudo reproducir el audio.');
      detener();
    };

    sintesis.speak(frase);
  }

  function reproducir() {
    const texto = (cuadroLectura.textContent || '').trim();
    if (!texto) {
      mostrarMensaje('No hay texto para leer.');
      return;
    }

    mostrarMensaje('');
    limpiarSintesis();
    sesion += 1;
    fragmentos = dividirTexto(texto);
    indice = 0;
    voz = elegirVoz();
    cambiarEstado('leyendo');
    btnPausar.focus(); // el botón pulsado queda deshabilitado: el foco pasa al siguiente control
    leerFragmento(sesion);
  }

  function pausarOReanudar() {
    if (estado === 'leyendo') {
      sintesis.pause();
      cambiarEstado('pausado');
    } else if (estado === 'pausado') {
      sintesis.resume();
      cambiarEstado('leyendo');
    }
  }

  function detener() {
    sesion += 1;
    limpiarSintesis();
    indice = 0;
    cambiarEstado('detenido');
    btnReproducir.focus();
  }

  btnReproducir.addEventListener('click', reproducir);
  btnPausar.addEventListener('click', pausarOReanudar);
  btnDetener.addEventListener('click', detener);

  // Al salir del visor, la voz no debe seguir sonando
  window.addEventListener('pagehide', () => sintesis.cancel());

  cambiarEstado('detenido');
});
