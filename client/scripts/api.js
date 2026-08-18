/**
 * WARG Platform — Shared API Client
 * ==================================
 * Provides typed helpers for every backend endpoint and a normaliser
 * that maps API response shapes to the GameCard-compatible format.
 *
 * Usage (plain-script — no import needed, loaded before page scripts):
 *   const args = await api.getArgs();
 *   const user = await api.getCurrentUser(); // null for guests
 */

/* eslint-disable no-var */
var API_BASE = 'http://localhost:3000';

var api = (function () {

  /* ── Generic fetch wrapper ──────────────────────────────── */
  async function _get(path) {
    const res = await fetch(API_BASE + path, { credentials: 'include' });
    if (!res.ok) {
      throw Object.assign(new Error('API error'), { status: res.status, path });
    }
    return res.json();
  }

  /* ── Data normaliser ────────────────────────────────────── */
  /**
   * Maps an API Arg object → GameCard-compatible shape.
   *
   * API shape:
   *   { arg_id, title, mode, caption, cover_image, like_count, dislike_count,
   *     rating_sum, rating_count, status, play_count, created_at, updated_at,
   *     Creator: { username, avatar } }
   *
   * GameCard shape:
   *   { id, title, mode, caption, emoji, image, progress, progressLabel,
   *     author: { name, initials }, likes, dislikes, rating, featured }
   */
  function normaliseArg(arg) {
    var creator  = arg.Creator || {};
    var username = creator.username || 'Unknown';

    // Build initials from username (up to 2 chars)
    var initials = username
      .split(/[\s_\-]+/)
      .slice(0, 2)
      .map(function (w) { return w[0] || ''; })
      .join('')
      .toUpperCase() || '??';

    // Compute rating (0 if never rated)
    var ratingCount = arg.rating_count || 0;
    var rating = ratingCount > 0
      ? Math.round((arg.rating_sum / ratingCount) * 10) / 10
      : 0;

    // cover_image from the DB is a BLOB — the API sends it as a Buffer/null.
    // Until the server serialises it as a data-URL we default to null (emoji fallback).
    var image = null;

    return {
      id:            String(arg.arg_id),
      title:         arg.title        || 'Untitled',
      mode:          arg.mode         || 'solo',
      caption:       arg.caption      || '',
      emoji:         '🎮',
      image:         image,
      progress:      null,
      progressLabel: null,
      author: {
        name:     username,
        initials: initials,
      },
      likes:    arg.like_count    || 0,
      dislikes: arg.dislike_count || 0,
      rating:   rating,
      featured: false,
      // Keep raw fields for pages that need them
      _raw: arg,
    };
  }

  /* ── Endpoints ──────────────────────────────────────────── */

  /**
   * Returns the currently authenticated user, or null for guests.
   * Never throws — a 401 is silently swallowed.
   */
  async function getCurrentUser() {
    try {
      return await _get('/auth/me');
    } catch (err) {
      if (err.status === 401) return null;
      throw err;
    }
  }

  /**
   * Returns all published ARGs normalised for GameCard.
   * Public endpoint — works for guests.
   */
  async function getArgs() {
    const args = await _get('/api/args');
    return args.map(normaliseArg);
  }

  /**
   * Returns a single ARG (with Waypoints) normalised for GameCard.
   */
  async function getArgById(id) {
    const arg = await _get('/api/args/' + id);
    return normaliseArg(arg);
  }

  /**
   * Returns a user's public profile.
   * Requires authentication (caller must check for 401).
   */
  async function getUserProfile(userId) {
    return _get('/api/users/' + userId);
  }

  /**
   * Returns all ARGs created by a user (any status), normalised.
   * Requires authentication.
   */
  async function getUserLibrary(userId) {
    const args = await _get('/api/users/' + userId + '/library');
    return args.map(normaliseArg);
  }

  /**
   * Returns active game sessions for a user.
   * Requires authentication.
   */
  async function getActiveSessions(userId) {
    return _get('/api/sessions/' + userId);
  }

  /**
   * Returns friends of a user.
   * Requires authentication.
   */
  async function getFriends(userId) {
    return _get('/api/users/' + userId + '/friends');
  }

  /* ── Public API ─────────────────────────────────────────── */
  return {
    getCurrentUser,
    getArgs,
    getArgById,
    getUserProfile,
    getUserLibrary,
    getActiveSessions,
    getFriends,
    normaliseArg,
  };

}());
