/**
 * ============================================================================
 * marcadores.js - Gestión de marcadores y favoritos en AdaptiWeb
 * ============================================================================
 *
 * ¿Qué hace?
 *   1. Verifica que el usuario tenga una sesión activa (si no, redirige a Inicio.html).
 *   2. Carga los marcadores desde el localStorage y de la base de datos.
 *   3. Ordena los marcadores, siendo los favoritos en la parte superior.
 *   4. Permite crear marcadores, añadir o quitar de favoritos, y eliminarlos
 *   5. Permite abrir el marcador seleccionado redirigiendo al dashboard con la URL contenida
 *
 * Dependencias:
 *   - Backend -> endpoints GET, POST, PATCH y DELETE en /api/marcadores.
 *
 * Datos que usa del navegador:
 *   - localStorage: token, usuario y caché de marcadores por usuario.
 *   - sessionStorage: guarda 'adaptiweb_url_marcador' al abrir un enlace.
 *
 * @version 1.0.0
 * @author John Ever Arredondo Raigosa
 */

document.addEventListener('DOMContentLoaded', async () => {

  /**
   * Elementos de la pagina
   * 
   * listaMarcadores: contenedor de las listas de marcadores
   * moduloDetalle: modulo de los detalles del marcador
   * detalleTitulo: titulo del detalle de los marcadores
   * detalleUrl: link de la url guardada en el marcador
   * btnCerrarDetalle: boton para cerrar los detalles del marcador
   * btnToggleFavorito: boton que alterna el estado del marcador (favorito/no favorito)
   * btnEliminarMarcador: boton que elimina el marcador actual
   * btnAbrirMarcador: boton que redirige al usuario al dashboard con la URL puesta en la sessionStorage, esta la recarga y abre el visor
   * moduloCrear: modulo para la creación del marcador
   * btnCerrarCrear: boton para cerrar el modulo de creación del marcador
   * formCrear: formulario para la creación del marcador (nombre y URL)
   * inputTitulo: entrada de texto de titulo de marcador en el formulario
   * inputUrl: entrada de texto de url del marcador en el formulario
   * inputFavorito: casilla para marcar el marcador como favorito
   */

  const listaMarcadores = document.getElementById('lista-marcadores');
  const moduloDetalle = document.getElementById('modal-detalle');
  const detalleTitulo = document.getElementById('detalle-titulo');
  const detalleUrl = document.getElementById('detalle-url');
  const btnCerrarDetalle = document.getElementById('btn-cerrar-detalle');
  const btnToggleFavorito = document.getElementById('btn-toggle-favorito');
  const btnEliminarMarcador = document.getElementById('btn-eliminar-marcador');
  const btnAbrirMarcador = document.getElementById('btn-abrir-marcador');
  const moduloCrear = document.getElementById('modal-crear');
  const btnCerrarCrear = document.getElementById('btn-cerrar-crear');
  const formCrear = document.getElementById('form-crear-marcador');
  const inputTitulo = document.getElementById('input-titulo-marcador');
  const inputUrl = document.getElementById('input-url-marcador');
  const inputFavorito = document.getElementById('input-favorito-marcador');
  
  /**
   * Constantes y variables
   * 
   * token: token del usuario en el localStorage
   * usuarioGuardado: información del usuario en el localStorage
   * usuario: Datos parseados del usuario (correo, nombre)
   * STORAGE_KEY: llave unica para identificar los marcadores de cada cuenta
   * marcadores: lista de los marcadores que tiene el usuario
   * marcadorSeleccionado: marcador abierto en el modulo
   */
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');

  //Verifica si el usuario tiene sesion activa, si no lo devuelve al inicio
  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  const usuario = JSON.parse(usuarioGuardado);
  const STORAGE_KEY = `adaptiweb_marcadores_${usuario.id || usuario.correo || 'default'}`;

  let marcadores = [];
  let marcadorSeleccionado = null;

  /**
   * Funcion que lee el cache (localStorage)
   * 
   * Lee la lista de marcadores del usuario almacenadas en el localStorage
   * @returns {Array<Object>}
   */
  function leerCacheLocal() {
    try {
      //lee los valores guardados bajo la llave STORAGE_KEY y devuelve una lista con los valores
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Funcion para guardar en el cache (localStorage)
   * 
   * Guarda la STORAGE_KEY en el localStorage
   * @param {Array<Object>} lista lista de marcadores
   * @returns {void} 
   */
  function guardarCacheLocal(lista) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    } catch {
      // Ignorar si el almacenamiento está lleno
    }
  }

  /**
   * Función para ordenar los marcadores
   * 
   * Los favoritos siempre van en las primeras posiciones
   * @param {Array<Object>} lista lista desordenada de marcadores
   * @returns {Array<Object>} lista ordenada de marcadores
   */
  function ordenarMarcadores(lista) {
    return [...lista].sort((a, b) => Number(Boolean(b.favorito)) - Number(Boolean(a.favorito)));
  }

  /**
   * Función que extrae el dominio limpio de la URL
   * 
   * Trae el dominio principal limpio de una URL (eliminando protocolo y 'www.')
   * @param {string} urlStr Dirección URL completa
   * @returns {string} Nombre de dominio limpio o la cadena original si no es parseable
   */
  function extraerDominio(urlStr) {
    try {
      return new URL(urlStr).hostname.replace(/^www\./, '');
    } catch {
      return urlStr;
    }
  }

  /**
   * Función que carga los marcadores
   * 
   * Primero hace uso de los marcadores en el localStorage
   * Despues consulta a `/api/marcadores` para sincronizarlos con la base de datos
   *
   * @async
   * @returns {Promise<void>}
   */
  async function cargarMarcadores() {
    //carga la lista desde la localStorage
    marcadores = ordenarMarcadores(leerCacheLocal());
    //la dibuja en los elementos de la página
    renderizarLista();
    //Envia petición al servidor con el token de usuario
    try {
      const resp = await fetch('/api/marcadores', {
        headers: { Authorization: `Bearer ${token}` }
      });
      //Si la sesión expiro o no es válido el token vacea la localStorage y redirige el usuario al inicio
      if (resp.status === 401) {
        localStorage.removeItem('adaptiweb_token');
        localStorage.removeItem('adaptiweb_usuario');
        window.location.href = 'Inicio.html';
        return;
      }
      //Si el servidor hizo la conexión
      if (resp.ok) {
        //respuesta del servidor
        const datos = await resp.json();
        //ordena los marcadores desde la base de datos, los guarda en la localStorage y los renderiza
        if (Array.isArray(datos)) {
          marcadores = ordenarMarcadores(datos);
          guardarCacheLocal(marcadores);
          renderizarLista();
        }
      }
    } catch {
      // Si no se pudo hacer conexión, se dejan los marcadores locales del usuario
    }
  }

  /**
   * Función que dibuja la lista de marcadores ordenados
   * 
   * Añade un icono de estrella a los favoritos
   * Añade el botón "+ Crear marcador" al final
   * @returns {void}
   */
  function renderizarLista() {
    //Si no hay lista no hace nada
    if (!listaMarcadores) return;
    listaMarcadores.innerHTML = '';
    //ordena los marcadores
    const ordenados = ordenarMarcadores(marcadores);
    //recorre cada marcador
    ordenados.forEach((item) => {
      //Crea el boton de añadir a favoritos
      const fila = document.createElement('button');
      fila.type = 'button';
      fila.className = `marcador-item${item.favorito ? ' favorito' : ''}`;
      fila.setAttribute('role', 'listitem');
      //Crea el elemento para mostrar información del marcador
      const info = document.createElement('span');
      info.className = 'marcador-info';
      //Si esta en favoritos le añade una estrella
      if (item.favorito) {
        const estrella = document.createElement('span');
        estrella.className = 'marcador-estrella';
        estrella.textContent = '★';
        estrella.setAttribute('aria-label', 'Favorito');
        info.appendChild(estrella);
      }
      //Titulo del marcador
      const tituloSpan = document.createElement('span');
      tituloSpan.className = 'marcador-titulo';
      tituloSpan.textContent = item.titulo;
      info.appendChild(tituloSpan);
      //Dominio procesado
      const dominioSpan = document.createElement('span');
      dominioSpan.className = 'marcador-dominio';
      dominioSpan.textContent = extraerDominio(item.url);
      //agrega los elementos
      fila.appendChild(info);
      fila.appendChild(dominioSpan);
      fila.addEventListener('click', () => abrirModuloDetalle(item));
      listaMarcadores.appendChild(fila);
    });

    //Crea el botón "Crear marcador" al final
    const btnCrear = document.createElement('button');
    btnCrear.type = 'button';
    btnCrear.className = 'marcador-item marcador-crear';
    btnCrear.textContent = '+ Crear marcador';
    btnCrear.addEventListener('click', abrirModalCrear);
    listaMarcadores.appendChild(btnCrear);
  }

  /**
   * Función de actualizar el boton cuando se pone o no en favoritos
   * 
   * Actualiza la apariencia, atributos y texto del botón de favoritos Dentro del modulo de marcadores
   * @param {boolean} esFavorito Estado actual de favorito del marcador.
   * @returns {void}
   */
  function actualizarBotonFavoritoModal(esFavorito) {
    if (!btnToggleFavorito) return;
    btnToggleFavorito.classList.toggle('activo', Boolean(esFavorito));
    btnToggleFavorito.setAttribute('aria-pressed', String(Boolean(esFavorito)));
    btnToggleFavorito.textContent = esFavorito ? '★ En favoritos' : '☆ Añadir a favoritos';
  }

  /**
   * Función para abrir el modulo de detalles del marcador
   * 
   * Abre el modulo de detalle mostrando los datos del marcador seleccionado
   * @param {{id: string|number, titulo: string, url: string, favorito: boolean}} item - Marcador a inspeccionar.
   * @returns {void}
   */
  function abrirModuloDetalle(item) {
    //completa los atributos
    marcadorSeleccionado = item;
    if (detalleTitulo) detalleTitulo.textContent = item.titulo;
    if (detalleUrl) {
      detalleUrl.textContent = item.url;
      detalleUrl.href = item.url;
    }
    //define si esta en favoritos o no y muestra el módulo de detalles
    actualizarBotonFavoritoModal(item.favorito);
    moduloDetalle?.classList.remove('hidden');
  }

  /**
   * Función que cierra el modulo de detalles del marcador
   * 
   * Cierra el modulo de detalle y limpia la referencia al marcador activo
   * @returns {void}
   */
  function cerrarModuloDetalle() {
    marcadorSeleccionado = null;
    moduloDetalle?.classList.add('hidden');
  }

  /**
   * Función para abrir el módulo de creación de un nuevo marcador
   * 
   * Resetea el formulario
   * Abre el modulo para crear un nuevo marcador
   * @returns {void}
   */
  function abrirModalCrear() {
    formCrear?.reset();
    moduloCrear?.classList.remove('hidden');
    inputTitulo?.focus();
  }

  /**
   * Función que cierra el modulo de creación de marcadores
   * @returns {void}
   */
  function cerrarModuloCrear() {
    moduloCrear?.classList.add('hidden');
  }

  /**
   * Boton para abrir el marcador
   * 
   * Guarda la url del marcador en la sessionStorage
   * Redirige el usuario al dashboard y hace uso de esta para cargarlo en el visor
   */
  btnAbrirMarcador?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!marcadorSeleccionado || !marcadorSeleccionado.url) return;
    //Guarda la url en la sessionStorage
    sessionStorage.setItem('adaptiweb_url_marcador', marcadorSeleccionado.url);
    window.location.href = 'dashboard.html';
  });

  /**
   * Boton Alternar estado de favorito
   * 
   * Obtiene el marcador actual, le aplica los cambios si se le da en favoritos
   * Guarda los cambios en la localStorage
   * Envia una petición al servidor para que lo actualice en la base de datos
   */
  btnToggleFavorito?.addEventListener('click', async () => {
    if (!marcadorSeleccionado) return;
    //Aplica cambio de estado
    const nuevoEstado = !marcadorSeleccionado.favorito;
    const idActual = marcadorSeleccionado.id;
    //Obtiene el marcador actual
    marcadores = marcadores.map((m) =>
      String(m.id) === String(idActual) ? { ...m, favorito: nuevoEstado } : m
    );
    marcadorSeleccionado = { ...marcadorSeleccionado, favorito: nuevoEstado };
    //Guarda los cambios en la localStorage
    guardarCacheLocal(marcadores);
    actualizarBotonFavoritoModal(nuevoEstado);
    renderizarLista();
    //Envia petición al servidor con el token y el id del componente a modificar
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
      //Si no conecto los cambios quedan actualizados desde la localStorage
    }
  });

  /**
   * Botón para eliminar el marcador seleccionado
   * 
   * Obtiene el id del marcador
   * Lo elimina y guarda los cambios en el localStorage
   * Envia una petición al servidor y actualiza las tablas
   */
  btnEliminarMarcador?.addEventListener('click', async () => {
    if (!marcadorSeleccionado) return;
    //halla el id
    const idEliminar = marcadorSeleccionado.id;
    //Filtra los marcadores y guarda cambios locales
    marcadores = marcadores.filter((m) => String(m.id) !== String(idEliminar));
    guardarCacheLocal(marcadores);
    cerrarModuloDetalle();
    renderizarLista();
    //Envía una petición al servidor con el token y id del marcador
    try {
      await fetch(`/api/marcadores/${encodeURIComponent(idEliminar)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      //Quedo cargado desde localStorage
    }
  });

  /**
   * Formulario de creación del marcador
   * 
   * Hace validaciones
   * Guarda en localStorage
   * Guarda en las bases de datos
   */
  formCrear?.addEventListener('submit', async (e) => {
    e.preventDefault();
    //valores del formularios
    const titulo = inputTitulo?.value.trim() || '';
    const url = inputUrl?.value.trim() || '';
    const favorito = Boolean(inputFavorito?.checked);

    if (!titulo || !url) return;
    //Validación de la URL (valida)
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
    //Crea el marcador con un id haciendo uso de la fecha y hora actual
    const tempId = `local_${Date.now()}`;
    const nuevoMarcador = { id: tempId, titulo, url, favorito };
    //Ordena, guarda y carga en el localStorage el marcador
    marcadores = ordenarMarcadores([nuevoMarcador, ...marcadores]);
    guardarCacheLocal(marcadores);
    cerrarModuloCrear();
    renderizarLista();
    //Envia una petición al servidor con el token
    try {
      const resp = await fetch('/api/marcadores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ titulo, url, favorito })
      });
      //Si se creo lo guarda en el cache y en las bases
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
      //Queda guardado en la localStorage
    }
  });
  //Agregación de eventos
  btnCerrarDetalle?.addEventListener('click', cerrarModuloDetalle);
  btnCerrarCrear?.addEventListener('click', cerrarModuloCrear);
  //Cerrar el modulo al dar click en el
  moduloDetalle?.addEventListener('click', (e) => {
    if (e.target === moduloDetalle) cerrarModuloDetalle();
  });
  //Cerrar el modulo al dar click en crear modulo
  moduloCrear?.addEventListener('click', (e) => {
    if (e.target === moduloCrear) cerrarModuloCrear();
  });
  //al dar click en cualquier parte del documento mientres este desplegado un modulo lo cierra
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      cerrarModuloDetalle();
      cerrarModuloCrear();
    }
  });
  //Carga y actualiza los marcadores
  await cargarMarcadores();
});
