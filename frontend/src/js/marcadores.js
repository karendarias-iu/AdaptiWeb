document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar sesión activa
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');

  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  const usuario = JSON.parse(usuarioGuardado);
  const STORAGE_KEY = `adaptiweb_marcadores_${usuario.id || usuario.correo || 'default'}`;

  const listaEl = document.getElementById('lista-marcadores');
  const modalDetalle = document.getElementById('modal-detalle');
  const detalleTitulo = document.getElementById('detalle-titulo');
  const detalleUrl = document.getElementById('detalle-url');
  const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');
  const btnToggleFavorito = document.getElementById('btn-toggle-favorito');
  const btnEliminarMarcador = document.getElementById('btn-eliminar-marcador');
  const btnAbrirMarcador = document.getElementById('btn-abrir-marcador');

  const modalCrear = document.getElementById('modal-crear');
  const btnCerrarCrear = document.getElementById('btn-cerrar-crear');
  const formCrear = document.getElementById('form-crear-marcador');
  const inputTitulo = document.getElementById('input-titulo-marcador');
  const inputUrl = document.getElementById('input-url-marcador');
  const inputFavorito = document.getElementById('input-favorito-marcador');

  let marcadores = [];
  let marcadorSeleccionado = null;

  function leerCacheLocal() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function guardarCacheLocal(lista) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Ignorar si el almacenamiento está lleno
    }
  }

  // Ordenar: favoritos siempre arriba de los marcadores normales
  function ordenarMarcadores(lista) {
    return [...lista].sort((a, b) => Number(Boolean(b.favorito)) - Number(Boolean(a.favorito)));
  }

  function extraerDominio(urlStr) {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return urlStr;
    }
  }

  async function cargarMarcadores() {
    marcadores = ordenarMarcadores(leerCacheLocal());
    renderizarLista();

    try {
      const resp = await fetch('/api/marcadores', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (resp.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }

      if (resp.ok) {
        const datos = await resp.json();
        if (Array.isArray(datos)) {
          marcadores = ordenarMarcadores(datos);
          guardarCacheLocal(marcadores);
          renderizarLista();
        }
      }
    } catch {
      // Si el backend no responde, mantiene los marcadores locales del usuario
    }
  }

  function renderizarLista() {
    if (!listaEl) return;
    listaEl.innerHTML = '';

    const ordenados = ordenarMarcadores(marcadores);

    ordenados.forEach((item) => {
      const fila = document.createElement('button');
      fila.type = 'button';
      fila.className = `marcador-item${item.favorito ? ' favorito' : ''}`;
      fila.setAttribute('role', 'listitem');

      const info = document.createElement('span');
      info.className = 'marcador-info';

      if (item.favorito) {
        const estrella = document.createElement('span');
        estrella.className = 'marcador-estrella';
        estrella.textContent = '★';
        estrella.setAttribute('aria-label', 'Favorito');
        info.appendChild(estrella);
      }

      const tituloSpan = document.createElement('span');
      tituloSpan.className = 'marcador-titulo';
      tituloSpan.textContent = item.titulo;
      info.appendChild(tituloSpan);

      const dominioSpan = document.createElement('span');
      dominioSpan.className = 'marcador-dominio';
      dominioSpan.textContent = extraerDominio(item.url);

      fila.appendChild(info);
      fila.appendChild(dominioSpan);

      fila.addEventListener('click', () => abrirModalDetalle(item));
      listaEl.appendChild(fila);
    });

    // Último rectángulo: opción "Crear marcador"
    const btnCrear = document.createElement('button');
    btnCrear.type = 'button';
    btnCrear.className = 'marcador-item marcador-crear';
    btnCrear.textContent = '+ Crear marcador';
    btnCrear.addEventListener('click', abrirModalCrear);
    listaEl.appendChild(btnCrear);
  }

  function actualizarBotonFavoritoModal(esFavorito) {
    if (!btnToggleFavorito) return;
    btnToggleFavorito.classList.toggle('activo', Boolean(esFavorito));
    btnToggleFavorito.setAttribute('aria-pressed', String(Boolean(esFavorito)));
    btnToggleFavorito.textContent = esFavorito ? '★ En favoritos' : '☆ Añadir a favoritos';
  }

  function abrirModalDetalle(item) {
    marcadorSeleccionado = item;
    if (detalleTitulo) detalleTitulo.textContent = item.titulo;
    if (detalleUrl) {
      detalleUrl.textContent = item.url;
      detalleUrl.href = item.url;
    }
    actualizarBotonFavoritoModal(item.favorito);
    modalDetalle?.classList.remove('hidden');
  }

  function cerrarModalDetalle() {
    marcadorSeleccionado = null;
    modalDetalle?.classList.add('hidden');
  }

  function abrirModalCrear() {
    formCrear?.reset();
    modalCrear?.classList.remove('hidden');
    inputTitulo?.focus();
  }

  function cerrarModalCrear() {
    modalCrear?.classList.add('hidden');
  }

  // Abrir marcador pasando por dashboard para extraer el contenido y abrir el visor
  btnAbrirMarcador?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!marcadorSeleccionado || !marcadorSeleccionado.url) return;

    sessionStorage.setItem('adaptiweb_url_marcador', marcadorSeleccionado.url);
    window.location.href = 'dashboard.html';
  });

  // Alternar favorito desde el botón superior derecha del modal
  btnToggleFavorito?.addEventListener('click', async () => {
    if (!marcadorSeleccionado) return;
    const nuevoEstado = !marcadorSeleccionado.favorito;
    const idActual = marcadorSeleccionado.id;

    marcadores = marcadores.map((m) =>
      String(m.id) === String(idActual) ? { ...m, favorito: nuevoEstado } : m
    );
    marcadorSeleccionado = { ...marcadorSeleccionado, favorito: nuevoEstado };
    guardarCacheLocal(marcadores);
    actualizarBotonFavoritoModal(nuevoEstado);
    renderizarLista();

    try {
      await fetch(`/api/marcadores/${encodeURIComponent(idActual)}/favorito`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ favorito: nuevoEstado })
      });
    } catch {
      // Ya quedó actualizado localmente en tiempo real
    }
  });

  // Eliminar marcador desde el botón central inferior del modal
  btnEliminarMarcador?.addEventListener('click', async () => {
    if (!marcadorSeleccionado) return;
    const idEliminar = marcadorSeleccionado.id;

    marcadores = marcadores.filter((m) => String(m.id) !== String(idEliminar));
    guardarCacheLocal(marcadores);
    cerrarModalDetalle();
    renderizarLista();

    try {
      await fetch(`/api/marcadores/${encodeURIComponent(idEliminar)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // Ya quedó eliminado localmente en tiempo real
    }
  });

  // Crear nuevo marcador desde el último rectángulo
  formCrear?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const titulo = inputTitulo?.value.trim() || '';
    const url = inputUrl?.value.trim() || '';
    const favorito = Boolean(inputFavorito?.checked);

    if (!titulo || !url) return;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        alert('La URL debe comenzar con http:// o https://');
        return;
      }
    } catch {
      alert('Por favor ingresa una URL válida (ej. https://ejemplo.com).');
      return;
    }

    const tempId = `local_${Date.now()}`;
    const nuevoMarcador = { id: tempId, titulo, url, favorito };

    marcadores = ordenarMarcadores([nuevoMarcador, ...marcadores]);
    guardarCacheLocal(marcadores);
    cerrarModalCrear();
    renderizarLista();

    try {
      const resp = await fetch('/api/marcadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ titulo, url, favorito })
      });

      if (resp.ok) {
        const creado = await resp.json();
        if (creado && creado.id) {
          marcadores = ordenarMarcadores(
            marcadores.map((m) => (m.id === tempId ? creado : m))
          );
          guardarCacheLocal(marcadores);
          renderizarLista();
        }
      }
    } catch {
      // Se mantiene guardado en localStorage
    }
  });

  btnCerrarDetalle?.addEventListener('click', cerrarModalDetalle);
  btnCerrarCrear?.addEventListener('click', cerrarModalCrear);

  modalDetalle?.addEventListener('click', (e) => {
    if (e.target === modalDetalle) cerrarModalDetalle();
  });

  modalCrear?.addEventListener('click', (e) => {
    if (e.target === modalCrear) cerrarModalCrear();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarModalDetalle();
      cerrarModalCrear();
    }
  });

  await cargarMarcadores();
});
