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
  const menuBtn = document.getElementById('botonMenu');
  const sidebar = document.getElementById('sidebar');

  // Enlaces del menú lateral

  const navTasks = document.getElementById('nav-tasks');
  const navTimer = document.getElementById('nav-timer');
  const navLogout = document.getElementById('nav-logout');

  // Controles de los paneles principales
  const inputUrl = document.querySelector('.input-search');
  const btnEnviarUrl = document.querySelector('.send-btn');
  const textareaTexto = document.querySelector('.text-area-input');
  const btnAbrirVisor = document.querySelector('.btn.btn-light');
  const btnLimpiarTexto = document.getElementById('limpiarTexto');

  // Sincroniza las preferencias guardadas en la BD (contraste, fuente, etc.) con este navegador
  window.AdaptiPrefs?.cargarDesdeServidor(token).catch(() => {
    // Si falla, se queda con las preferencias guardadas en este navegador
  });

  // Restaurar el texto previo en el textarea si el usuario regresó del visor
  try {
    const contenidoPrevio = JSON.parse(sessionStorage.getItem('adaptiweb_contenido') || 'null');
    if (contenidoPrevio && contenidoPrevio.tipo === 'texto' && textareaTexto && !textareaTexto.value) {
      textareaTexto.value = contenidoPrevio.valor || '';
    }
  } catch {
    // Ignorar errores de parseo
  }

  // 3. Personalizar título con el nombre del usuario
  if (dashboardTitle && usuario.nombre) {
    dashboardTitle.textContent = `¿Qué harás hoy, ${usuario.nombre}?`;
  }

  // 4. Abrir / cerrar menú lateral desplegable (la clase "abierto" lo desliza desde la derecha)
  function abrirMenu(abrir) {
    sidebar.classList.toggle('abierto', abrir);
    menuBtn?.setAttribute('aria-expanded', String(abrir));
  }

  btnLimpiarTexto.addEventListener('click', (e)=> {
    textareaTexto.value = '';
  });

  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirMenu(!sidebar.classList.contains('abierto'));
  });

  // Cerrar el sidebar si se hace clic fuera de él o se pulsa Escape
  document.addEventListener('click', (e) => {
    if (
      sidebar &&
      sidebar.classList.contains('abierto') &&
      !sidebar.contains(e.target) &&
      !menuBtn?.contains(e.target)
    ) {
      abrirMenu(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') abrirMenu(false);
  });

  // 5. Cerrar sesión
  navLogout?.addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('adaptiweb_token');
    localStorage.removeItem('adaptiweb_usuario');
    window.AdaptiPrefs?.borrarCache(); // para que otra persona en este navegador no vea tus preferencias
    window.location.href = 'Inicio.html';
  });

  // 6. Navegación del menú lateral
  navTasks?.addEventListener('click', (e) => {
    e.preventDefault();
    ajustarMenu(false);
    window.location.href = 'tareas.html';
  });

  navTimer?.addEventListener('click', (e) => {
    e.preventDefault();
    ajustarMenu(false);
    window.location.href = 'temporizador.html';

  });

  // 7. Panel 1: Enviar URL de sitio o PDF al backend para extraer texto limpio
  async function procesarUrl() {
    const url = inputUrl?.value.trim();

    if (!url) {
      alert('Por favor ingresa una URL válida.');
      inputUrl?.focus();
      return;
    }

    try {
      new URL(url); // Valida formato http:// o https://
    } catch {
      alert('La URL ingresada no es válida. Debe incluir http:// o https://');
      inputUrl?.focus();
      return;
    }

    if (btnEnviarUrl) btnEnviarUrl.disabled = true;
    if (inputUrl) inputUrl.disabled = true;

    try {
      if (url.toLowerCase().split('?')[0].endsWith('.pdf') && window.pdfjsLib) {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

          const pdf = await window.pdfjsLib.getDocument(url).promise;
          let textoCompleto = '';
          const maxPaginas = Math.min(pdf.numPages, 60); // Evita saturar la memoria en libros muy largos

          for (let i = 1; i <= maxPaginas; i++) {
            const pagina = await pdf.getPage(i);
            const contenido = await pagina.getTextContent();
            const textoPagina = contenido.items.map((item) => item.str).join(' ');
            textoCompleto += textoPagina + '\n\n';
          }

          if (!textoCompleto.trim()) {
            alert('El PDF no contiene texto seleccionable.');
            return;
          }

          sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
            tipo: 'url',
            valor: textoCompleto.trim().slice(0, 150000)
          }));

          window.location.href = 'visor.html';
          return;
        } catch (errPdf) {
          console.error('Error leyendo PDF en navegador:', errPdf);
          alert('Este servidor de PDF bloquea la lectura externa (CORS). Prueba descargando el texto o usando una URL web.');
          return;
        }
      }

      const respuesta = await fetch('/api/texto/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tipo: 'url', valor: url })
      });

      const datos = await respuesta.json();

      if (respuesta.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }

      if (!respuesta.ok) {
        alert(datos.message || 'No se pudo extraer el texto de la URL ingresada.');
        inputUrl?.focus();
        return;
      }

      // Guarda el string extraído para que visor.html lo muestre con las preferencias del usuario
      sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
        tipo: 'url',
        valor: datos.texto || ''
      }));

      window.location.href = 'visor.html';
    } catch (error) {
      console.error('Error al extraer texto de la URL:', error);
      alert('Error de conexión con el servidor al intentar leer la URL. Inténtalo de nuevo.');
    } finally {
      if (btnEnviarUrl) btnEnviarUrl.disabled = false;
      if (inputUrl) inputUrl.disabled = false;
    }
  }

  btnEnviarUrl?.addEventListener('click', procesarUrl);

  inputUrl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      procesarUrl();
    }
  });

  // 8. Panel 2: Abrir visor con texto manual (permite abrir incluso si no hay texto)
  btnAbrirVisor?.addEventListener('click', async () => {
    const texto = textareaTexto ? textareaTexto.value : '';

    if (btnAbrirVisor) btnAbrirVisor.disabled = true;

    try {
      const respuesta = await fetch('/api/texto/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tipo: 'texto', valor: texto })
      });

      const datos = await respuesta.json();

      if (respuesta.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }

      const textoFinal = respuesta.ok && typeof datos.texto === 'string' ? datos.texto : texto;

      sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
        tipo: 'texto',
        valor: textoFinal
      }));

      window.location.href = 'visor.html';
    } catch {
      sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
        tipo: 'texto',
        valor: texto
      }));
      window.location.href = 'visor.html';
    } finally {
      if (btnAbrirVisor) btnAbrirVisor.disabled = false;
    }
  });
  // Cargar y extraer automáticamente si el usuario viene desde "Abrir marcador"
  const urlMarcador = sessionStorage.getItem('adaptiweb_url_marcador');
  if (urlMarcador) {
    sessionStorage.removeItem('adaptiweb_url_marcador');

    const inputUrl = document.querySelector('.input-search');
    const btnEnviarUrl = document.querySelector('.send-btn');

    if (inputUrl && btnEnviarUrl) {
      inputUrl.value = urlMarcador;
      btnEnviarUrl.click();
    }
  }
});
