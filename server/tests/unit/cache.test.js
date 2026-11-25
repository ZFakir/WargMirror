const { TtlCache } = require('../../src/utils/cache');
const { stripConfigBase64, stripHeavyMinigameFields } = require('../../src/utils/sanitize');

describe('TtlCache', () => {
  it('stores and retrieves values before TTL expires', () => {
    const cache = new TtlCache({ maxEntries: 10, defaultTtlMs: 5000, enableInTest: true });
    cache.set('k1', { ok: true });
    expect(cache.get('k1')).toEqual({ ok: true });
  });

  it('expires entries after TTL elapses', async () => {
    const cache = new TtlCache({ maxEntries: 10, defaultTtlMs: 20, enableInTest: true });
    cache.set('k1', 'value', 15);
    await new Promise(resolve => setTimeout(resolve, 35));
    expect(cache.get('k1')).toBeUndefined();
  });

  it('evicts least-recently-used entries when maxEntries is exceeded', () => {
    const cache = new TtlCache({ maxEntries: 2, defaultTtlMs: 5000, enableInTest: true });
    cache.set('a', 1);
    cache.set('b', 2);
    // Touch 'a' so 'b' becomes LRU
    expect(cache.get('a')).toBe(1);
    cache.set('c', 3);

    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    expect(cache.get('c')).toBe(3);
  });

  it('evicts entries when maxBytes budget is exceeded', () => {
    const cache = new TtlCache({
      maxEntries: 10,
      maxBytes: 10,
      defaultTtlMs: 5000,
      sizeFn: (v) => v.buffer.length,
      enableInTest: true
    });
    cache.set('a', { buffer: Buffer.alloc(6) });
    cache.set('b', { buffer: Buffer.alloc(6) });

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeDefined();
    expect(cache.totalBytes).toBe(6);
  });

  it('coalesces concurrent getOrSet calls (stampede protection)', async () => {
    const cache = new TtlCache({ maxEntries: 10, defaultTtlMs: 5000, enableInTest: true });
    let calls = 0;
    const loader = async () => {
      calls++;
      await new Promise(resolve => setTimeout(resolve, 20));
      return { loaded: true };
    };

    const results = await Promise.all([
      cache.getOrSet('shared', 5000, loader),
      cache.getOrSet('shared', 5000, loader),
      cache.getOrSet('shared', 5000, loader)
    ]);

    expect(calls).toBe(1);
    expect(results).toEqual([{ loaded: true }, { loaded: true }, { loaded: true }]);
  });

  it('deletes entries matching prefix', () => {
    const cache = new TtlCache({ maxEntries: 10, defaultTtlMs: 5000, enableInTest: true });
    cache.set('arg:1', 'one');
    cache.set('arg:2', 'two');
    cache.set('user:1', 'u1');

    expect(cache.deleteByPrefix('arg:')).toBe(2);
    expect(cache.get('arg:1')).toBeUndefined();
    expect(cache.get('arg:2')).toBeUndefined();
    expect(cache.get('user:1')).toBe('u1');
  });

  it('bypasses caching when NODE_ENV=test and enableInTest is false', async () => {
    const cache = new TtlCache({ maxEntries: 10, defaultTtlMs: 5000 });
    cache.set('k', 'val');
    expect(cache.get('k')).toBeUndefined();

    let count = 0;
    const v1 = await cache.getOrSet('k', 5000, async () => ++count);
    const v2 = await cache.getOrSet('k', 5000, async () => ++count);
    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });
});

describe('sanitize utility', () => {
  it('strips reference_image_base64 and mimetype without mutating original', () => {
    const original = {
      reference_image_url: '/api/minigames/1/reference/image',
      reference_image_base64: 'AAAA',
      reference_image_mimetype: 'image/png',
      tolerance: 0.1
    };

    const cleaned = stripConfigBase64(original);
    expect(cleaned).toEqual({
      reference_image_url: '/api/minigames/1/reference/image',
      tolerance: 0.1
    });
    expect(original.reference_image_base64).toBe('AAAA');
  });

  it('strips heavy minigame fields inside nested Arg Waypoints', () => {
    const arg = {
      arg_id: 1,
      Waypoints: [
        {
          waypoint_id: 10,
          Minigames: [
            {
              game_id: 5,
              config_json: {
                reference_image_url: '/api/minigames/5/reference/image',
                reference_image_base64: 'BBBB',
                reference_image_mimetype: 'image/jpeg'
              }
            }
          ]
        }
      ]
    };

    const sanitized = stripHeavyMinigameFields(arg);
    expect(sanitized.Waypoints[0].Minigames[0].config_json).toEqual({
      reference_image_url: '/api/minigames/5/reference/image'
    });
    expect(arg.Waypoints[0].Minigames[0].config_json.reference_image_base64).toBe('BBBB');
  });
});
