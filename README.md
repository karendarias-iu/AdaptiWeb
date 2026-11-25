# AdaptiWeb

AdaptiWeb es una plataforma web enfocada en la accesibilidad digital, la lectura inclusiva y la productividad personal.
Permite transformar contenidos textuales (ingresados manualmente o extraídos desde una página o PDF público desde su URL) para adaptarlos a las necesidades visuales y cognitivas de cada usuario, integrando:

- Síntesis de voz (*Text-to-Speech*)
- Temporizador Pomodoro (25 min)
- Gestión de marcadores favoritos (puedes acceder a ellos y eliminarlos cuando desees)
- Listas de tareas con recordatorios sincronizados (se pueden marcar como finalizadas y eliminarlas)
- Visor de texto personalizado (fuente, tamaño de fuente, espaciado entre letras y palabras, interlineado y contraste)

## Tabla de contenidos

1. [Características principales](#características-principales)
2. [Arquitectura y tecnologías](#arquitectura-y-tecnologías)
3. [Estructura del proyecto](#estructura-del-proyecto)
4. [Requisitos previos](#requisitos-previos)
5. [Instalación y configuración](#instalación-y-configuración)
6. [Variables de entorno](#variables-de-entorno)
7. [Base de datos y migraciones](#base-de-datos-y-migraciones)
8. [Manual de uso](#manual-de-uso)
9. [Referencia completa de la API REST](#referencia-completa-de-la-api-rest)
10. [Documentación técnica (JSDoc)](#documentación-técnica-jsdoc)
11. [Solución de problemas frecuentes](#solución-de-problemas-frecuentes)
12. [Autores](#autores)

## Características principales

- **Adaptación tipográfica y visual persistente:** Configuración personalizada por usuario de familia tipográfica (incluyendo fuentes optimizadas para dislexia y baja visión como *Lexend*, *Atkinson Hyperlegible* y *OpenDyslexic*), tamaño de letra, interlineado, espaciado entre caracteres, espaciado entre palabras y tema de contraste (claro / oscuro).
- **Visor de lectura inteligente:** Procesamiento y normalización de texto plano, y extracción automática del contenido principal de artículos web mediante URL (eliminando menús, anuncios y scripts).
- **Lector por voz (*Text-to-Speech*):** Reproducción auditiva del texto adaptado con selección de voz natural (femenino o masculino) y controles de reproducción.
- **Gestión de tareas y recordatorios:** Creación, edición, finalización y eliminación de tareas pendientes, con alertas programables en tiempo real sincronizadas con la zona horaria local del navegador.
- **Marcadores personales y favoritos:** Guardado de enlaces frecuentes con validación de protocolo (`http://` / `https://`) y sistema de fijado de favoritos.
- **Temporizador Pomodoro:** Intervalo de concentración de 25 min para sesiones de estudio o trabajo.
- **Seguridad y gestión de cuenta:** Autenticación *stateless* mediante JWT (*Bearer Token*), cifrado de contraseñas con `bcrypt`, recuperación de acceso mediante token temporal y eliminación atómica de la cuenta y todos sus registros asociados mediante transacciones SQL.

## Arquitectura y tecnologías

| Capa | Tecnologías utilizadas |
| :--- | :--- |
| **Frontend** | HTML5 semántico, CSS3 (variables dinámicas para accesibilidad), JavaScript Vanilla modular (ES6+) |
| **Backend** | Node.js, Express.js |
| **Base de datos** | MySQL 8.0+ (`mysql2/promise` con *Connection Pool*) |
| **Autenticación y Seguridad** | `jsonwebtoken` (JWT), `bcrypt`, `dotenv`, consultas parametrizadas (`?`) contra inyección SQL |
| **Servicios Externos** | API de ElevenLabs (síntesis de voz), extracción HTML (`fetch` / DOM parsing) |
| **Documentación** | Estándar JSDoc 4 |

## Estructura del proyecto

```text
AdaptiWeb/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── cuentaController.js        # Eliminación transaccional de cuenta y datos
│   │   │   ├── marcadoresController.js    # CRUD de marcadores y gestión de favoritos
│   │   │   ├── preferenciasController.js  # Lectura y guardado de ajustes de accesibilidad
│   │   │   ├── taskController.js          # CRUD de tareas y consulta de recordatorios
│   │   │   └── textoController.js         # Limpieza de texto y scraping limpio de URLs
│   │   ├── middleware/
│   │   │   └── authMiddleware.js          # Validación de tokens JWT en rutas protegidas
│   │   └── routes/
│   │       ├── cuentaRoutes.js            # Endpoints /api/cuenta
│   │       ├── marcadoresRoutes.js        # Endpoints /api/marcadores
│   │       ├── preferenciasRoutes.js      # Endpoints /api/preferencias
│   │       ├── taskRoutes.js              # Endpoints /api/tareas
│   │       └── textoRoutes.js             # Endpoints /api/texto
│   ├── db.js                              # Pool de conexiones reutilizables hacia MySQL
│   ├── package-lock.json                  # Versión exacta de dependencias del backend
│   ├── package.json                       # Dependencias y scripts NPM del backend
│   └── server.js                          # Configuración de Express, CORS, rutas y arranque
├── database/
│   ├── migraciones/
│   │   ├── migracion_marcadores.sql
│   │   ├── migracion_preferencias.sql
│   │   └── migracion_tareas.sql
│   └── schema.sql                         # Script DDL de creación de tablas y migraciones
├── docs/                                  # Documentación generada con JSDoc
├── frontend/
│   ├── public/
│   │   ├── assets/                        # Recursos gráficos y tipográficos (logo, fondo, alerta, fuente)
│   │   ├── dashboard.html                 # Vista principal del panel de usuario
│   │   ├── Inicio.html                    # Vista inicial / landing de la aplicación
│   │   ├── marcadores.html                # Vista de gestión de marcadores y favoritos
│   │   ├── panel_tareas.html              # Vista de panel de tareas
│   │   ├── preferencias.html              # Vista de ajustes de accesibilidad y pantalla
│   │   ├── reset-password.html            # Vista de recuperación / restablecimiento de contraseña
│   │   ├── tareas.html                    # Vista de administración de tareas
│   │   ├── temporizador.html              # Vista del temporizador (Pomodoro)
│   │   └── visor.html                     # Vista del visor de texto / contenido adaptado
│   └── src/
│       ├── css/
│       │   ├── dashboard.css              # Estilos del panel principal
│       │   ├── main.css                   # Estilos base / generales
│       │   ├── marcadores.css             # Estilos de marcadores
│       │   ├── preferencias.css           # Estilos de preferencias y accesibilidad
│       │   ├── resetPassword.css          # Estilos de recuperación de contraseña
│       │   ├── tareas.css                 # Estilos de tareas
│       │   ├── temporizador.css           # Estilos del temporizador
│       │   ├── textoAdaptado.css          # Estilos para el texto adaptado
│       │   └── visor.css                  # Estilos del visor
│       └── js/
│           ├── dashboard.js               # Lógica del panel principal
│           ├── mainInicio.js              # Lógica de la vista de inicio
│           ├── marcadores.js              # Gestión de marcadores en cliente
│           ├── preferenciasPantalla.js    # Aplicación y persistencia de preferencias visuales
│           ├── recordatorios.js           # Lógica de recordatorios
│           ├── resetPassword.js           # Flujo de restablecimiento de contraseña
│           ├── tareas.js                  # Gestión de tareas en cliente
│           ├── tema.js                    # Control de tema claro / oscuro
│           ├── timer.js                   # Lógica del temporizador
│           ├── tts.js                     # Síntesis de voz / lectura (Text-to-Speech)
│           └── visor.js                   # Lógica del visor y adaptación de contenido
├── .env                                   # Variables de entorno locales (no subir a Git)
├── .gitignore                             # Archivos y carpetas ignorados por Git
├── package-lock.json                      # Versión exacta de dependencias de la raíz
├── package.json                           # Dependencias y scripts NPM de la raíz
├── README.md                              # Documentación general del proyecto
└── vercel.json                            # Configuración de despliegue en Vercel
```

## Requisitos previos

Antes de instalar y ejecutar el proyecto localmente, asegúrate de contar con:

1. **Node.js** (versión 18.x o superior) y `npm`.
2. **MySQL Server** (versión 8.0 o superior) y un cliente como MySQL Workbench.
3. **Git** para clonar el repositorio.

## Instalación y configuración

1. **Clonar el repositorio:**

   ```bash
   git clone [https://github.com/TU_USUARIO/AdaptiWeb.git](https://github.com/TU_USUARIO/AdaptiWeb.git)
   cd AdaptiWeb
   ```

2. **Instalar dependencias:**

   ```bash
   cd backend
   npm install
   ```

3. **Configurar el archivo `.env`:**
   Crea un archivo llamado `.env` con los valores correspondientes a tu entorno local o de producción (consulta la sección [Variables de entorno](#variables-de-entorno)).

4. **Inicializar la base de datos:**
   Abre MySQL Workbench o tu terminal de MySQL y ejecuta `database/schema.sql` para crear la base de datos `adaptiweb` y sus tablas (`Usuarios`, `Preferencias`, `Pomodoro`, `Marcadores`, `Tareas`). Si actualizas una base ya existente, ejecuta los scripts en `database/migraciones/` (`migracion_marcadores.sql`, `migracion_preferencias.sql`, `migracion_tareas.sql`).

5. **Ejecutar el servidor:**

   ```bash
   node server.js
   ```
   *(Asegúrate de estar ubicado en la carpeta `backend` al ejecutar `node server.js`).*

## Variables de entorno

Crea el archivo `.env` tomando esta plantilla como referencia:

```env
# Configuración del servidor
PORT=3000

# Configuración de la base de datos MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contrasena_mysql
DB_NAME=adaptiweb

# Seguridad y autenticación JWT
JWT_SECRET=clave_secreta_larga_y_segura_para_adaptiweb

# Servicios externos (opcionales según módulos activos)
ELEVENLABS_API_KEY=tu_api_key_de_elevenlabs
EMAIL_USER=tu_correo_para_recuperacion@gmail.com
EMAIL_PASS=tu_contrasena_de_aplicacion
```

## Base de datos y migraciones

El modelo relacional de AdaptiWeb está diseñado bajo integridad referencial con borrado en cascada (`ON DELETE CASCADE`) vinculado a `Usuarios`:

- **Usuarios:** Almacena `id_usuario`, `nombre`, `correo` (`UNIQUE`), `contraseña` (hash `bcrypt`) y `condicion` (perfil de accesibilidad inicial).
- **Preferencias:** Relación 1:1 (`UNIQUE` por `id_usuario`) con `fuente`, `tamanio_fuente`, `interlineado`, `espacio_letras`, `espacio_palabras`, `contraste` y `fecha_actualizacion`.
- **Pomodoro:** Guarda la configuración de `minutos_trabajo`, `minutos_descanso` y estado por usuario.
- **Marcadores:** Almacena `titulo`, `url`, `favorito` (`0` o `1`), `texto_guardado` y `fecha_creacion`.
- **Tareas:** Gestiona `titulo`, `descripcion`, `fecha_tarea`, `recordatorio`, `recordatorio_notificado` (`0` o `1`), `estado` (`'Sin Terminar'` | `'Terminada'`) y `fecha_creacion`.

## Manual de uso

### 1. Registro e inicio de sesión

- Accede a la pantalla principal de AdaptiWeb.
- Si eres un usuario nuevo, selecciona **Registrarse** e ingresa tu nombre, correo electrónico y contraseña.
- Inicia sesión con tus credenciales; el sistema generará un token de sesión para mantener tus preferencias sincronizadas en cada pantalla.
- Si olvidas tu contraseña, utiliza **Recuperar contraseña** para recibir un enlace con token temporal de restablecimiento.

### 2. Personalización de accesibilidad visual

- Abre el panel de **Preferencias / Accesibilidad** en la barra de herramientas.
- Ajusta en tiempo real:
  - **Tipo de fuente:** Elige entre fuentes estándar o especializadas como *OpenDyslexic*, *Lexend* o *Atkinson Hyperlegible*.
  - **Tamaño de letra:** Incrementa o reduce el tamaño según tu comodidad visual.
  - **Espaciados:** Modifica el interlineado, espacio entre letras y espacio entre palabras para evitar fatiga visual.
  - **Contraste:** Alterna entre modo **Claro** y modo **Oscuro**.
- Haz clic en **Guardar preferencias** para almacenar tu perfil en la base de datos y aplicarlo automáticamente en futuros inicios de sesión.

### 3. Visor de lectura y extracción de texto

- Dirígete al **Visor de Lectura**.
- Carga contenido mediante **texto directo** (pegando o escribiendo en el área de entrada) o **desde una URL** (`https://...`) para extraer el contenido legible descartando menús o anuncios.
- Una vez cargado, el texto adoptará inmediatamente tu configuración visual guardada.

### 4. Lector por voz (*Text-to-Speech*)

- Con un texto cargado en el visor, ubica los controles de lectura en voz alta.
- Selecciona el perfil de voz deseado y utiliza **Reproducir**, **Pausar** o **Detener**.

### 5. Gestión de tareas y recordatorios

- Ingresa al módulo de **Tareas** y completa título, descripción, fecha límite y, opcionalmente, fecha y hora de recordatorio.
- Mientras mantengas la sesión abierta, el sistema verificará periódicamente los recordatorios vencidos y emitirá una alerta visual y sonora.
- Marca las tareas como **Completadas** y, una vez terminadas, podrás eliminarlas definitivamente si lo deseas.

### 6. Marcadores y enlaces favoritos

- Abre el panel de **Marcadores** y guarda sitios frecuentes con un título descriptivo y su URL completa (`https://...`).
- Usa el icono de estrella (**Favorito**) para fijar los enlaces más importantes en la parte superior de la lista.

### 7. Temporizador Pomodoro

- Accede al módulo **Pomodoro**, configura los minutos de trabajo concentrado (por defecto 25 min) y de descanso (5 min), e inicia el ciclo.

### 8. Eliminación de cuenta

- En la configuración de **Cuenta**, selecciona **Eliminar cuenta** y confirma la acción.
- El sistema ejecutará una transacción que eliminará permanentemente tu usuario, preferencias, tareas, marcadores y registros de Pomodoro.

## Referencia completa de la API REST

### Preferencias (`/api/preferencias`)

| Método | Endpoint | Descripción | Cuerpo (JSON) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/preferencias` | Devuelve las preferencias visuales del usuario autenticado. | *No requiere* |
| `PUT` | `/api/preferencias` | Valida y guarda los ajustes de accesibilidad. | `{ "fuente", "tamano_fuente", "interlineado", "espacio_letras", "espacio_palabras", "contraste" }` |

### Procesamiento de Texto (`/api/texto`)

| Método | Endpoint | Descripción | Cuerpo (JSON) |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/texto/procesar` | Limpia texto plano o extrae texto principal desde una URL externa. | `{ "texto": "..." }` o `{ "url": "https://..." }` |

### Marcadores (`/api/marcadores`)

| Método | Endpoint | Descripción | Cuerpo (JSON) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/marcadores` | Lista los marcadores del usuario (favoritos primero). | *No requiere* |
| `POST` | `/api/marcadores` | Crea un nuevo marcador validando título y URL. | `{ "titulo": "...", "url": "https://..." }` |
| `PATCH` | `/api/marcadores/:id/favorito` | Alterna el estado de favorito (`0` / `1`). | `{ "favorito": true }` *(opcional)* |
| `DELETE` | `/api/marcadores/:id` | Elimina un marcador específico del usuario. | *No requiere* |

### Tareas y Recordatorios (`/api/tareas`)

| Método | Endpoint | Descripción | Cuerpo (JSON) |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tareas` | Lista todas las tareas del usuario (pendientes primero). | *No requiere* |
| `GET` | `/api/tareas/recordatorios/pendientes` | Devuelve tareas pendientes cuyo recordatorio ya venció y no ha sido notificado. | *No requiere* |
| `POST` | `/api/tareas` | Crea una nueva tarea con recordatorio opcional. | `{ "titulo", "descripcion", "fecha_tarea", "recordatorio" }` |
| `PATCH` | `/api/tareas/:id/completar` | Alterna el estado entre `'Sin Terminar'` y `'Terminada'`. | *No requiere* |
| `PATCH` | `/api/tareas/:id/recordatorio` | Programa, actualiza o elimina (`null`) el recordatorio de una tarea. | `{ "recordatorio": "YYYY-MM-DD HH:mm:ss" }` |
| `PATCH` | `/api/tareas/:id/recordatorio-notificado` | Marca un recordatorio como ya avisado al usuario. | *No requiere* |
| `DELETE` | `/api/tareas/:id` | Elimina permanentemente una tarea que ya está marcada como `'Terminada'`. | *No requiere* |

### Cuenta (`/api/cuenta`)

| Método | Endpoint | Descripción | Cuerpo (JSON) |
| :--- | :--- | :--- | :--- |
| `DELETE` | `/api/cuenta` | Elimina de forma atómica la cuenta del usuario y todos sus datos asociados. | *No requiere* |

## Documentación técnica (JSDoc)

La documentación generada con JSDoc se encuentra en `docs/index.html`.

## Solución de problemas frecuentes

- **Error `net::ERR_NETWORK_CHANGED` en consola:** Ocurre cuando la red Wi-Fi o datos móviles cambia de interfaz justo en el segundo en que `recordatorios.js` consulta el servidor. No detiene la aplicación; el siguiente ciclo automático volverá a sincronizar con normalidad.
- **Los recordatorios no suenan a la hora esperada:** Verifica que la zona horaria del servidor MySQL coincida con tu hora local (UTC-5 en Colombia) o asegúrate de enviar fechas formateadas en hora local desde el frontend.
- **Error de conexión a MySQL (`ECONNREFUSED`):** Comprueba que el servicio de MySQL esté activo y que las credenciales (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`) en `.env` sean correctas.
- **Token inválido o sesión expirada (`401 Unauthorized`):** Cierra sesión y vuelve a iniciarla para renovar el token JWT, o verifica que `JWT_SECRET` no haya cambiado entre reinicios del servidor.

## Autores

- Karen Daiana Arias Cardona
- John Ever Arredondo Raigosa
- Elkin Alzate Londoño
- Santiago Sanchez Sanchez