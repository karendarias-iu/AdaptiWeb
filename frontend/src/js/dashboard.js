document.addEventListener('DOMContentLoaded', () => {
  // 1. Verificar sesión activa
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');

  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  const usuario = JSON.parse(usuarioGuardado);

  // 2. Elementos del DOM
  const dashboardTitle = document.querySelector('.dashboard-title');
  const menuBtn = document.getElementById('menu-btn');
  const sidebar = document.getElementById('sidebar');

  // Cerrar sesión (opción del menú lateral)
  const navLogout = document.getElementById('nav-logout');

  // Controles de los paneles principales
  const inputUrl = document.querySelector('.input-search');
  const btnEnviarUrl = document.querySelector('.send-btn');
  const textareaTexto = document.querySelector('.text-area-input');
  const btnAbrirVisor = document.querySelector('.btn.btn-light');

  // Sincroniza las preferencias guardadas en la BD (contraste, fuente, etc.) con este navegador
  window.AdaptiPrefs?.cargarDesdeServidor(token).catch(() => {
    // Si falla, se queda con las preferencias guardadas en este navegador
  });

  // 3. Personalizar título con el nombre del usuario
  if (dashboardTitle && usuario.nombre) {
    dashboardTitle.textContent = `¿Qué harás hoy, ${usuario.nombre}?`;
  }

  // 4. Panel lateral desplegable
  // Las herramientas (tareas, temporizador, marcadores, configuración) viven dentro del panel:
  // se cambia de una a otra mostrando/ocultando vistas, sin recargar la página.
  const vistasPanel = sidebar ? sidebar.querySelectorAll('.sidebar-vista') : [];
  let panelAbierto = false;
  let ultimaOpcion = null; // opción del menú que abrió la herramienta actual (para devolver el foco)

  function mostrarVista(nombre) {
    const destino = document.getElementById(`vista-${nombre}`);
    if (!destino) return;
    vistasPanel.forEach((vista) => { vista.hidden = vista !== destino; });
    sidebar.dataset.vista = nombre;
    // Para que cada herramienta pueda iniciarse cuando se abre (ej. timer.js)
    document.dispatchEvent(new CustomEvent('adaptipanel:vista', { detail: { vista: nombre } }));
  }

  function abrirPanel() {
    if (!sidebar || panelAbierto) return;
    panelAbierto = true;
    mostrarVista('menu'); // siempre se abre en el menú
    sidebar.inert = false;
    sidebar.classList.add('abierto');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Cerrar menú');
    menuBtn.textContent = '✕';
    sidebar.querySelector('#vista-menu .opcionMenu')?.focus({ preventScroll: true });
  }

  function cerrarPanel() {
    if (!sidebar || !panelAbierto) return;
    panelAbierto = false;
    if (sidebar.contains(document.activeElement)) menuBtn.focus({ preventScroll: true });
    sidebar.classList.remove('abierto');
    sidebar.inert = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Abrir menú');
    menuBtn.textContent = '☰';
  }

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    panelAbierto ? cerrarPanel() : abrirPanel();
  });

  // Dentro del panel: abrir una herramienta o volver al menú
  sidebar?.addEventListener('click', (e) => {
    const opcion = e.target.closest('[data-vista]');
    if (opcion) {
      ultimaOpcion = opcion;
      mostrarVista(opcion.dataset.vista);
      sidebar.querySelector('.sidebar-vista:not([hidden]) .btn-volver')?.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest('[data-volver]')) {
      mostrarVista('menu');
      (ultimaOpcion || sidebar.querySelector('#vista-menu .opcionMenu'))?.focus({ preventScroll: true });
    }
  });

  // Cerrar al hacer clic fuera del panel
  document.addEventListener('click', (e) => {
    if (panelAbierto && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      cerrarPanel();
    }
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelAbierto) cerrarPanel();
  });

  // Por si otro script necesita controlar el panel
  window.AdaptiPanel = { abrir: abrirPanel, cerrar: cerrarPanel, mostrarVista };

  // 5. Cerrar sesión
  navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('adaptiweb_token');
    localStorage.removeItem('adaptiweb_usuario');
    window.AdaptiPrefs?.borrarCache(); // para que otra persona en este navegador no vea tus preferencias
    window.location.href = 'Inicio.html';
  });

  // 7. Panel 1: Enviar URL de sitio o PDF
  function procesarUrl() {
    const url = inputUrl?.value.trim();

    if (!url) {
      alert('Por favor ingresa una URL válida.');
      inputUrl?.focus();
      return;
    }

    try {
      new URL(url); // Valida formato http:// o https://
    } catch {
      alert('La URL debe incluir http:// o https://');
      inputUrl?.focus();
      return;
    }

    // Guarda el contenido a adaptar para que el visor lo lea
    sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
      tipo: 'url',
      valor: url
    }));

    // Redirige a tu página del visor (ajusta el nombre si tu archivo se llama distinto)
    window.location.href = 'visor.html';
  }

  btnEnviarUrl?.addEventListener('click', procesarUrl);

  inputUrl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      procesarUrl();
    }
  });

  // 8. Panel 2: Abrir visor con texto manual
  btnAbrirVisor?.addEventListener('click', () => {
    const texto = textareaTexto?.value.trim();

    if (!texto) {
      alert('Por favor ingresa o pega un texto antes de abrir el visor.');
      textareaTexto?.focus();
      return;
    }

    sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
      tipo: 'texto',
      valor: texto
    }));

    window.location.href = 'visor.html';
  });
});