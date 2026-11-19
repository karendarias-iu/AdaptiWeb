/**
 * tema.js — Preferencias de accesibilidad (compartido por todas las pantallas con sesión).
 *
 * Debe cargarse en el <head> SIN defer, para que el tema se aplique antes de pintar la página
 * y no haya "parpadeo" de oscuro a claro.
 *
 *  - El contraste (claro/oscuro) se aplica a toda la página con <html data-tema="...">.
 *  - La fuente, tamaño, interlineado y espaciados se exponen como variables CSS (--pref-*)
 *    y los usa la clase .texto-adaptado (ver textoAdaptado.css).
 */
(function () {
  const CLAVE_CACHE = 'adaptiweb_preferencias';

  const PREDETERMINADAS = {
    fuente: 'Botones',
    tamanio_fuente: 16,
    interlineado: 1.5,
    espacio_letras: 0,
    espacio_palabras: 0,
    contraste: 'oscuro',
    fecha_actualizacion: null
  };

  // Límites (mismos que en backend/src/controllers/preferenciasController.js)
  const LIMITES = {
    tamanio_fuente:   { nombre: 'El tamaño de fuente',       min: 8, max: 120, unidad: 'px' },
    interlineado:     { nombre: 'El interlineado',           min: 1, max: 5,   unidad: 'veces el tamaño' },
    espacio_letras:   { nombre: 'El espacio entre letras',   min: 0, max: 20,  unidad: 'px' },
    espacio_palabras: { nombre: 'El espacio entre palabras', min: 0, max: 50,  unidad: 'px' }
  };

  // Fuentes: valor guardado en BD, etiqueta visible y "pila" CSS con alternativa por si no está instalada
  const SANS = 'sans-serif', SERIF = 'serif', MONO = 'monospace';
  const GRUPOS_FUENTES = [
    { grupo: 'AdaptiWeb', fuentes: [
      ['Botones', 'Louis George Café (predeterminada)', SANS]
    ]},
    { grupo: 'Pensadas para accesibilidad', fuentes: [
      ['Lexend', 'Lexend', SANS],
      ['Atkinson Hyperlegible', 'Atkinson Hyperlegible', SANS],
      ['OpenDyslexic', 'OpenDyslexic', SANS],
      ['Comic Sans MS', 'Comic Sans MS', 'cursive']
    ]},
    { grupo: 'Sin serifa (sans-serif)', fuentes: [
      ['Arial', 'Arial', SANS], ['Verdana', 'Verdana', SANS], ['Tahoma', 'Tahoma', SANS],
      ['Trebuchet MS', 'Trebuchet MS', SANS], ['Calibri', 'Calibri', SANS],
      ['Segoe UI', 'Segoe UI', SANS], ['Helvetica', 'Helvetica', SANS],
      ['Century Gothic', 'Century Gothic', SANS], ['Open Sans', 'Open Sans', SANS],
      ['Roboto', 'Roboto', SANS], ['Lato', 'Lato', SANS], ['Nunito', 'Nunito', SANS],
      ['Montserrat', 'Montserrat', SANS], ['Poppins', 'Poppins', SANS],
      ['Source Sans 3', 'Source Sans 3', SANS], ['Noto Sans', 'Noto Sans', SANS],
      ['Inter', 'Inter', SANS]
    ]},
    { grupo: 'Con serifa (serif)', fuentes: [
      ['Georgia', 'Georgia', SERIF], ['Times New Roman', 'Times New Roman', SERIF],
      ['Cambria', 'Cambria', SERIF], ['Garamond', 'Garamond', SERIF],
      ['Palatino Linotype', 'Palatino Linotype', SERIF], ['Book Antiqua', 'Book Antiqua', SERIF],
      ['Merriweather', 'Merriweather', SERIF], ['Lora', 'Lora', SERIF],
      ['Noto Serif', 'Noto Serif', SERIF]
    ]},
    { grupo: 'Monoespaciadas', fuentes: [
      ['Courier New', 'Courier New', MONO], ['Consolas', 'Consolas', MONO],
      ['Lucida Console', 'Lucida Console', MONO]
    ]}
  ];

  const PILAS = {};
  GRUPOS_FUENTES.forEach(g => g.fuentes.forEach(([valor, , generica]) => {
    PILAS[valor] = `"${valor}", ${generica}`;
  }));

  function leerCache() {
    try { return JSON.parse(localStorage.getItem(CLAVE_CACHE)); } catch (e) { return null; }
  }

  function guardarCache(prefs) {
    try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ }
  }

  function borrarCache() {
    try { localStorage.removeItem(CLAVE_CACHE); } catch (e) { /* nada */ }
  }

  // Escribe las variables --pref-* en un elemento (por defecto, toda la página)
  function aplicarTipografia(prefs, elemento) {
    const p = Object.assign({}, PREDETERMINADAS, prefs);
    const estilo = (elemento || document.documentElement).style;
    estilo.setProperty('--pref-fuente', PILAS[p.fuente] || PILAS.Botones);
    estilo.setProperty('--pref-tamanio', Number(p.tamanio_fuente) + 'px');
    estilo.setProperty('--pref-interlineado', String(Number(p.interlineado)));
    estilo.setProperty('--pref-letras', Number(p.espacio_letras) + 'px');
    estilo.setProperty('--pref-palabras', Number(p.espacio_palabras) + 'px');
  }

  // Aplica todo: contraste de la página + tipografía de los textos
  function aplicar(prefs) {
    const p = Object.assign({}, PREDETERMINADAS, prefs);
    document.documentElement.setAttribute('data-tema', p.contraste === 'claro' ? 'claro' : 'oscuro');
    aplicarTipografia(p);
  }

  // Pide las preferencias al servidor, las guarda en caché y las aplica
  async function cargarDesdeServidor(token) {
    const respuesta = await fetch('/api/preferencias', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!respuesta.ok) throw new Error('No se pudieron cargar las preferencias');
    const prefs = await respuesta.json();
    guardarCache(prefs);
    aplicar(prefs);
    return prefs;
  }

  window.AdaptiPrefs = {
    PREDETERMINADAS, LIMITES, GRUPOS_FUENTES, PILAS,
    leerCache, guardarCache, borrarCache,
    aplicar, aplicarTipografia, cargarDesdeServidor
  };

  // Aplicación inmediata con lo último que se guardó en este navegador
  aplicar(leerCache() || PREDETERMINADAS);
})();
