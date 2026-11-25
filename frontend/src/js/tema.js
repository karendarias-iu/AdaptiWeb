/**
 * ============================================================================
 * tema.js - Gestión global de preferencias de accesibilidad y tema en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Define las configuraciones visuales predeterminadas, los límites numéricos
 *      permitidos y el catálogo completo de tipografías agrupadas por categoría.
 *   2. Se ejecuta de forma inmediata al cargarse en el `<head>` (sin `defer`) para
 *      aplicar el tema guardado en caché antes de que el navegador pinte la página,
 *      evitando el parpadeo visual (FOUC) entre modo oscuro y claro.
 *   3. Aplica el esquema de contraste mediante el atributo `data-tema` en la etiqueta `<html>`.
 *   4. Inyecta las propiedades tipográficas como variables CSS personalizadas (`--pref-*`)
 *      consumidas por la clase `.texto-adaptado`.
 *   5. Sincroniza las preferencias del usuario desde la base de datos y expone la API
 *      global `window.AdaptiPrefs` para el resto de módulos de la aplicación.
 *
 * Dependencias:
 *   - Backend -> endpoint GET /api/preferencias (requiere token Bearer).
 *
 * Datos que usa del navegador:
 *   - localStorage: lee, guarda y elimina la llave 'adaptiweb_preferencias'.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 */
(function () {
  /**
   * Constantes de configuración y catálogos visuales
   * 
   * CLAVE_CACHE: llave utilizada en localStorage para almacenar las preferencias visuales
   * PREDETERMINADAS: valores iniciales de tipografía y contraste cuando el usuario no ha guardado ajustes
   * LIMITES: rangos mínimos, máximos, nombres legibles y unidades de los campos numéricos
   * SANS, SERIF, MONO: familias genéricas de respaldo en CSS
   * GRUPOS_FUENTES: catálogo de tipografías organizadas por categorías para el selector y CSS
   * PILAS: mapa diccionario que asocia cada nombre de fuente con su pila CSS completa (font-family)
   */
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

  const LIMITES = {
    tamanio_fuente:   { nombre: 'El tamaño de fuente',       min: 8, max: 120, unidad: 'px' },
    interlineado:     { nombre: 'El interlineado',           min: 1, max: 5,   unidad: 'veces el tamaño' },
    espacio_letras:   { nombre: 'El espacio entre letras',   min: 0, max: 20,  unidad: 'px' },
    espacio_palabras: { nombre: 'El espacio entre palabras', min: 0, max: 50,  unidad: 'px' }
  };

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

  /**
   * Lee las preferencias visuales almacenadas en el localStorage
   * 
   * @returns {Object|null} Objeto con las preferencias guardadas o null si no existen o fallan al parsear
   */
  function leerCache() {
    try { return JSON.parse(localStorage.getItem(CLAVE_CACHE)); } catch (e) { return null; }
  }

  /**
   * Guarda un objeto de preferencias visuales en el localStorage
   * 
   * @param {Object} prefs - Objeto con las preferencias a persistir
   * @returns {void}
   */
  function guardarCache(prefs) {
    try { localStorage.setItem(CLAVE_CACHE, JSON.stringify(prefs)); } catch (e) { /* sin almacenamiento */ }
  }

  /**
   * Elimina las preferencias cacheadas en el localStorage (usado al cerrar sesión)
   * 
   * @returns {void}
   */
  function borrarCache() {
    try { localStorage.removeItem(CLAVE_CACHE); } catch (e) { /* nada */ }
  }

  /**
   * Aplica las variables CSS tipográficas (`--pref-*`) sobre un elemento del DOM
   * 
   * Combina las preferencias recibidas con los valores predeterminados para evitar
   * propiedades indefinidas; si no se pasa un elemento, las aplica al `<html>` raíz
   * @param {Object} prefs - Configuración tipográfica (fuente, tamaño, interlineado y espaciados)
   * @param {HTMLElement} [elemento=document.documentElement] - Contenedor destino (ej. cuadro de vista previa)
   * @returns {void}
   */
  function aplicarTipografia(prefs, elemento) {
    const p = Object.assign({}, PREDETERMINADAS, prefs);
    const estilo = (elemento || document.documentElement).style;
    estilo.setProperty('--pref-fuente', PILAS[p.fuente] || PILAS.Botones);
    estilo.setProperty('--pref-tamanio', Number(p.tamanio_fuente) + 'px');
    estilo.setProperty('--pref-interlineado', String(Number(p.interlineado)));
    estilo.setProperty('--pref-letras', Number(p.espacio_letras) + 'px');
    estilo.setProperty('--pref-palabras', Number(p.espacio_palabras) + 'px');
  }

  /**
   * Aplica de forma global tanto el tema de contraste (`data-tema`) como la tipografía
   * 
   * @param {Object} prefs - Objeto completo de preferencias visuales del usuario
   * @returns {void}
   */
  function aplicar(prefs) {
    const p = Object.assign({}, PREDETERMINADAS, prefs);
    document.documentElement.setAttribute('data-tema', p.contraste === 'claro' ? 'claro' : 'oscuro');
    aplicarTipografia(p);
  }

  /**
   * Consulta las preferencias visuales del usuario desde el servidor,
   * actualiza el caché local y las aplica inmediatamente a la página
   * 
   * @async
   * @param {string} token - Token JWT de autenticación del usuario
   * @returns {Promise<Object>} Objeto con las preferencias recuperadas de la base de datos
   */
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
  // Expone constantes y utilidades en el espacio global para el resto de scripts
  window.AdaptiPrefs = {
    PREDETERMINADAS, LIMITES, GRUPOS_FUENTES, PILAS,
    leerCache, guardarCache, borrarCache,
    aplicar, aplicarTipografia, cargarDesdeServidor
  };

  // Ejecución síncrona inmediata para evitar parpadeo visual antes del renderizado inicial
  aplicar(leerCache() || PREDETERMINADAS);
})();
