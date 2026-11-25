/**
 * Bounded in-memory LRU + TTL cache with optional byte-budget eviction
 * and in-flight request coalescing (prevents cache stampedes).
 */

class TtlCache {
  constructor({ maxEntries = 200, maxBytes = null, defaultTtlMs = 30000, sizeFn = null, enableInTest = false } = {}) {
    this.maxEntries = maxEntries;
    this.maxBytes = maxBytes;
    this.defaultTtlMs = defaultTtlMs;
    this.sizeFn = sizeFn;
    this.enableInTest = enableInTest;
    this._store = new Map();
    this._inflight = new Map();
    this._totalBytes = 0;
  }

  _isActive() {
    return this.enableInTest || process.env.NODE_ENV !== 'test';
  }

  get size() {
    return this._store.size;
  }

  get totalBytes() {
    return this._totalBytes;
  }

  get(key) {
    if (!this._isActive()) return undefined;
    const entry = this._store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
      this.delete(key);
      return undefined;
    }

    // Touch for LRU ordering
    this._store.delete(key);
    this._store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (!this._isActive()) return value;

    const rawBytes = typeof this.sizeFn === 'function' ? this.sizeFn(value) : 0;
    const byteSize = Number.isFinite(rawBytes) && rawBytes > 0 ? rawBytes : 0;

    if (this.maxBytes !== null && byteSize > this.maxBytes) {
      return value;
    }

    if (this._store.has(key)) {
      const existing = this._store.get(key);
      this._totalBytes -= existing.byteSize;
      this._store.delete(key);
    }

    const ttl = Number.isFinite(ttlMs) ? ttlMs : this.defaultTtlMs;
    this._store.set(key, { value, expiresAt: Date.now() + ttl, byteSize });
    this._totalBytes += byteSize;

    this._evictIfNeeded();
    return value;
  }

  delete(key) {
    const existing = this._store.get(key);
    if (!existing) return false;
    this._totalBytes -= existing.byteSize;
    return this._store.delete(key);
  }

  deleteByPrefix(prefix) {
    let deleted = 0;
    for (const key of this._store.keys()) {
      if (String(key).startsWith(prefix)) {
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  clear() {
    this._store.clear();
    this._inflight.clear();
    this._totalBytes = 0;
  }

  async getOrSet(key, ttlMs, loaderFn) {
    if (!this._isActive()) {
      return loaderFn();
    }

    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    if (this._inflight.has(key)) {
      return this._inflight.get(key);
    }

    const promise = (async () => {
      const value = await loaderFn();
      if (value !== undefined && value !== null) {
        this.set(key, value, ttlMs);
      }
      return value;
    })();

    this._inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this._inflight.delete(key);
    }
  }

  _evictIfNeeded() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (entry.expiresAt <= now) {
        this._totalBytes -= entry.byteSize;
        this._store.delete(key);
      }
    }

    while (
      this._store.size > this.maxEntries ||
      (this.maxBytes !== null && this._totalBytes > this.maxBytes && this._store.size > 0)
    ) {
      const oldestKey = this._store.keys().next().value;
      if (oldestKey === undefined) break;
      this.delete(oldestKey);
    }
  }
}

const imageEntrySize = (entry) => (entry && Buffer.isBuffer(entry.buffer) ? entry.buffer.length : 0);

const publicArgsCache = new TtlCache({ maxEntries: 10, defaultTtlMs: 30 * 1000 });
const argDetailCache = new TtlCache({ maxEntries: 200, defaultTtlMs: 30 * 1000 });
const badgesCache = new TtlCache({ maxEntries: 5, defaultTtlMs: 10 * 60 * 1000 });
const userSessionCache = new TtlCache({ maxEntries: 500, defaultTtlMs: 30 * 1000 });
const coverImageCache = new TtlCache({
  maxEntries: 100,
  maxBytes: 32 * 1024 * 1024,
  defaultTtlMs: 10 * 60 * 1000,
  sizeFn: imageEntrySize
});
const referenceImageCache = new TtlCache({
  maxEntries: 100,
  maxBytes: 32 * 1024 * 1024,
  defaultTtlMs: 10 * 60 * 1000,
  sizeFn: imageEntrySize
});
const dominationScoresCache = new TtlCache({ maxEntries: 100, defaultTtlMs: 15 * 1000 });

const BADGE_COOLDOWN_MS = 60 * 1000;
const badgeEvalCooldown = new Map();

function invalidateArgs() {
  publicArgsCache.clear();
}

function invalidateArg(argId) {
  if (argId !== undefined && argId !== null) {
    argDetailCache.delete(String(argId));
  }
}

function invalidateCoverImage(argId) {
  if (argId !== undefined && argId !== null) {
    coverImageCache.delete(String(argId));
  }
}

function invalidateReferenceImage(gameId) {
  if (gameId !== undefined && gameId !== null) {
    referenceImageCache.delete(String(gameId));
  }
}

function invalidateUser(userId) {
  if (userId !== undefined && userId !== null) {
    userSessionCache.delete(String(userId));
  }
}

function invalidateBadges() {
  badgesCache.clear();
}

function invalidateDomination(gameId) {
  if (gameId !== undefined && gameId !== null) {
    dominationScoresCache.delete(String(gameId));
  }
}

function isBadgeEvalFresh(userId) {
  if (process.env.NODE_ENV === 'test') return false;
  if (userId === undefined || userId === null) return false;
  const ts = badgeEvalCooldown.get(String(userId));
  if (!ts) return false;
  if (Date.now() - ts > BADGE_COOLDOWN_MS) {
    badgeEvalCooldown.delete(String(userId));
    return false;
  }
  return true;
}

function markBadgeEval(userId) {
  if (process.env.NODE_ENV === 'test') return;
  if (userId === undefined || userId === null) return;
  if (badgeEvalCooldown.size > 1000) {
    badgeEvalCooldown.clear();
  }
  badgeEvalCooldown.set(String(userId), Date.now());
}

function invalidateBadgeCooldown(userId) {
  if (userId !== undefined && userId !== null) {
    badgeEvalCooldown.delete(String(userId));
  }
}

function clearAllCaches() {
  publicArgsCache.clear();
  argDetailCache.clear();
  badgesCache.clear();
  userSessionCache.clear();
  coverImageCache.clear();
  referenceImageCache.clear();
  dominationScoresCache.clear();
  badgeEvalCooldown.clear();
}

module.exports = {
  TtlCache,
  publicArgsCache,
  argDetailCache,
  badgesCache,
  userSessionCache,
  coverImageCache,
  referenceImageCache,
  dominationScoresCache,
  badgeEvalCooldown,
  invalidateArgs,
  invalidateArg,
  invalidateCoverImage,
  invalidateReferenceImage,
  invalidateUser,
  invalidateBadges,
  invalidateDomination,
  isBadgeEvalFresh,
  markBadgeEval,
  invalidateBadgeCooldown,
  clearAllCaches
};
