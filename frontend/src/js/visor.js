/**
 * ============================================================================
 * visor.js - Visor de lectura en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica que el usuario tenga una sesión activa, si no, lo redirige a Inicio.html
 *   2. Carga y aplica las preferencias visuales de accesibilidad del usuario
 *   3. Recupera el texto enviado desde dashboard.html mediante sessionStorage
 *   4. Renderiza el contenido limpio dentro del cuadro de lectura adaptado
 *
 * Dependencias:
 *   - tema.js -> usa window.AdaptiPrefs (para leer, aplicar y sincronizar preferencias visuales).
 *
 * Datos que usa del navegador:
 *   - localStorage: token, usuario y caché de preferencias visuales.
 *   - sessionStorage: lee 'adaptiweb_contenido' con el texto procesado a mostrar.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 * @requires tema.js window.AdaptiPrefs
 */
document.addEventListener('DOMContentLoaded', async () => {
  /**
   * Elementos de la pagina
   * 
   * cuadroLectura: contenedor principal donde se muestra el texto adaptado al usuario según las preferencias
   */
  const cuadroLectura = document.getElementById('cuadro-lectura');
  /**
   * Constantes y variables
   * 
   * token: token del usuario en el localStorage
   * usuarioGuardado: información del usuario en el localStorage
   * prefsLocales: objeto con las preferencias visuales cacheadas o los valores predeterminados
   * textoMostrar: cadena de texto limpia que se renderizará en el cuadro de lectura
   * contenido: objeto parseado desde la sessionStorage con el tipo y valor del texto enviado
   */
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');
  // Verifica si el usuario tiene sesión activa, si no lo devuelve al inicio
  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }
  /**
   * Carga y aplicación de preferencias visuales
   * 
   * Aplica de inmediato las preferencias guardadas en localStorage
   * Consulta el servidor para mantener sincronizadas las preferencias del usuario
   */
  if (window.AdaptiPrefs) {
    // Obtiene las preferencias locales o usa las predeterminadas si nunca se han configurado
    const prefsLocales = window.AdaptiPrefs.leerCache() || window.AdaptiPrefs.PREDETERMINADAS;
    window.AdaptiPrefs.aplicar(prefsLocales);
    // Sincroniza las preferencias desde la base de datos usando el token de sesión
    try {
      await window.AdaptiPrefs.cargarDesdeServidor(token);
    } catch {
      // Si no hay conexión, mantiene las preferencias predeterminadas o del localStorage
    }
  }
  //texto a mostrar en el visor
  let textoMostrar = '';
  /**
   * Recuperación y renderizado del contenido
   * 
   * Lee el objeto guardado en sessionStorage por dashboard.html
   * Valida que el contenido sea una cadena de texto y lo inserta en el cuadro de lectura
   */
  try {
    // Parsea el contenido del localStorage y lo guarda en textoMostrar
    const contenido = JSON.parse(sessionStorage.getItem('adaptiweb_contenido') || 'null');
    if (contenido && typeof contenido.valor === 'string') {
      textoMostrar = contenido.valor;
    }
  } catch {
    //En caso de error deja el texto vacio
    textoMostrar = '';
  }
  //Inserta el texto final en el visto
  if (cuadroLectura) {
    cuadroLectura.textContent = textoMostrar;
  }
});
