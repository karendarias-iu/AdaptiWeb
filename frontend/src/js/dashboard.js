/**
 * ============================================================================
 * dashboard.js - Panel principal de AdaptiWeb (contiene el menu y el visor)
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica que el usuario tenga una sesión activa (si no, lo manda al inicio).
 *   2. Muestra un saludo con el nombre del usuario.
 *   3. Maneja el menú lateral (abrir, cerrar y elegir opciones).
 *   4. Recibe contenido para leer, de tres formas:
 *        - Una URL de una página web o de un PDF.
 *        - Un texto escrito o pegado a mano.
 *        - Un marcador guardado.
 *   5. Guarda ese contenido de forma temporal y abre el visor (visor.html).
 *
 * Dependencias:
 *   - tema.js      -> usa window.AdaptiPrefs (son las preferencias visuales del usuario).
 *   - pdf.js       -> usa window.pdfjsLib (para leer PDFs en el navegador).
 *   - Backend      -> tiene el endpoint POST /api/texto/procesar (extrae y limpia el texto).
 *
 * Datos que usa del navegador:
 *   - localStorage   (persiste aunque se cierre el navegador): token y usuario.
 *   - sessionStorage (se borra al cerrar la pestaña): contenido para el visor.
 * 
 * @version 1.0.0
 * @author Elkin Alzate Londoño
 * @requires tema.js (window.AdaptiPrefs)
 * @requires pdf.js (window.pdfjsLib)
 */

// Espera a que todo el HTML esté cargado para poder encontrar los elementos.
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
- btnEliminarCuenta: boton que despliega el panel de confirmación de eliminar la cuenta 
- modalEliminar: panel de confirmación de eliminar la cuenta
- btnCancelarEliminar: boton dentro del panel de eliminar la cuenta para cancelar el proceso de eliminación
- btnConfirmarEliminar: boton dentro del panel de eliminar la cuenta para eliminarla
- errorEliminar: texto que muestra el error de porque no se elimino la cuenta
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
const btnEliminarCuenta = document.getElementById('nav-delete-account');
const moduloEliminarCuenta = document.getElementById('modal-eliminar-cuenta');
const btnCancelarEliminar = document.getElementById('btn-cancelar-eliminar');
const btnConfirmarEliminar = document.getElementById('btn-confirmar-eliminar');
const errorEliminar = document.getElementById('eliminar-error');
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

   /**
   * Abre o cierra el menú lateral
   * Se le aplica o quita la clase "abierto" que en el dashboard.css saca el menu hacia afuera con una pequeña animacion.
   *
   * @param {boolean} abrir - Se usa un booleano para abrir o cerrar el menu.
   */
  function abrirMenu(abrir) {
    //agrega o quita la clase segun el estado booleano
    sidebar.classList.toggle('abierto', abrir);
    //aplica el atributo que inidica que el menu esta abierto
    menuBtn?.setAttribute('aria-expanded', String(abrir));
  }

  /**
   * Boton para limpiar el texto del campo
   */
  btnLimpiarTexto?.addEventListener('click', (e)=> {
    textareaTexto.value = '';
  });

  /**
   * Boton de desplegar o cerrar el menu
   */
  menuBtn?.addEventListener('click', (e) => {
    //evita que el click llegue a "document"
    e.stopPropagation();
    //agrega o quita la clase "abierto"
    abrirMenu(!sidebar.classList.contains('abierto'));
  });

  /**
   * Se le agrega un escuchador de eventos al documento para que al darle click se cierre el sidebar del menu
   */
  document.addEventListener('click', (e) => {
    //si el sidebar esta abierto lo cierra
    if (sidebar && sidebar.classList.contains('abierto') && !sidebar.contains(e.target) && !menuBtn?.contains(e.target)) {
      abrirMenu(false);
    }
  });

  /**
   * Boton "Cerrar sesion" del sidebar
   * 
   * Remueve el token y la informacion del usuario del localStorage
   * Borra las preferencias aplicadas al navegador
   * Redirige el usuario a la pagina de inicio
   */
  navLogout?.addEventListener('click', (e) => {
    //evita que el navegador cargue por su cuenta
    e.preventDefault();
    localStorage.removeItem('adaptiweb_token');
    localStorage.removeItem('adaptiweb_usuario');
    window.AdaptiPrefs?.borrarCache(); // para que otra persona en este navegador no vea tus preferencias
    window.location.href = 'Inicio.html';
  });

  /**
   * Boton "Lista de tareas" del sidebar
   * 
   * Oculta el sidebar del menu
   * Redirige al usuario a la pagina de Lista de tareas
   */
  navTasks?.addEventListener('click', (e) => {
    //evita que el navegador cargue por su cuenta
    e.preventDefault();
    abrirMenu(false);
    window.location.href = 'tareas.html';
  });

  /**
   * Boton "Temporizador" del sidebar
   * 
   * Oculta el sidebar del menu
   * Redirige al usuario a la pagina Temporizador
   */
  navTimer?.addEventListener('click', (e) => {
    e.preventDefault();
    abrirMenu(false);
    window.location.href = 'temporizador.html';

  });

   /**
   * Toma la URL escrita en el campo, extrae su texto y abre el visor.
   *
   * Flujo:
   *   1. Valida que la URL no esté vacía y que tenga formato correcto.
   *   2. Bloquea el botón y el campo para evitar envíos repetidos.
   *   3. Si la URL termina en ".pdf": lee el PDF directamente en el navegador con pdf.js.
   *   4. Si es una página web, pide al servidor que extraiga el texto limpio.
   *   5. Guarda el texto en sessionStorage y redirige a visor.html.
   *   6. Siempre (haya éxito o error) vuelve a habilitar el botón y el campo.
   *
   * @async
   * @returns {Promise<void>}
   */
  async function procesarUrl() {
    //url en el campo de url
    const url = inputUrl?.value.trim();
    //valida si se ingreso la url
    if (!url) {
      alert('Por favor ingresa una URL válida.');
      inputUrl?.focus();
      return;
    }

    //comprueba si la url es valida
    try {
      new URL(url); // Valida formato http:// o https://
    } catch {
      alert('La URL ingresada no es válida. Debe incluir http:// o https://');
      inputUrl?.focus();
      return;
    }

    //Bloquea el boton de enviar la url y el campo de url
    if (btnEnviarUrl) btnEnviarUrl.disabled = true;
    if (inputUrl) inputUrl.disabled = true;

    /* 
    * Validación en caso de ser pdf
    * 
    * Valida si la dirección termina en ".pdf".
    */
    try {
      //split('?')[0] ignora los parámetros de la URL, lo que va después del "?"
      if (url.toLowerCase().split('?')[0].endsWith('.pdf') && window.pdfjsLib) {
        try {
          // se define donde esta el worker que lee el pdf.
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          // descarga el pdf
          const pdf = await window.pdfjsLib.getDocument(url).promise;
          //texto del visor
          let textoCompleto = '';
          //en caso de ser un libro muy largo, limita el numero de paginas
          const maxPaginas = Math.min(pdf.numPages, 60); // Evita saturar la memoria en libros muy largos
          // recorre cada pagina del documento, extrae el texto, los une y estos quedan en textoCompleto
          for (let i = 1; i <= maxPaginas; i++) {
            const pagina = await pdf.getPage(i);
            const contenido = await pagina.getTextContent();
            //une los fragmentos de texto con espacios
            const textoPagina = contenido.items.map((item) => item.str).join(' ');
            textoCompleto += textoPagina + '\n\n';
          }
          //Si textoCompleto es vacio, quiere decir que el pdf no contiene texto extraible, por lo que puede ser a base de imagenes
          if (!textoCompleto.trim()) {
            //muestra el recuadro de información
            alert('El PDF no contiene texto seleccionable.');
            return;
          }
          //almacena en el localStorage el texto en 'adatiweb_contenido' con un maximo de 150000 caracteres
          sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
            tipo: 'url',
            valor: textoCompleto.trim().slice(0, 150000)
          }));
          //Redirige el usuario al visor de la pagina
          window.location.href = 'visor.html';
          return;
        } catch (errPdf) {
          //Si falla entonces es porque el pdf es bloqueado por la pagina
          console.error('Error leyendo PDF en navegador:', errPdf);
          alert('Este servidor de PDF bloquea la lectura externa (CORS). Prueba descargando el texto o usando una URL web.');
          return;
        }
      }
      /* 
      * Validación en caso de ser una pagina normal
      * 
      * Envia una petición al servidor para que extraiga el contenido de la página
      * El token va en el encabezado para identificar el usuario
      */
      const respuesta = await fetch('/api/texto/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tipo: 'url', valor: url })
      });
      //respuesta del servidor
      const datos = await respuesta.json();
      // Error 401: el token no es valido o ya vencio, vacea el localStorage y redirige al usuario a la pagina de inicio
      if (respuesta.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }
      // en caso de otro error se muestra en una ventana emergente
      if (!respuesta.ok) {
        alert(datos.message || 'No se pudo extraer el texto de la URL ingresada.');
        inputUrl?.focus();
        return;
      }

      // Guarda el texto extraído para que visor.html lo muestre con las preferencias del usuario
      sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
        tipo: 'url',
        valor: datos.texto || ''
      }));
      // Redirige al usuario a la pagina de inicio
      window.location.href = 'visor.html';
    } catch (error) {
      //Error de red o servidor
      console.error('Error al extraer texto de la URL:', error);
      alert('Error de conexión con el servidor al intentar leer la URL. Inténtalo de nuevo.');
    } finally {
      // al final vuelve a habilitar los botones de envio de url y el campo de texto de la url
      if (btnEnviarUrl) btnEnviarUrl.disabled = false;
      if (inputUrl) inputUrl.disabled = false;
    }
  }
  /**
   * Boton enviar url
   * 
   * Se le agrega la funcion procesarUrl() al darle click
   */
  btnEnviarUrl?.addEventListener('click', procesarUrl);
  /**
   * Campi de texto URL
   * 
   * Cuando se detecte el evento de tecla 'ENTER' se llama la funcion procesarUrl()
   */
  inputUrl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      procesarUrl();
    }
  });

  /**
   * Función para abrir el modulo de eliminar la cuenta
   * 
   * Cierra el menu en caso de estar abierto
   * Oculta errorEliminar en caso de estar activo
   * Muestra el modulo de eliminar la cuenta
   */
  function abrirModuloEliminar() {
    abrirMenu(false);
    errorEliminar.classList.add('hidden');
    moduloEliminarCuenta.classList.remove('hidden');
    btnCancelarEliminar.focus(); 
  }

  /**
   * Funcion para cerrar el modulo de eliminar la cuenta
   * 
   * Si ya esta cerrado o el boton esta desabilitado mientras se carga una petición no hace nada
   * En otro caso entonces se oculta el boton y se da el foco al boton anterior de eliminar cuenta
   * @returns {void}
   */
  function cerrarModuloEliminar() {
    if (moduloEliminarCuenta.classList.contains('hidden') || btnConfirmarEliminar.disabled) return;
    moduloEliminarCuenta.classList.add('hidden');
    btnEliminarCuenta?.focus();
  }

  //se agrega la funcion abrirModuloEliminar al dar click
  btnEliminarCuenta?.addEventListener('click', abrirModuloEliminar);
  //se agrega la funcion cerrarModuloEliminar al dar click
  btnCancelarEliminar?.addEventListener('click', cerrarModuloEliminar);
  moduloEliminarCuenta?.addEventListener('click', (e) => {
    if (e.target === moduloEliminarCuenta) cerrarModuloEliminar();
  });
  /**
   * Boton para confirmar la eliminación de la cuenta
   * 
   * Desabilita los botones de confirmar y cancelar
   * Envia una petición al servidor con el token del usuario
   * Vacean los datos de usuario de la localStorage
   */
  btnConfirmarEliminar?.addEventListener('click', async () => {
    btnConfirmarEliminar.disabled = true;
    btnCancelarEliminar.disabled = true;
    errorEliminar.classList.add('hidden');
    // Envia la petición al servidor
    try {
      const respuesta = await fetch('/api/cuenta', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      // 401: la sesión ya no era válida; 404: la cuenta ya no existía
      if (!respuesta.ok && respuesta.status !== 404 && respuesta.status !== 401) {
        //mensaje de error
        const datos = await respuesta.json().catch(() => ({}));
        throw new Error(datos.message || 'No se pudo eliminar la cuenta.');
      }

      // Limpia la localStorage del usuario, las preferencias y el contenido almacenado del visor
      localStorage.removeItem('adaptiweb_token');
      localStorage.removeItem('adaptiweb_usuario');
      window.AdaptiPrefs?.borrarCache();
      sessionStorage.removeItem('adaptiweb_contenido');

      // Redirige al usuario al inicio y marca la sesion como cuenta eliminada
      sessionStorage.setItem('adaptiweb_cuenta_eliminada', '1');
      window.location.href = 'Inicio.html';
    } catch (error) {
      //muestra los mensajes de error y vuelve a habilitar los botones
      errorEliminar.textContent = error.message || 'Error de conexión con el servidor. Inténtalo de nuevo.';
      errorEliminar.classList.remove('hidden');
      btnConfirmarEliminar.disabled = false;
      btnCancelarEliminar.disabled = false;
    }
  });

  /**
   * Boton para abrir el visor
   * 
   * Toma el texto escrito
   * Hace una petición al servidor para que procese el texto a mostrar en el visor
   */
  btnAbrirVisor?.addEventListener('click', async () => {
    // Toma el texto escrito
    const texto = textareaTexto ? textareaTexto.value : '';
    //desabilita el boton de abrir visor
    if (btnAbrirVisor) btnAbrirVisor.disabled = true;
    // Envia la petición al servidor con el token de usuario
    try {
      const respuesta = await fetch('/api/texto/procesar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tipo: 'texto', valor: texto })
      });
      // Respuesta del servidor
      const datos = await respuesta.json();
      // Error 401: el token ya vencio
      if (respuesta.status === 401) {
        //limpia los datos del localStorage del usuario y lo manda a la pagina de inicio
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }
      //si hubo respuesta del servidor pone el texto extraido, en caso de que falle deja el texto anterior
      const textoFinal = respuesta.ok && typeof datos.texto === 'string' ? datos.texto : texto;
      //almacena el texto en la sessionStorage
      sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
        tipo: 'texto',
        valor: textoFinal
      }));
      //Redirige el usuario al visor
      window.location.href = 'visor.html';
    } catch {
      //En caso de error guarda en la sessionStorage el texto anterior
      sessionStorage.setItem('adaptiweb_contenido', JSON.stringify({
        tipo: 'texto',
        valor: texto
      }));
      window.location.href = 'visor.html';
    } finally {
      //Habilita el boton de abrir visor
      if (btnAbrirVisor) btnAbrirVisor.disabled = false;
    }
  });
  // Si el usuario viene desde marcador, toma directamente la url almacenada en la sessionStorage
  const urlMarcador = sessionStorage.getItem('adaptiweb_url_marcador');
  // Cuando carga la url en el campo de url, elimina la url del marcador en la sessionStorage
  if (urlMarcador) {
    sessionStorage.removeItem('adaptiweb_url_marcador');
    const inputUrl = document.querySelector('.input-search');
    const btnEnviarUrl = document.querySelector('.send-btn');
    // Ejecuta un evento click en el marcador
    if (inputUrl && btnEnviarUrl) {
      inputUrl.value = urlMarcador;
      btnEnviarUrl.click();
    }
  }
});
