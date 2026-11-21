/**
 * Pantalla de lista de tareas: listar, crear, finalizar, programar recordatorio y eliminar.
 * Todo se guarda en la base de datos a través de /api/tareas (requiere sesión iniciada).
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Verificar sesión activa
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');

  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  // Sincroniza las preferencias guardadas (contraste, etc.) con este navegador
  window.AdaptiPrefs?.cargarDesdeServidor(token).catch(() => {});

  // 2. Elementos del DOM
  const grid = document.getElementById('tareas-grid');
  const estado = document.getElementById('tareas-estado');

  const modalCrear = document.getElementById('modal-crear');
  const formCrear = document.getElementById('form-crear');
  const crearTitulo = document.getElementById('crear-titulo');
  const crearDescripcion = document.getElementById('crear-descripcion');
  const crearFecha = document.getElementById('crear-fecha');
  const crearError = document.getElementById('crear-error');
  const btnCrear = document.getElementById('btn-crear');

  const modalDetalle = document.getElementById('modal-detalle');
  const detalleTitulo = document.getElementById('detalle-titulo');
  const detalleDescripcion = document.getElementById('detalle-descripcion');
  const detalleFecha = document.getElementById('detalle-fecha');
  const formRecordatorio = document.getElementById('form-recordatorio');
  const detalleRecordatorio = document.getElementById('detalle-recordatorio');
  const detalleRecordatorioInfo = document.getElementById('detalle-recordatorio-info');
  const btnRecordatorio = document.getElementById('btn-recordatorio');
  const detalleError = document.getElementById('detalle-error');
  const btnFinalizar = document.getElementById('btn-finalizar');
  const btnEliminar = document.getElementById('btn-eliminar');

  let tareas = [];
  let idAbierta = null;

  // 3. Utilidades
  async function api(ruta, { method = 'GET', body } = {}) {
    const respuesta = await fetch(`/api/tareas${ruta}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    let datos = {};
    try {
      datos = await respuesta.json();
    } catch {
      // respuesta sin cuerpo JSON
    }

    if (respuesta.status === 401) {
      localStorage.removeItem('adaptiweb_token');
      localStorage.removeItem('adaptiweb_usuario');
      window.location.href = 'Inicio.html';
      throw new Error('Sesión expirada.');
    }
    if (!respuesta.ok) throw new Error(datos.message || 'No se pudo completar la acción.');
    return datos;
  }

  function formatearFecha(iso) {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  const aValorInput = (iso) => (iso ? iso.slice(0, 16) : '');

  // "Ahora" como texto para un <input type="datetime-local"> (hora local, hasta el minuto)
  function ahoraParaInput() {
    const d = new Date();
    d.setSeconds(0, 0);
    const dos = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }

  function avisar(mensaje) {
    estado.textContent = mensaje;
  }

  function ordenar() {
    tareas.sort((a, b) =>
      Number(a.completada) - Number(b.completada) ||
      String(a.fecha_tarea).localeCompare(String(b.fecha_tarea)) ||
      a.id_tarea - b.id_tarea
    );
  }

  // 4. Cuadrícula
  function render() {
    grid.replaceChildren();

    tareas.forEach((tarea) => {
      const item = document.createElement('li');
      const tarjeta = document.createElement('button');
      tarjeta.type = 'button';
      tarjeta.className = 'tarea-card' + (tarea.completada ? ' completada' : '');
      tarjeta.dataset.id = tarea.id_tarea;

      const titulo = document.createElement('span');
      titulo.className = 'tarea-titulo';
      titulo.textContent = tarea.titulo;

      const fecha = document.createElement('span');
      fecha.className = 'tarea-fecha';
      fecha.textContent = formatearFecha(tarea.fecha_tarea);

      tarjeta.append(titulo, fecha);

      if (tarea.completada) {
        const marca = document.createElement('span');
        marca.className = 'tarea-marca';
        marca.textContent = '✓ Finalizada';
        tarjeta.appendChild(marca);
      }

      item.appendChild(tarjeta);
      grid.appendChild(item);
    });

    // Último cuadro: crear tarea
    const itemCrear = document.createElement('li');
    const tarjetaCrear = document.createElement('button');
    tarjetaCrear.type = 'button';
    tarjetaCrear.className = 'tarea-card tarea-crear';
    tarjetaCrear.id = 'tarjeta-crear';

    const mas = document.createElement('span');
    mas.className = 'tarea-crear-mas';
    mas.setAttribute('aria-hidden', 'true');
    mas.textContent = '+';
    const texto = document.createElement('span');
    texto.textContent = 'Crear tarea';

    tarjetaCrear.append(mas, texto);
    itemCrear.appendChild(tarjetaCrear);
    grid.appendChild(itemCrear);
  }

  async function cargarTareas() {
    avisar('Cargando tareas…');
    render(); // muestra al menos el cuadro "Crear tarea"
    try {
      const datos = await api('');
      tareas = datos.tareas || [];
      render();
      avisar(tareas.length ? '' : 'Aún no tienes tareas. Usa «Crear tarea» para añadir la primera.');
    } catch (error) {
      avisar(error.message === 'Sesión expirada.' ? '' : 'No se pudieron cargar tus tareas. Inténtalo de nuevo más tarde.');
    }
  }

  // 5. Crear tarea
  function abrirCrear() {
    formCrear.reset();
    crearError.textContent = '';
    modalCrear.showModal();
    crearTitulo.focus();
  }

  formCrear.addEventListener('submit', async (e) => {
    e.preventDefault();
    crearError.textContent = '';

    const titulo = crearTitulo.value.trim();
    const descripcion = crearDescripcion.value.trim();
    const fecha = crearFecha.value;

    if (!titulo) {
      crearError.textContent = 'Escribe un título para la tarea.';
      crearTitulo.focus();
      return;
    }
    if (!fecha) {
      crearError.textContent = 'Elige la fecha y hora de finalización.';
      crearFecha.focus();
      return;
    }

    btnCrear.disabled = true;
    try {
      const datos = await api('', { method: 'POST', body: { titulo, descripcion, fecha_tarea: fecha } });
      tareas.push(datos.tarea);
      ordenar();
      render();
      modalCrear.close();
      avisar('Tarea creada con éxito.');
      grid.querySelector(`[data-id="${datos.tarea.id_tarea}"]`)?.focus();
    } catch (error) {
      crearError.textContent = error.message;
    } finally {
      btnCrear.disabled = false;
    }
  });

  // 6. Detalle de la tarea
  function buscar(id) {
    return tareas.find((t) => t.id_tarea === id);
  }

  function pintarDetalle() {
    const tarea = buscar(idAbierta);
    if (!tarea) return;

    detalleTitulo.textContent = tarea.titulo;
    detalleDescripcion.textContent = tarea.descripcion || 'Sin descripción';
    detalleFecha.textContent = formatearFecha(tarea.fecha_tarea);
    detalleRecordatorio.value = aValorInput(tarea.recordatorio);
    detalleRecordatorio.min = ahoraParaInput();
    detalleRecordatorioInfo.textContent = tarea.completada
      ? 'La tarea está finalizada.'
      : tarea.recordatorio
        ? `Recordatorio programado para el ${formatearFecha(tarea.recordatorio)}`
        : 'Sin recordatorio.';

    detalleRecordatorio.disabled = tarea.completada;
    btnRecordatorio.disabled = tarea.completada;
    btnFinalizar.disabled = tarea.completada;
    btnEliminar.disabled = !tarea.completada; // solo se puede eliminar una tarea finalizada
    detalleError.textContent = '';
  }

  function abrirDetalle(id) {
    idAbierta = id;
    pintarDetalle();
    modalDetalle.showModal();
  }

  btnFinalizar.addEventListener('click', async () => {
    btnFinalizar.disabled = true;
    detalleError.textContent = '';
    try {
      const datos = await api(`/${idAbierta}/completar`, { method: 'PATCH', body: { completada: true } });
      Object.assign(buscar(idAbierta), datos.tarea);
      ordenar();
      render();
      pintarDetalle();
      avisar('Tarea finalizada.');
      btnEliminar.focus();
    } catch (error) {
      detalleError.textContent = error.message;
      btnFinalizar.disabled = false;
    }
  });

  btnEliminar.addEventListener('click', async () => {
    btnEliminar.disabled = true;
    detalleError.textContent = '';
    try {
      await api(`/${idAbierta}`, { method: 'DELETE' });
      tareas = tareas.filter((t) => t.id_tarea !== idAbierta);
      idAbierta = null;
      modalDetalle.close();
      render();
      avisar('Tarea eliminada.');
      document.getElementById('tarjeta-crear')?.focus();
    } catch (error) {
      detalleError.textContent = error.message;
      btnEliminar.disabled = false;
    }
  });

  formRecordatorio.addEventListener('submit', async (e) => {
    e.preventDefault();
    detalleError.textContent = '';

    const valor = detalleRecordatorio.value;
    if (valor && valor < ahoraParaInput()) {
      detalleError.textContent = 'El recordatorio debe ser una fecha y hora que aún no haya pasado.';
      return;
    }

    btnRecordatorio.disabled = true;
    try {
      // El permiso de notificaciones se pide aquí, porque el navegador solo lo permite tras un clic
      await window.AdaptiRecordatorios?.pedirPermiso();
      const datos = await api(`/${idAbierta}/recordatorio`, { method: 'PATCH', body: { recordatorio: valor || null } });
      Object.assign(buscar(idAbierta), datos.tarea);
      pintarDetalle();
      detalleRecordatorioInfo.textContent = valor
        ? `Recordatorio guardado para el ${formatearFecha(valor)}`
        : 'Recordatorio eliminado';
      window.AdaptiRecordatorios?.revisarAhora();
    } catch (error) {
      detalleError.textContent = error.message;
      btnRecordatorio.disabled = false;
    }
  });

  modalDetalle.addEventListener('close', () => {
    const id = idAbierta;
    idAbierta = null;
    if (id) grid.querySelector(`[data-id="${id}"]`)?.focus();
  });

  // 7. Eventos de la cuadrícula y de las ventanas
  grid.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('.tarea-card');
    if (!tarjeta) return;
    if (tarjeta.id === 'tarjeta-crear') abrirCrear();
    else abrirDetalle(Number(tarjeta.dataset.id));
  });

  [modalCrear, modalDetalle].forEach((modal) => {
    // Botón "Salir"
    modal.querySelector('[data-cerrar]').addEventListener('click', () => modal.close());
    // Clic en el fondo oscuro
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  });

  cargarTareas();
});
