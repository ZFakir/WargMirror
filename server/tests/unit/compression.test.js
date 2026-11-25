const zlib = require('zlib');
const compressionMiddleware = require('../../src/middleware/compression');

describe('compressionMiddleware', () => {
  function createMockRes() {
    const headers = {};
    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader: jest.fn((k, v) => { headers[k.toLowerCase()] = v; }),
      getHeader: jest.fn((k) => headers[k.toLowerCase()]),
      send: jest.fn(function (body) {
        this._sentBody = body;
        return this;
      }),
      json: jest.fn(function (obj) {
        this._sentBody = obj;
        return this;
      }),
      _headers: headers
    };
    return res;
  }

  it('compresses large JSON payloads with Brotli when br is accepted', (done) => {
    const req = { method: 'GET', headers: { 'accept-encoding': 'gzip, deflate, br' } };
    const res = createMockRes();
    const origSend = res.send;

    res.send = function (body) {
      origSend.call(this, body);
      try {
        expect(res._headers['content-encoding']).toBe('br');
        expect(res._headers['vary']).toContain('Accept-Encoding');
        const decompressed = zlib.brotliDecompressSync(body).toString('utf8');
        expect(JSON.parse(decompressed).items).toHaveLength(100);
        done();
      } catch (err) {
        done(err);
      }
      return this;
    };

    compressionMiddleware(req, res, () => {
      res.json({ items: Array.from({ length: 100 }, (_, i) => ({ id: i, title: 'WARG Game ' + i })) });
    });
  });

  it('falls back to gzip when only gzip is accepted', (done) => {
    const req = { method: 'GET', headers: { 'accept-encoding': 'gzip, deflate' } };
    const res = createMockRes();
    const origSend = res.send;

    res.send = function (body) {
      origSend.call(this, body);
      try {
        expect(res._headers['content-encoding']).toBe('gzip');
        const decompressed = zlib.gunzipSync(body).toString('utf8');
        expect(JSON.parse(decompressed).items).toHaveLength(100);
        done();
      } catch (err) {
        done(err);
      }
      return this;
    };

    compressionMiddleware(req, res, () => {
      res.json({ items: Array.from({ length: 100 }, (_, i) => ({ id: i, title: 'WARG Game ' + i })) });
    });
  });

  it('skips payloads smaller than 1024 bytes', () => {
    const req = { method: 'GET', headers: { 'accept-encoding': 'br, gzip' } };
    const res = createMockRes();
    const origSend = res.send;

    compressionMiddleware(req, res, () => {
      res.json({ ok: true });
    });

    expect(origSend).toHaveBeenCalledWith(JSON.stringify({ ok: true }));
    expect(res._headers['content-encoding']).toBeUndefined();
  });

  it('skips binary image responses', () => {
    const req = { method: 'GET', headers: { 'accept-encoding': 'br, gzip' } };
    const res = createMockRes();
    const origSend = res.send;
    res.setHeader('Content-Type', 'image/jpeg');
    const imgBuf = Buffer.alloc(4096, 0xff);

    compressionMiddleware(req, res, () => {
      res.send(imgBuf);
    });

    expect(origSend).toHaveBeenCalledWith(imgBuf);
    expect(res._headers['content-encoding']).toBeUndefined();
  });
});
