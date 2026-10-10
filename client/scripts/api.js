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

// Auto-detect local development environment
if (!window.API_BASE_URL) {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_BASE_URL = 'http://localhost:3000';
  } else {
    window.API_BASE_URL = 'https://wargmirror.onrender.com';
  }
}
var API_BASE = window.API_BASE_URL;

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

  async function _put(path, body) {
    const res = await fetch(API_BASE + path, {
      method: 'PUT',
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
    var image = null;
    if (arg.cover_image) {
      image = API_BASE + '/api/args/' + arg.arg_id + '/cover-image';
    }

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
   * Returns the currently authenticated user, or redirects guests to the
   * login page. For pages that have no meaningful guest view (editor,
   * analytics, admin).
   */
  async function requireAuthPage() {
    const user = await getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
    }
    return user;
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
   * Returns all available badges in the system.
   */
  async function getAllBadges() {
    return _get('/api/badges');
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

  async function removeFriend(userId, friendId) {
    return _delete('/api/users/' + userId + '/friends/' + friendId);
  }

  async function searchUsers(query) {
    return _get('/api/users/search/query?q=' + encodeURIComponent(query));
  }

  async function sendFriendRequest(senderId, receiverId) {
    return _post('/api/users/' + senderId + '/friends/request', { receiverId });
  }

  async function getFriendRequests(userId) {
    return _get('/api/users/' + userId + '/friends/requests');
  }

  async function respondToFriendRequest(requestId, status) {
    const res = await fetch(API_BASE + '/api/users/friends/requests/' + requestId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw Object.assign(new Error('API error'), { status: res.status, path: '/api/users/friends/requests/' + requestId });
    }
    return res.json();
  }

  /* ── Game Actions ───────────────────────────────────────── */
  async function voteArg(argId, voteType) {
    return _post('/api/args/' + argId + '/vote', { vote: voteType });
  }

  async function flagArg(argId, reason, description, reporterId = 1) { // Defaulting user_id to 1 until auth is hooked up
    return _post('/api/args/' + argId + '/flag', { reason, description, reporter_id: reporterId });
  }

  async function removeRecentArg(argId, userId = 1) { // Defaulting user_id to 1 until auth is hooked up
    return _delete('/api/sessions/' + userId + '/arg/' + argId);
  }

  /**
   * Resets a completed Game Session
   */
  async function resetGameSession(argId) {
    return _post('/api/game/' + argId + '/reset', {});
  }

  async function getMinigameReference(gameId) {
    const url = API_BASE + '/api/minigames/' + gameId + '/reference/image';
    const req = new Request(url, { credentials: 'include' });
    
    let res;
    try {
      res = await fetch(req);
      if (!res.ok) throw new Error('Failed to fetch reference');
      
      // Explicitly cache it for offline use (protects against SW bypass)
      if ('caches' in window) {
         const resClone = res.clone();
         caches.open('warg-dynamic-cache').then(cache => cache.put(req, resClone)).catch(console.error);
      }
    } catch (err) {
      // If we are offline or fetch fails, manually fallback to cache!
      if ('caches' in window) {
         res = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
         if (!res) throw err;
      } else {
         throw err;
      }
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return res.json();
    }
    return res.blob();
  }

  async function submitMinigameAttempt(gameId, imageBlob) {
    const apiUrl = API_BASE + '/api/minigames/' + gameId + '/attempt';

    // Helper to save offline
    const saveOffline = async () => {
      if (window.offlineDB) {
        await window.offlineDB.addPendingAttempt({ gameId, imageBlob, apiUrl });
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('sync-attempts').catch(console.error);
        }
      }
      return { offline: true, message: "Attempt saved offline. It will be synced when you reconnect." };
    };

    if (!navigator.onLine) {
      return saveOffline();
    }

    const formData = new FormData();
    formData.append('image', imageBlob, 'attempt.jpg');

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Failed to submit attempt');
      }
      return res.json();
    } catch (err) {
      if (!navigator.onLine || err.name === 'TypeError' || err.message === 'Failed to fetch') {
        return saveOffline();
      }
      throw err;
    }
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
  
  async function submitFeedback(feedbackData) {
    return _post('/api/feedback', feedbackData);
  }

  /**
   * Clears a specific game and the game catalogue from the local cache.
   * Useful when a developer updates a game and needs to bust the Stale-While-Revalidate cache.
   */
  async function clearGameCache(gameId) {
    if (!('caches' in window)) return;
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        const cache = await caches.open(name);
        
        // Clear specific ARG
        if (gameId) {
          const gameUrl = new URL(API_BASE + '/api/args/' + gameId);
          await cache.delete(gameUrl.href, { ignoreSearch: true });
        }
        
        // Clear lists
        const argsUrl = new URL(API_BASE + '/api/args');
        await cache.delete(argsUrl.href, { ignoreSearch: true });
        
        const minigamesUrl = new URL(API_BASE + '/api/minigames');
        await cache.delete(minigamesUrl.href, { ignoreSearch: true });
      }
      console.log('Cleared game cache for gameId:', gameId);
    } catch (e) {
      console.warn('Failed to clear cache', e);
    }
  }

  async function logout() {
    // Fetch directly because _get expects JSON but /auth/logout redirects
    return fetch(API_BASE + '/auth/logout', { credentials: 'include' });
  }

  async function updateAccount(data) {
    return _put('/auth/account', data);
  }

  async function deleteAccount() {
    return _delete('/auth/account');
  }

  /* ── Public API ─────────────────────────────────────────── */
  return {
    getCurrentUser,
    requireAuthPage,
    getArgs,
    getAllBadges,
    getArgById,
    getUserProfile,
    getUserLibrary,
    getActiveSessions,
    getFriends,
    removeFriend,
    searchUsers,
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    normaliseArg,
    voteArg,
    flagArg,
    removeRecentArg,
    getMinigameReference,
    submitMinigameAttempt,
    uploadMinigameReference,
    submitFeedback,
    clearGameCache,
    logout,
    updateAccount,
    deleteAccount,
    resetGameSession
  };

})();

// --- Global UI Logic Injector ---
async function initGlobalUI() {
  // --- Admin Dashboard Link Injector ---
  try {
    const user = await api.getCurrentUser();
    if (user && user.role === 'admin') {
      window._isAdmin = true;
      document.body.classList.add('admin-mode');
      const navs = document.querySelectorAll('.sidebar__nav');
      navs.forEach(nav => {
        if (!nav.querySelector('#nav-admin')) {
          const adminLink = document.createElement('a');
          adminLink.href = 'admin.html';
          adminLink.id = 'nav-admin';
          adminLink.className = 'nav-item' + (window.location.pathname.includes('admin.html') ? ' active' : '');
          adminLink.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <span class="nav-item__label">Admin Dashboard</span>
          `;
          nav.appendChild(adminLink);
        }
      });
    }
  } catch {
    // Ignore errors for unauthenticated users
  }

  // --- Global Profile Dropdown Logic ---
  const btnProfile = document.getElementById('btn-profile');
  const profileDropdown = document.getElementById('profile-dropdown');

  function toggleProfileDropdown(e) {
    if (e) e.stopPropagation();
    if (!profileDropdown) return;
    const isOpen = profileDropdown.classList.contains('is-open');
    if (isOpen) {
      profileDropdown.classList.remove('is-open');
      profileDropdown.setAttribute('aria-hidden', 'true');
      if (btnProfile) btnProfile.setAttribute('aria-expanded', 'false');
    } else {
      profileDropdown.classList.add('is-open');
      profileDropdown.setAttribute('aria-hidden', 'false');
      if (btnProfile) btnProfile.setAttribute('aria-expanded', 'true');
    }
  }

  function closeProfileDropdown() {
    if (profileDropdown && profileDropdown.classList.contains('is-open')) {
      profileDropdown.classList.remove('is-open');
      profileDropdown.setAttribute('aria-hidden', 'true');
      if (btnProfile) btnProfile.setAttribute('aria-expanded', 'false');
    }
  }

  if (btnProfile) {
    btnProfile.addEventListener('click', toggleProfileDropdown);
  }

  document.addEventListener('click', (e) => {
    if (profileDropdown && profileDropdown.classList.contains('is-open')) {
      if (!profileDropdown.contains(e.target) && e.target !== btnProfile && (!btnProfile || !btnProfile.contains(e.target))) {
        closeProfileDropdown();
      }
    }
  });

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        if (typeof api !== 'undefined' && api.logout) {
          await api.logout();
        }
      } catch { /* ignore */ }
      localStorage.removeItem('warg_token');
      window.location.href = 'login.html';
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGlobalUI);
} else {
  initGlobalUI();
}
