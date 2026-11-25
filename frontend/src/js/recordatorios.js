/**
 * ============================================================================
 * recordatorios.js - Sistema de recordatorios y notificaciones en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Consulta cada 30 segundos las tareas con recordatorios pendientes
 *   2. Compara la hora programada de cada tarea contra el reloj local del navegador
 *   3. Cuando llega la hora, muestra un aviso flotante dentro de la página (siempre)
 *      usando la API Popover para quedar por encima de cualquier modal abierto
 *   4. Envía una notificación nativa del sistema/navegador si el usuario concedió permiso
 *   5. Marca el recordatorio como notificado en el servidor (PATCH) y evita duplicados
 *      en la sesión actual mediante un registro en memoria.
 *   6. Expone la API global `window.AdaptiRecordatorios` para iniciar, revisar al instante
 *      o solicitar permisos de notificación desde otras vistas (dashboard y tareas)
 *
 * Dependencias:
 *   - Backend -> endpoints GET /api/tareas/recordatorios/pendientes
 *                y PATCH /api/tareas/:id/recordatorio-notificado.
 *
 * Datos que usa del navegador:
 *   - localStorage: lee 'adaptiweb_token' para autenticar las peticiones al servidor.
 *   - Notification API: gestiona permisos y notificaciones nativas del navegador.
 *
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 */
(() => {
  /**
   * Constantes y variables
   * 
   * INTERVALO_MS: tiempo en milisegundos entre cada revisión automática (30000 ms = 30 segundos)
   * avisados: conjunto (Set) con claves "id_tarea|recordatorio" para no repetir avisos en la sesión
   * temporizador: referencia al intervalo activo (setInterval) para evitar ejecuciones duplicadas
   * revisando: bandera booleana que bloquea revisiones simultáneas si una petición aún está en curso
   */
  const INTERVALO_MS = 30000;
  const avisados = new Set();
  let temporizador = null;
  let revisando = false;

  /**
   * Funciones auxiliares de autenticación y formato
   * 
   * obtenerToken: recupera el token JWT del usuario desde el localStorage
   * cabeceras: construye el objeto de headers con la autorización Bearer para fetch
   */
  const obtenerToken = () => localStorage.getItem('adaptiweb_token');
  const cabeceras = () => ({ Authorization: `Bearer ${obtenerToken()}` });

  /**
   * Función que formatea una fecha ISO a formato legible local
   * 
   * Convierte la fecha a formato colombiano (DD/MM/AAAA, HH:MM)
   * @param {string} iso - Cadena de fecha en formato ISO
   * @returns {string} Fecha formateada o cadena vacía si la fecha no es válida
   */
  function formatearFecha(iso) {
    //fecha actual
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  /**
   * Función que obtiene o crea el contenedor flotante de avisos en el DOM
   * 
   * Inyecta los estilos CSS necesarios la primera vez y crea el contenedor `#adaptiweb-avisos`
   * Configura el atributo `popover="manual"` para que los avisos se muestren en la capa superior
   * @returns {HTMLElement} Elemento contenedor donde se apilan las tarjetas de recordatorio
   */
  function contenedorAvisos() {
    //caja de avisos
    let caja = document.getElementById('adaptiweb-avisos');
    if (caja) return caja;

    //estilo de la caja
    const estilo = document.createElement('style');
    estilo.textContent = `
      #adaptiweb-avisos{position:fixed;inset:auto;bottom:1rem;right:1rem;margin:0;padding:0;border:0;background:transparent;overflow:visible;color:inherit;z-index:1000;display:flex;flex-direction:column;gap:.75rem;max-width:min(360px,92vw)}
      .adaptiweb-aviso{background:var(--fg,#fff);color:var(--bg,#000);border-radius:16px;padding:1rem 1.25rem;box-shadow:0 4px 18px rgba(0,0,0,.5);font-family:inherit}
      .adaptiweb-aviso strong{display:block;margin-bottom:.25rem;overflow-wrap:anywhere}
      .adaptiweb-aviso button{margin-top:.6rem;padding:.35rem 1rem;border-radius:30px;border:1px solid var(--bg,#000);background:transparent;color:inherit;font:inherit;cursor:pointer}
    `;
    document.head.appendChild(estilo);
    caja = document.createElement('div');
    caja.id = 'adaptiweb-avisos';
    caja.setAttribute('role', 'region');
    caja.setAttribute('aria-label', 'Recordatorios');
    // "popover" lo coloca en la capa superior del navegador: así se ve por encima de las ventanas emergentes
    if (typeof caja.showPopover === 'function') caja.setAttribute('popover', 'manual');
    document.body.appendChild(caja);
    return caja;
  }

  /**
   * Función que construye y muestra una tarjeta de aviso dentro de la página
   * 
   * Crea el elemento visual con el título, fecha límite y botón de cierre
   * Reabre el popover para garantizar que quede por encima de otros modales activos
   * @param {{id_tarea: string|number, titulo: string, fecha_tarea: string}} tarea - Datos de la tarea a notificar
   * @returns {void}
   */
  function mostrarAviso(tarea) {
    //creación del elemento
    const aviso = document.createElement('div');
    aviso.className = 'adaptiweb-aviso';
    aviso.setAttribute('role', 'alert');
    //propiedades del elemento
    const titulo = document.createElement('strong');
    titulo.textContent = `Recordatorio: ${tarea.titulo}`;
    const detalle = document.createElement('span');
    detalle.textContent = `Finaliza el ${formatearFecha(tarea.fecha_tarea)}`;
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.textContent = 'Cerrar';
    cerrar.addEventListener('click', () => aviso.remove());
    aviso.append(titulo, detalle, document.createElement('br'), cerrar);
    const caja = contenedorAvisos();
    caja.appendChild(aviso);

    if (typeof caja.showPopover === 'function') {
      try {
        //se vuelve a abrir para quedar encima de lo último abierto
        if (caja.matches(':popover-open')) caja.hidePopover();
        caja.showPopover();
      } catch {
        //Sin soporte: queda como elemento fijo normal
      }
    }
  }

  /**
   * Función que dispara tanto el aviso interno como la notificación nativa del navegador
   * 
   * @param {{id_tarea: string|number, titulo: string, fecha_tarea: string}} tarea Tarea cuyo recordatorio venció
   * @returns {void}
   */
  function notificar(tarea) {
    //muestra el aviso
    mostrarAviso(tarea);
    //Pone la notificación y actualiza la fecha
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`Recordatorio: ${tarea.titulo}`, {
          body: `Finaliza el ${formatearFecha(tarea.fecha_tarea)}`,
          tag: `tarea-${tarea.id_tarea}`
        });
      } catch {
        // Si el navegador no permite crearla, queda el aviso dentro de la página
      }
    }
  }

  /**
   * Función asíncrona que consulta los recordatorios pendientes en el servidor
   * 
   * Filtra las tareas cuya hora de recordatorio ya llegó y que no hayan sido avisadas aún
   * Dispara las notificaciones y reporta al backend que ya fueron notificadas
   * @async
   * @returns {Promise<void>}
   */
  async function revisar() {
    //actualiza el estado
    if (!obtenerToken() || revisando) return;
    revisando = true;
    //petición al servidor
    try {
      const respuesta = await fetch('/api/tareas/recordatorios/pendientes', { headers: cabeceras() });
      if (!respuesta.ok) return;
      //arreglo de tareas
      const { tareas = [] } = await respuesta.json();
      //fecha actual
      const ahora = Date.now();
      //recorre las tareas
      for (const tarea of tareas) {
        //cada una tiene su id y recordatorio
        const clave = `${tarea.id_tarea}|${tarea.recordatorio}`;
        if (avisados.has(clave)) continue;
        //si pasa la fecha la notifica
        if (new Date(tarea.recordatorio).getTime() > ahora) continue;
        avisados.add(clave);
        notificar(tarea);
        fetch(`/api/tareas/${tarea.id_tarea}/recordatorio-notificado`, { method: 'PATCH', headers: cabeceras() })
          .catch(() => {});
      }
    } catch {
      // Sin conexión: se vuelve a intentar en la siguiente revisión
    } finally {
      //cambia el estado
      revisando = false;
    }
  }

  /**
   * Función que solicita permiso al usuario para mostrar notificaciones del navegador
   * 
   * Debe invocarse desde una interacción directa del usuario (como un clic)
   * @returns {Promise<NotificationPermission|void>} Promesa con el estado del permiso concedido
   */
  function pedirPermiso() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        return Promise.resolve(Notification.requestPermission());
      } catch {
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  /**
   * Función que inicia el ciclo automático de verificación de recordatorios
   * 
   * Ejecuta una revisión inmediata, programa el intervalo cada 30 segundos y añade
   * un listener para revisar apenas el usuario regrese a la pestaña (visibilitychange)
   * @returns {void}
   */
  function iniciar() {
    if (temporizador) return;
    revisar();
    //inicializa el temporizador
    temporizador = setInterval(revisar, INTERVALO_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) revisar();
    });
  }
  //expone los métodos públicos en el objeto global window
  window.AdaptiRecordatorios = { iniciar, revisarAhora: revisar, pedirPermiso };
  //Inicializa el módulo cuando este listo
  document.addEventListener('DOMContentLoaded', iniciar);
})();
