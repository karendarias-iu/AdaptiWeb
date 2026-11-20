/**
 * Controlador de procesamiento de texto y extracción desde URL externa
 *
 * Procesa texto directo ingresado por el usuario o extrae el contenido textual
 * limpio de una URL descartando elementos superfluos (menús, publicidad, scripts, etc.).
 */

function limpiarTextoPlano(texto) {
  return String(texto || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n[ ]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodificarEntidadesHtml(texto) {
  const mapa = {
    '&nbsp;': ' ',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&aacute;': 'á', '&eacute;': 'é', '&iacute;': 'í', '&oacute;': 'ó', '&uacute;': 'ú',
    '&Aacute;': 'Á', '&Eacute;': 'É', '&Iacute;': 'Í', '&Oacute;': 'Ó', '&Uacute;': 'Ú',
    '&ntilde;': 'ñ', '&Ntilde;': 'Ñ',
    '&uuml;': 'ü', '&Uuml;': 'Ü',
    '&iquest;': '¿', '&iexcl;': '¡',
    '&mdash;': '—', '&ndash;': '–', '&hellip;': '...',
    '&laquo;': '«', '&raquo;': '»',
    '&ldquo;': '“', '&rdquo;': '”', '&lsquo;': '‘', '&rsquo;': '’'
  };

  return texto
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&[a-zA-Z0-9#]+;/g, (entidad) => (entidad in mapa ? mapa[entidad] : entidad));
}

function extraerTextoLimpioDesdeHtml(html) {
  let limpio = String(html || '');

  // 1. Si existe <main> o <article>, priorizar el contenido principal
  const matchMain = limpio.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const matchArticle = limpio.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (matchMain && matchMain[1].replace(/<[^>]+>/g, '').trim().length > 120) {
    limpio = matchMain[1];
  } else if (matchArticle && matchArticle[1].replace(/<[^>]+>/g, '').trim().length > 120) {
    limpio = matchArticle[1];
  } else {
    const matchBody = limpio.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    if (matchBody) limpio = matchBody[1];
  }

  // 2. Descartar bloques no textuales o superfluos (scripts, estilos, menús, pie de página, aside, formularios)
  limpio = limpio
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|canvas|iframe|nav|header|footer|aside|form|button|select|textarea|input)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  // 3. Descartar contenedores explícitos de publicidad, cookies, banners o menús por id/class/role
  limpio = limpio.replace(
    /<(div|section|ul|ol|dl)\b[^>]*(?:class|id|role)\s*=\s*["'][^"']*(?:\bads?\b|\badvert|\bbanner\b|\bcookie|\bpopup|\bmodal|\bsidebar|\bmenu|\bnavbar|\bbreadcrumb|\bpromo|\bsponsor|\bshare|\bsocial|\bnewsletter|\bcomments?)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
    ' '
  );

  // 4. Convertir saltos estructurales en saltos de línea legibles
  limpio = limpio
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|h[1-6]|li|tr|blockquote|pre)>/gi, '\n\n');

  // 5. Eliminar etiquetas HTML restantes y decodificar entidades
  limpio = limpio.replace(/<[^>]+>/g, ' ');
  limpio = decodificarEntidadesHtml(limpio);

  return limpiarTextoPlano(limpio);
}

// POST /api/texto/procesar
async function procesarContenido(req, res) {
  const { tipo, valor } = req.body || {};

  // Caso A: Texto ingresado directamente por el usuario
  if (tipo === 'texto') {
    const textoProcesado = limpiarTextoPlano(valor);
    return res.status(200).json({
      texto: textoProcesado
    });
  }

  // Caso B: Extracción de texto desde una URL externa
  if (tipo === 'url') {
    const urlStr = typeof valor === 'string' ? valor.trim() : '';

    if (!urlStr) {
      return res.status(400).json({ message: 'Por favor ingresa una URL.' });
    }

    let urlObj;
    try {
      urlObj = new URL(urlStr);
    } catch {
      return res.status(400).json({ message: 'La URL ingresada no tiene un formato válido. Incluye http:// o https://.' });
    }

    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return res.status(400).json({ message: 'Solo se permiten URLs con protocolo HTTP o HTTPS.' });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const respuesta = await fetch(urlObj.href, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AdaptiWebBot/1.0)',
          'Accept': 'text/html,text/plain;q=0.9,*/*;q=0.8'
        }
      });

      clearTimeout(timeoutId);

      if (!respuesta.ok) {
        return res.status(422).json({
          message: `No se pudo acceder a la URL (el sitio respondió con estado HTTP ${respuesta.status}). Verifica que la página esté disponible.`
        });
      }

      const contentType = (respuesta.headers.get('content-type') || '').toLowerCase();

      if (contentType.includes('application/pdf')) {
        return res.status(422).json({
          message: 'El enlace apunta a un archivo PDF directo. Por ahora ingresa la URL de una página web con texto HTML.'
        });
      }

      if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
        return res.status(422).json({
          message: 'La URL ingresada no contiene una página web legible.'
        });
      }

      const cuerpoCrudo = await respuesta.text();
      const textoExtraido = contentType.includes('text/plain')
        ? limpiarTextoPlano(cuerpoCrudo)
        : extraerTextoLimpioDesdeHtml(cuerpoCrudo);

      if (!textoExtraido) {
        return res.status(422).json({
          message: 'La página está disponible pero no se encontró contenido textual legible para extraer.'
        });
      }

      return res.status(200).json({
        texto: textoExtraido
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return res.status(504).json({
          message: 'La página tardó demasiado en responder. Verifica la URL o inténtalo más tarde.'
        });
      }

      return res.status(422).json({
        message: 'No se pudo conectar con la URL ingresada. Verifica que la dirección exista y esté disponible.'
      });
    }
  }

  return res.status(400).json({ message: 'Tipo de contenido no válido.' });
}

module.exports = {
  procesarContenido
};
