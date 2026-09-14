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


// Use the globally configured API_BASE_URL (from config.js) or fallback
var API_BASE = window.API_BASE_URL || 'https://wargmirror.onrender.com';

// eslint-disable-next-line no-unused-vars
var api = (function () {

  /* ── Generic fetch wrapper ──────────────────────────────── */
  async function _get(path) {
    const res = await fetch(API_BASE + path, { credentials: 'include' });
    if (!res.ok) {
      throw Object.assign(new Error('API error'), { status: res.status, path });
    }
    return res.json();
  }

  async function _post(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include'
    });
    if (!res.ok) {
      throw Object.assign(new Error('API error'), { status: res.status, path });
    }
    return res.json();
  }

  async function _delete(path) {
    const res = await fetch(API_BASE + path, {
      method: 'DELETE',
      credentials: 'include'
    });
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
    var creator = arg.Creator || {};
    var username = creator.username || 'Unknown';

    // Build initials from username (up to 2 chars)
    var initials = username
      .split(/[\s_-]+/)
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
      id: String(arg.arg_id),
      title: arg.title || 'Untitled',
      mode: arg.mode || 'solo',
      caption: arg.caption || '',
      emoji: '🎮',
      image: image,
      progress: null,
      progressLabel: null,
      author: {
        name: username,
        initials: initials,
      },
      likes: arg.like_count || 0,
      dislikes: arg.dislike_count || 0,
      userVote: arg.user_vote || null,
      rating: rating,
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

  /* ── Game Actions ───────────────────────────────────────── */
  async function voteArg(argId, voteType, userId = 1) { // Defaulting user_id to 1 until auth is hooked up
    return _post('/api/args/' + argId + '/vote', { vote: voteType, user_id: userId });
  }

  async function flagArg(argId, reason, description, reporterId = 1) { // Defaulting user_id to 1 until auth is hooked up
    return _post('/api/args/' + argId + '/flag', { reason, description, reporter_id: reporterId });
  }

  async function removeRecentArg(argId, userId = 1) { // Defaulting user_id to 1 until auth is hooked up
    return _delete('/api/sessions/' + userId + '/arg/' + argId);
    async function getMinigameReference(gameId) {
      const res = await fetch(API_BASE + '/api/minigames/' + gameId + '/reference', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch reference');

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return res.json();
      }
      return res.blob();
    }

    async function submitMinigameAttempt(gameId, imageBlob) {
      const formData = new FormData();
      formData.append('image', imageBlob, 'attempt.jpg');

      const res = await fetch(API_BASE + '/api/minigames/' + gameId + '/attempt', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to submit attempt');
      }
      return res.json();
    }

    async function uploadMinigameReference(gameId, imageBlob) {
      const formData = new FormData();
      formData.append('image', imageBlob, 'reference.jpg');

      const res = await fetch(API_BASE + '/api/minigames/' + gameId + '/reference', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to upload reference');
      }
      return res.json();
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
      voteArg,
      flagArg,
      removeRecentArg,
      getMinigameReference,
      submitMinigameAttempt,
      uploadMinigameReference
    };

  } ());
