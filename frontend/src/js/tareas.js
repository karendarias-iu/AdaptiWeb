/**
 * ============================================================================
 * tareas.js - Gestión de lista de tareas y recordatorios en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica que el usuario tenga una sesión activa (si no, redirige a Inicio.html).
 *   2. Sincroniza las preferencias visuales del usuario desde el servidor.
 *   3. Consulta y renderiza las tareas del usuario ordenadas (pendientes primero, luego por fecha).
 *   4. Permite crear nuevas tareas mediante un diálogo modal (<dialog>).
 *   5. Permite inspeccionar el detalle de una tarea, programar o eliminar su recordatorio
 *      (solicitando permisos de notificación al navegador), marcarla como finalizada
 *      y eliminarla definitivamente una vez completada.
 *
 * Dependencias:
 *   - tema.js          -> usa window.AdaptiPrefs (sincronización de tema y preferencias).
 *   - recordatorios.js -> usa window.AdaptiRecordatorios (pedirPermiso y revisarAhora).
 *   - Backend          -> endpoints GET, POST, PATCH y DELETE en /api/tareas.
 *
 * Datos que usa del navegador:
 *   - localStorage: lee 'adaptiweb_token' y 'adaptiweb_usuario' para autenticar peticiones.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 * @requires tema.js (window.AdaptiPrefs)
 * @requires recordatorios.js (window.AdaptiRecordatorios)
 */
document.addEventListener('DOMContentLoaded', () => {
  /**
   * Elementos de la página
   * 
   * grid: contenedor de lista (<ul>) donde se dibujan las tarjetas de tareas y el botón de crear
   * estado: región de texto accesible donde se anuncian mensajes de carga, éxito o vacío
   * modalCrear: elemento <dialog> con el formulario para registrar una nueva tarea
   * formCrear: formulario de creación de tarea
   * crearTitulo: campo de texto para el título de la nueva tarea
   * crearDescripcion: campo de texto para la descripción opcional de la nueva tarea
   * crearFecha: campo datetime-local para la fecha y hora límite de la nueva tarea
   * crearError: contenedor donde se muestran errores de validación al crear una tarea
   * btnCrear: botón de envío del formulario de creación
   * modalDetalle: elemento <dialog> que muestra la información y acciones de la tarea seleccionada
   * detalleTitulo: título de la tarea abierta en el modal de detalle
   * detalleDescripcion: descripción de la tarea abierta en el modal de detalle
   * detalleFecha: fecha y hora límite formateada de la tarea abierta
   * formRecordatorio: formulario dentro del detalle para programar o quitar un recordatorio
   * detalleRecordatorio: campo datetime-local para elegir la fecha/hora del recordatorio
   * detalleRecordatorioInfo: texto informativo sobre el estado actual del recordatorio
   * btnRecordatorio: botón para guardar los cambios del recordatorio
   * detalleError: contenedor para mostrar mensajes de error dentro del modal de detalle
   * btnFinalizar: botón para marcar la tarea pendiente como finalizada
   * btnEliminar: botón para eliminar la tarea (habilitado solo cuando ya está finalizada)
   */
  const grid = document.getElementById('tareas-grid');
  const estado = document.getElementById('tareas-estado');
  const moduloCrear = document.getElementById('modal-crear');
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

  /**
   * Constantes y variables
   * 
   * token: token JWT del usuario almacenado en el localStorage
   * usuarioGuardado: datos del usuario almacenados en el localStorage
   * tareas: arreglo en memoria con las tareas cargadas desde la base de datos
   * idAbierta: ID numérico de la tarea que se está visualizando actualmente en modalDetalle (o null)
   */
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');
  // Verifica si el usuario tiene sesión activa, si no lo redirige al inicio
  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  // Sincroniza las preferencias guardadas (contraste, etc.) con este navegador
  window.AdaptiPrefs?.cargarDesdeServidor(token).catch(() => {});

  let tareas = [];
  let idAbierta = null;

  /**
   * Función auxiliar para realizar peticiones HTTP autenticadas al backend de tareas
   * 
   * Envía el token Bearer, parsea la respuesta JSON y gestiona automáticamente la expiración de sesión (401) o errores del servidor
   * @async
   * @param {string} ruta - Subruta relativa a `/api/tareas` (ej. `''`, `'/5/completar'`)
   * @param {Object} [opciones] - Configuración de la petición
   * @param {string} [opciones.method='GET'] - Método HTTP (GET, POST, PATCH, DELETE)
   * @param {Object} [opciones.body] - Cuerpo de datos a serializar en JSON
   * @returns {Promise<Object>} Datos JSON devueltos por el servidor
   */
  async function api(ruta, { method = 'GET', body } = {}) {
    //respuesta del servidor
    const respuesta = await fetch(`/api/tareas${ruta}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    //datos de las tareas
    let datos = {};
    try {
      datos = await respuesta.json();
    } catch {
      // respuesta sin cuerpo JSON
    }
    //Token vencido
    if (respuesta.status === 401) {
      localStorage.removeItem('adaptiweb_token');
      localStorage.removeItem('adaptiweb_usuario');
      window.location.href = 'Inicio.html';
      throw new Error('Sesión expirada.');
    }
    if (!respuesta.ok) throw new Error(datos.message || 'No se pudo completar la acción.');
    return datos;
  }

  /**
   * Función que formatea una fecha ISO a formato legible local
   * 
   * @param {string} iso - Cadena de fecha en formato ISO
   * @returns {string} Fecha formateada en estilo colombiano (DD/MM/AAAA, HH:MM) o '' si es inválida
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
   * Recorta una cadena ISO al formato compatible con `<input type="datetime-local">` (YYYY-MM-DDTHH:MM)
   * @param {string|null} iso - Fecha en formato ISO
   * @returns {string} Cadena compatible con input datetime-local o ''
   */
  const aValorInput = (iso) => (iso ? iso.slice(0, 16) : '');

  /**
   * Función que obtiene la fecha y hora local actual formateada hasta el minuto
   * 
   * Se usa como atributo `min` en los campos `datetime-local` para evitar fechas pasadas
   * @returns {string} Fecha/hora actual en formato YYYY-MM-DDTHH:MM
   */
  function ahoraParaInput() {
    //fecha actual
    const d = new Date();
    d.setSeconds(0, 0);
    const dos = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }

  /**
   * Función que actualiza el mensaje de estado accesible de la pantalla
   * 
   * @param {string} mensaje - Texto informativo a mostrar
   * @returns {void}
   */
  function avisar(mensaje) {
    estado.textContent = mensaje;
  }

  /**
   * Función que ordena en sitio el arreglo `tareas`
   * 
   * Prioriza primero las tareas pendientes sobre las completadas, luego ordena cronológicamente por fecha de finalización y finalmente por ID ascendente
   * @returns {void}
   */
  function ordenar() {
    //ordena las tareas
    tareas.sort((a, b) =>
      Number(a.completada) - Number(b.completada) ||
      String(a.fecha_tarea).localeCompare(String(b.fecha_tarea)) ||
      a.id_tarea - b.id_tarea
    );
  }

  /**
   * Función que renderiza la cuadrícula completa de tareas en el DOM
   * 
   * Dibuja una tarjeta por cada tarea (indicando si está finalizada) y añade
   * al final el botón "+ Crear tarea"
   * @returns {void}
   */
  function render() {
    grid.replaceChildren();

    //recorre cada tarea
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
      //si esta completa la marca como completada dentro del modulo
      if (tarea.completada) {
        const marca = document.createElement('span');
        marca.className = 'tarea-marca';
        marca.textContent = '✓ Finalizada';
        tarjeta.appendChild(marca);
      }

      item.appendChild(tarjeta);
      grid.appendChild(item);
    });

    //Crea la tarea
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

  /**
   * Función asíncrona que obtiene las tareas del usuario desde el backend
   * 
   * Renderiza inicialmente la cuadrícula vacía, consulta `/api/tareas`
   * y actualiza la vista y los avisos de estado según el resultado
   * @async
   * @returns {Promise<void>}
   */
  async function cargarTareas() {
    avisar('Cargando tareas…');
    //Muestra mientras carga el "Crear tarea"
    render();
    //lista de tareas traidas de servidor
    try {
      const datos = await api('');
      tareas = datos.tareas || [];
      render();
      avisar(tareas.length ? '' : 'Aún no tienes tareas. Usa «Crear tarea» para añadir la primera.');
    } catch (error) {
      avisar(error.message === 'Sesión expirada.' ? '' : 'No se pudieron cargar tus tareas. Inténtalo de nuevo más tarde.');
    }
  }

  /**
   * Función que prepara y abre el diálogo del modulo de creación de tareas
   * 
   * @returns {void}
   */
  function abrirCrear() {
    formCrear.reset();
    crearError.textContent = '';
    moduloCrear.showModal();
    crearTitulo.focus();
  }

  /**
   * Formulario de creación de nueva tarea
   * 
   * Valida que título y fecha estén diligenciados, envía POST /api/tareas,
   * inserta la tarea en la lista ordenada, cierra el modal y enfoca la nueva tarjeta
   */
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
      moduloCrear.close();
      avisar('Tarea creada con éxito.');
      grid.querySelector(`[data-id="${datos.tarea.id_tarea}"]`)?.focus();
    } catch (error) {
      crearError.textContent = error.message;
    } finally {
      btnCrear.disabled = false;
    }
  });

  /**
   * Busca una tarea en el arreglo local por su ID
   * @param {number} id - Identificador de la tarea
   * @returns {Object|undefined} Objeto de la tarea encontrada
   */
  function buscar(id) {
    return tareas.find((t) => t.id_tarea === id);
  }

  /**
   * Función que rellena y actualiza los controles del modal de detalle
   * 
   * Muestra título, descripción, fecha, estado del recordatorio y habilita o deshabilita
   * los botones de acción según si la tarea ya está finalizada
   * @returns {void}
   */
  function pintarDetalle() {
    const tarea = buscar(idAbierta);
    if (!tarea) return;
    //rellena el modulo de detalle
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

  /**
   * Función que abre el modal de detalle para una tarea específica
   * 
   * @param {number} id - ID de la tarea seleccionada
   * @returns {void}
   */
  function abrirDetalle(id) {
    idAbierta = id;
    pintarDetalle();
    modalDetalle.showModal();
  }

  /**
   * Evento click en botón finalizar tarea
   * 
   * Marca la tarea como completada en el servidor (PATCH), reordena la cuadrícula
   * y actualiza el modal habilitando el botón de eliminar
   */
  btnFinalizar.addEventListener('click', async () => {
    btnFinalizar.disabled = true;
    detalleError.textContent = '';
    //petición al servidor
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
  /**
   * Evento click en botón eliminar tarea
   * 
   * Elimina permanentemente una tarea finalizada mediante DELETE y devuelve el foco
   * al botón de crear tarea por accesibilidad
   */
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

  /**
   * Formulario de programación o eliminación de recordatorio
   * 
   * Valida que la fecha sea futura, solicita permiso de notificaciones al navegador,
   * guarda el recordatorio en el servidor (PATCH) y dispara una revisión inmediata
   */
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

  // Limpia el ID activo al cerrar el modal de detalle y devuelve el foco a su tarjeta
  modalDetalle.addEventListener('close', () => {
    const id = idAbierta;
    idAbierta = null;
    if (id) grid.querySelector(`[data-id="${id}"]`)?.focus();
  });

  // Delegación de eventos click sobre la cuadrícula de tareas
  grid.addEventListener('click', (e) => {
    const tarjeta = e.target.closest('.tarea-card');
    if (!tarjeta) return;
    if (tarjeta.id === 'tarjeta-crear') abrirCrear();
    else abrirDetalle(Number(tarjeta.dataset.id));
  });

  [moduloCrear, modalDetalle].forEach((modal) => {
    // Botón "Salir"
    modal.querySelector('[data-cerrar]').addEventListener('click', () => modal.close());
    // Clic en el fondo oscuro
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  });

  cargarTareas();
});
