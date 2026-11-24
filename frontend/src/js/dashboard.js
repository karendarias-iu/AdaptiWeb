document.addEventListener('DOMContentLoaded', () => {

  /* Elementos de la pagina
- 
- dashboardTitle: titulo principal del panel que muestra un saludo al usuario con su nombre registrado
- menuBtn: boton de icono en forma de menu en la barra superior que despliega o contrae el menu lateral
- sidebar: panel lateral desplegable con las opciones de navegacion (tareas, temporizador, marcadores, preferencias y cerrar sesion)
- navTasks: enlace del menu lateral que redirige al modulo de lista de tareas
- navTimer: enlace del menu lateral que redirige al modulo de temporizador pomodoro
- navLogout: enlace del menu lateral que cierra la sesion activa del usuario y lo manda al inicio
- inputUrl: campo de entrada de texto donde se escribe o pega la URL del sitio web o pdf que se quiera ver en el visor
- btnEnviarUrl: boton para enviar el enlace URL, procesarlo y mostrarlo en el visor
- textareaTexto: campo de texto donde el usuario pega o escribe texto que desee ver en el visor
- btnAbrirVisor: boton que procesa lo puesto en el campo de texto y lo manda al visor
- btnLimpiarTexto: boton que vacia el contenido escrito en el area de texto manual
   */
const dashboardTitle = document.querySelector('.dashboard-title');
const menuBtn = document.getElementById('botonMenu');
const sidebar = document.getElementById('sidebar');
const navTasks = document.getElementById('nav-tasks');
const navTimer = document.getElementById('nav-timer');
const navLogout = document.getElementById('nav-logout');
const inputUrl = document.querySelector('.input-search');
const btnEnviarUrl = document.querySelector('.send-btn');
const textareaTexto = document.querySelector('.text-area-input');
const btnAbrirVisor = document.querySelector('.btn.btn-light');
const btnLimpiarTexto = document.getElementById('limpiarTexto');
/**
- variables y constantes de sesion
- 
- token: token de autenticacion JWT almacenado en el localStorage para validar las peticiones al servidor
- usuarioGuardado: cadena JSON con los datos del usuario guardados en el localStorage
- usuario: objeto con la información del usuario (nombre, correo, id)
- urlMarcador: URL temporal almacenada en sessionStorage cuando el usuario abre un marcador guardado
   */
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');
  // Verifica si el usario tiene su sesion activa
  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }
  const usuario = JSON.parse(usuarioGuardado);

  /**
  Sincronizacion inicial de las preferencias del usuario
  - descarga las preferencias visuales guardadas en la base de datos del usuario
  - restaura en el textarea el texto previo si el usuario regreso desde el visor de lectura
  - la funcion cargarDesdeServidor se encuentra en tema.js
   */
  window.AdaptiPrefs?.cargarDesdeServidor(token).catch(() => {
    // Si falla entonces carga las preferencias guardadas en el navegador del usuario
  });

  // Restaurar el texto previo en el campo de texto si el usuario regresó del visor
  try {
    const contenidoPrevio = JSON.parse(sessionStorage.getItem('adaptiweb_contenido') || 'null');
    if (contenidoPrevio && contenidoPrevio.tipo === 'texto' && textareaTexto && !textareaTexto.value) {
      textareaTexto.value = contenidoPrevio.valor || '';
    }
  } catch {
    // Ignorar los errores
  }
  // Al recargar la pagina, si hay una URL en el campo esta se borra
  if (inputUrl) inputUrl.value = '';

  // Al dar boton atras en la pagina, se borra el contenido si hay una URL en el campo
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && inputUrl) inputUrl.value = '';
  });

  // Muestra un texto de informacion '¿Que haras hoy' junto con el nombre de usuario + '?'
  if (dashboardTitle && usuario.nombre) {
    dashboardTitle.textContent = `¿Qué harás hoy, ${usuario.nombre}?`;
  }

  // 4. Abrir / cerrar menú lateral desplegable (la clase "abierto" lo desliza desde la derecha)
  function abrirMenu(abrir) {
    sidebar.classList.toggle('abierto', abrir);
    menuBtn?.setAttribute('aria-expanded', String(abrir));
  }

  function ajustarMenu(abrir) {
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
