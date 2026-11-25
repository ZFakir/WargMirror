const zlib = require('zlib');

const MIN_COMPRESS_BYTES = 1024;
const COMPRESSIBLE_CONTENT_TYPE = /^(?:application\/json|application\/javascript|text\/|image\/svg\+xml)/i;

function selectEncoding(acceptEncodingHeader) {
  if (!acceptEncodingHeader || typeof acceptEncodingHeader !== 'string') {
    return null;
  }
  const lower = acceptEncodingHeader.toLowerCase();
  // Prefer Brotli when advertised (skip br;q=0)
  if (/\bbr\b(?!\s*;\s*q=0(?:\.0+)?\b)/.test(lower)) {
    return 'br';
  }
  if (/\bgzip\b(?!\s*;\s*q=0(?:\.0+)?\b)/.test(lower)) {
    return 'gzip';
  }
  return null;
}

function compressBuffer(buffer, encoding, callback) {
  if (encoding === 'br') {
    zlib.brotliCompress(
      buffer,
      { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } },
      callback
    );
  } else {
    zlib.gzip(buffer, { level: 6 }, callback);
  }
}

function appendVary(res, headerName) {
  const existing = res.getHeader('Vary');
  if (!existing) {
    res.setHeader('Vary', headerName);
    return;
  }
  const parts = String(existing).split(',').map((s) => s.trim().toLowerCase());
  if (!parts.includes(headerName.toLowerCase())) {
    res.setHeader('Vary', `${existing}, ${headerName}`);
  }
}

function compressionMiddleware(req, res, next) {
  if (res._compressionWrapped) {
    return next();
  }
  res._compressionWrapped = true;

  const origSend = res.send.bind(res);
  const origJson = res.json.bind(res);

  function shouldSkip(contentType, byteLength) {
    if (req.method === 'HEAD') return true;
    if (res.statusCode === 204 || res.statusCode === 304) return true;
    if (res.getHeader('Content-Encoding')) return true;

    const cacheControl = String(res.getHeader('Cache-Control') || '');
    if (/no-transform/i.test(cacheControl)) return true;

    if (byteLength < MIN_COMPRESS_BYTES) return true;
    if (!contentType || !COMPRESSIBLE_CONTENT_TYPE.test(String(contentType))) return true;

    return false;
  }

  function sendPossiblyCompressed(body, defaultContentType) {
    if (body === undefined || body === null) {
      return origSend(body);
    }

    let buffer;
    if (Buffer.isBuffer(body)) {
      buffer = body;
    } else if (typeof body === 'string') {
      buffer = Buffer.from(body, 'utf8');
    } else {
      // Non-string, non-buffer objects go through json path or origSend
      return origSend(body);
    }

    if (!res.getHeader('Content-Type') && defaultContentType) {
      res.setHeader('Content-Type', defaultContentType);
    }

    const contentType = res.getHeader('Content-Type') || defaultContentType || '';
    appendVary(res, 'Accept-Encoding');

    const encoding = selectEncoding(req.headers['accept-encoding']);
    if (!encoding || shouldSkip(contentType, buffer.length)) {
      return origSend(body);
    }

    compressBuffer(buffer, encoding, (err, compressed) => {
      if (err || !compressed || compressed.length >= buffer.length) {
        return origSend(body);
      }
      if (res.headersSent) return;
      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Content-Length', compressed.length);
      origSend(compressed);
    });
    return res;
  }

  res.json = function wrappedJson(obj) {
    if (res.headersSent) return origJson(obj);
    const jsonString = JSON.stringify(obj);
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
    }
    return sendPossiblyCompressed(jsonString, 'application/json; charset=utf-8');
  };

  res.send = function wrappedSend(body) {
    if (res.headersSent) return origSend(body);
    if (typeof body === 'object' && !Buffer.isBuffer(body) && body !== null) {
      return res.json(body);
    }
    const defaultType = Buffer.isBuffer(body) ? 'application/octet-stream' : 'text/html; charset=utf-8';
    return sendPossiblyCompressed(body, defaultType);
  };

  next();
}

module.exports = compressionMiddleware;
module.exports.selectEncoding = selectEncoding;
module.exports.MIN_COMPRESS_BYTES = MIN_COMPRESS_BYTES;
