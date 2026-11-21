/**
 * Recordatorios de tareas
 *
 * Revisa cada cierto tiempo las tareas con recordatorio pendiente y, cuando llega la hora,
 * avisa al usuario con un aviso dentro de la página (siempre) y con una notificación del navegador
 * (si el usuario dio permiso). Se carga en el dashboard y en la lista de tareas.
 *
 * La hora se compara con el reloj del navegador: el servidor guarda la hora tal como la escribió el usuario.
 */
(() => {
  const INTERVALO_MS = 30000;
  const avisados = new Set(); // "id|recordatorio": evita repetir el aviso en esta sesión
  let temporizador = null;
  let revisando = false;

  const obtenerToken = () => localStorage.getItem('adaptiweb_token');
  const cabeceras = () => ({ Authorization: `Bearer ${obtenerToken()}` });

  function formatearFecha(iso) {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  // ---------- Aviso dentro de la página ----------
  function contenedorAvisos() {
    let caja = document.getElementById('adaptiweb-avisos');
    if (caja) return caja;

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

  function mostrarAviso(tarea) {
    const aviso = document.createElement('div');
    aviso.className = 'adaptiweb-aviso';
    aviso.setAttribute('role', 'alert');

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
        if (caja.matches(':popover-open')) caja.hidePopover(); // se vuelve a abrir para quedar encima de lo último abierto
        caja.showPopover();
      } catch {
        // Sin soporte: queda como elemento fijo normal
      }
    }
  }

  function notificar(tarea) {
    mostrarAviso(tarea);

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

  // ---------- Revisión ----------
  async function revisar() {
    if (!obtenerToken() || revisando) return;
    revisando = true;

    try {
      const respuesta = await fetch('/api/tareas/recordatorios/pendientes', { headers: cabeceras() });
      if (!respuesta.ok) return;

      const { tareas = [] } = await respuesta.json();
      const ahora = Date.now();

      for (const tarea of tareas) {
        const clave = `${tarea.id_tarea}|${tarea.recordatorio}`;
        if (avisados.has(clave)) continue;
        if (new Date(tarea.recordatorio).getTime() > ahora) continue;

        avisados.add(clave);
        notificar(tarea);
        fetch(`/api/tareas/${tarea.id_tarea}/recordatorio-notificado`, { method: 'PATCH', headers: cabeceras() })
          .catch(() => {});
      }
    } catch {
      // Sin conexión: se vuelve a intentar en la siguiente revisión
    } finally {
      revisando = false;
    }
  }

  // Pide permiso para notificaciones del navegador (debe llamarse desde un clic del usuario)
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

  function iniciar() {
    if (temporizador) return;
    revisar();
    temporizador = setInterval(revisar, INTERVALO_MS);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) revisar();
    });
  }

  window.AdaptiRecordatorios = { iniciar, revisarAhora: revisar, pedirPermiso };
  document.addEventListener('DOMContentLoaded', iniciar);
})();
