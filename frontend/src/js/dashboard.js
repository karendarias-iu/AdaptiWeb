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

  // Enlaces del menú lateral
  const navTasks = document.getElementById('nav-tasks');
  const navTimer = document.getElementById('nav-timer');
  const navSettings = document.getElementById('nav-settings');
  const navLogout = document.getElementById('nav-logout');

  // Controles de los paneles principales
  const inputUrl = document.querySelector('.input-search');
  const btnEnviarUrl = document.querySelector('.send-btn');
  const textareaTexto = document.querySelector('.text-area-input');
  const btnAbrirVisor = document.querySelector('.btn.btn-light');

  // 3. Personalizar título con el nombre del usuario
  if (dashboardTitle && usuario.nombre) {
    dashboardTitle.textContent = `¿Qué harás hoy, ${usuario.nombre}?`;
  }

  // 4. Abrir / cerrar menú lateral desplegable
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('hidden');
  });

  // Cerrar el sidebar si se hace clic fuera de él
  document.addEventListener('click', (e) => {
    if (
      sidebar &&
      !sidebar.classList.contains('hidden') &&
      !sidebar.contains(e.target) &&
      e.target !== menuBtn
    ) {
      sidebar.classList.add('hidden');
    }
  });

  // 5. Cerrar sesión
  navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('adaptiweb_token');
    localStorage.removeItem('adaptiweb_usuario');
    window.location.href = 'Inicio.html';
  });

  // 6. Navegación del menú lateral (lista para conectar tus vistas)
  navTasks?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebar.classList.add('hidden');
    // Aquí puedes mostrar la vista de tareas o redirigir a tareas.html
    console.log('Abrir Lista de tareas');
  });

  navTimer?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebar.classList.add('hidden');
    // Aquí puedes mostrar el temporizador o redirigir
    console.log('Abrir Temporizador');
  });

  navSettings?.addEventListener('click', (e) => {
    e.preventDefault();
    sidebar.classList.add('hidden');
    // Aquí puedes abrir la configuración de accesibilidad
    console.log('Abrir Configuración');
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