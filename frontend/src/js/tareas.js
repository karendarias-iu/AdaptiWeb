(() => {
  const API_URL = '/api/tareas';
  const form = document.getElementById('form-nueva-tarea');
  const inputTitulo = document.getElementById('input-titulo-tarea');
  const inputRecordatorio = document.getElementById('input-recordatorio-tarea');
  const lista = document.getElementById('lista-tareas');
  const counter = document.getElementById('tasks-counter');
  const feedback = document.getElementById('tasks-feedback');

  if (!form || !lista) return;

  function obtenerToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }

  function mostrarMensaje(texto, esError = false) {
    feedback.textContent = texto;
    feedback.style.color = esError ? '#fca5a5' : '#a5b4fc';
  }

  function formatearFecha(isoOrSql) {
    if (!isoOrSql) return '';
    const fecha = new Date(isoOrSql);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  function actualizarContador(tareas) {
    const pendientes = tareas.filter((t) => !t.completada).length;
    counter.textContent =
      pendientes === 1 ? '1 pendiente' : `${pendientes} pendientes`;
  }

  function renderizarTareas(tareas) {
    lista.innerHTML = '';
    actualizarContador(tareas);

    if (!tareas.length) {
      const vacio = document.createElement('li');
      vacio.className = 'tasks-feedback';
      vacio.textContent = 'Aún no tienes tareas registradas.';
      lista.appendChild(vacio);
      return;
    }

    tareas.forEach((tarea) => {
      const li = document.createElement('li');
      li.className = `task-item ${tarea.completada ? 'is-completed' : ''}`;

      const main = document.createElement('div');
      main.className = 'task-main';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox';
      checkbox.checked = Boolean(tarea.completada);
      checkbox.setAttribute(
        'aria-label',
        `Marcar "${tarea.titulo}" como ${tarea.completada ? 'pendiente' : 'completada'}`
      );
      checkbox.addEventListener('change', () => toggleCompletada(tarea.id_tarea, checkbox.checked));

      const textWrap = document.createElement('div');
      const tituloSpan = document.createElement('span');
      tituloSpan.className = 'task-title';
      tituloSpan.textContent = tarea.titulo;
      textWrap.appendChild(tituloSpan);

      const fechaFormateada = formatearFecha(tarea.recordatorio);
      if (fechaFormateada) {
        const recSpan = document.createElement('span');
        recSpan.className = 'task-reminder';
        recSpan.textContent = `⏰ ${fechaFormateada}`;
        textWrap.appendChild(recSpan);
      }

      main.appendChild(checkbox);
      main.appendChild(textWrap);

      const btnEliminar = document.createElement('button');
      btnEliminar.type = 'button';
      btnEliminar.className = 'btn-delete-task';
      btnEliminar.textContent = '✕';
      btnEliminar.setAttribute('aria-label', `Eliminar tarea "${tarea.titulo}"`);
      btnEliminar.addEventListener('click', () => eliminarTarea(tarea.id_tarea));

      li.appendChild(main);
      li.appendChild(btnEliminar);
      lista.appendChild(li);
    });
  }

  async function cargarTareas() {
    const token = obtenerToken();
    if (!token) {
      mostrarMensaje('Inicia sesión para ver y guardar tus tareas.', true);
      return;
    }

    try {
      const res = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarMensaje(data.message || 'No se pudieron cargar las tareas.', true);
        return;
      }
      renderizarTareas(data.tareas || []);
    } catch (error) {
      console.error(error);
      mostrarMensaje('Error de conexión al cargar tareas.', true);
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = obtenerToken();
    if (!token) {
      mostrarMensaje('Debes iniciar sesión para agregar tareas.', true);
      return;
    }

    const titulo = inputTitulo.value.trim();
    const recordatorio = inputRecordatorio.value || null;

    if (!titulo) {
      mostrarMensaje('Escribe un título para la tarea.', true);
      inputTitulo.focus();
      return;
    }

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ titulo, recordatorio })
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarMensaje(data.message || 'No se pudo guardar la tarea.', true);
        return;
      }

      inputTitulo.value = '';
      inputRecordatorio.value = '';
      mostrarMensaje(data.message || 'Tarea agregada.');
      await cargarTareas();
    } catch (error) {
      console.error(error);
      mostrarMensaje('Error de conexión al guardar la tarea.', true);
    }
  });

  async function toggleCompletada(idTarea, completada) {
    const token = obtenerToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/${idTarea}/completar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ completada })
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarMensaje(data.message || 'No se pudo actualizar la tarea.', true);
        return;
      }
      mostrarMensaje(data.message || 'Estado actualizado.');
      await cargarTareas();
    } catch (error) {
      console.error(error);
      mostrarMensaje('Error de conexión al actualizar.', true);
    }
  }

  async function eliminarTarea(idTarea) {
    const token = obtenerToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/${idTarea}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        mostrarMensaje(data.message || 'No se pudo eliminar la tarea.', true);
        return;
      }
      mostrarMensaje(data.message || 'Tarea eliminada.');
      await cargarTareas();
    } catch (error) {
      console.error(error);
      mostrarMensaje('Error de conexión al eliminar.', true);
    }
  }

  document.addEventListener('DOMContentLoaded', cargarTareas);
})();
