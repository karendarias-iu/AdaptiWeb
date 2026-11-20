document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar sesión activa (misma validación que dashboard.html)
  const token = localStorage.getItem('adaptiweb_token');
  const usuarioGuardado = localStorage.getItem('adaptiweb_usuario');

  if (!token || !usuarioGuardado) {
    window.location.href = 'Inicio.html';
    return;
  }

  const cuadroLectura = document.getElementById('cuadro-lectura');

  // 2. Aplicar preferencias actuales o los valores por defecto si nunca las ha cambiado
  if (window.AdaptiPrefs) {
    const prefsLocales = window.AdaptiPrefs.leerCache() || window.AdaptiPrefs.PREDETERMINADAS;
    window.AdaptiPrefs.aplicar(prefsLocales);

    try {
      await window.AdaptiPrefs.cargarDesdeServidor(token);
    } catch {
      // Si no hay conexión o nunca ha guardado en BD, mantiene caché o PREDETERMINADAS
    }
  }

  // 3. Cargar el texto enviado desde dashboard.html (puede estar vacío)
  let textoMostrar = '';
  try {
    const contenido = JSON.parse(sessionStorage.getItem('adaptiweb_contenido') || 'null');
    if (contenido && typeof contenido.valor === 'string') {
      textoMostrar = contenido.valor;
    }
  } catch {
    textoMostrar = '';
  }

  if (cuadroLectura) {
    cuadroLectura.textContent = textoMostrar;
  }
});
