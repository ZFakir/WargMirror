// Global config — switches between local dev and production automatically
const isLocalHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = isLocalHost
  ? 'http://localhost:3000'
  : 'https://wargmirror.onrender.com';

// Make it globally available (also as API_BASE for backwards compatibility)
window.API_BASE_URL = API_BASE_URL;
window.API_BASE = API_BASE_URL;

// Warm DNS + TCP + TLS connection to the production backend early
if (!isLocalHost && document.head && !document.querySelector('link[rel="preconnect"][href="' + API_BASE_URL + '"]')) {
  const preconnect = document.createElement('link');
  preconnect.rel = 'preconnect';
  preconnect.href = API_BASE_URL;
  preconnect.crossOrigin = 'use-credentials';
  document.head.appendChild(preconnect);
}

// Register Service Worker for offline capabilities
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Determine the correct base path for the service worker.
    // By using a relative path, it registers correctly regardless of the root folder.
    navigator.serviceWorker.register('sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }).catch(err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

// Global Search UI Handler
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      searchInput.closest('.topbar__search')?.style.setProperty('max-inline-size', '560px');
    });
    searchInput.addEventListener('blur', () => {
      searchInput.closest('.topbar__search')?.style.removeProperty('max-inline-size');
    });
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) {
          window.location.href = `catalogue.html?search=${encodeURIComponent(query)}`;
        }
      }
    });
  }
});

/* '/' shortcut to focus search */
document.addEventListener('keydown', e => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    searchInput?.focus();
  }
});

// --- Backend keep-alive ---
// The backend (Render free tier) spins down after ~15 min idle and the
// database sleeps too. Only ping /health if no recent ping or API activity
// occurred within the last 8 minutes, and skip hidden background tabs.
(function pingBackendHealth() {
  const KEEP_ALIVE_COOLDOWN_MS = 8 * 60 * 1000;

  const shouldPing = () => {
    if (document.visibilityState === 'hidden') return false;
    const now = Date.now();
    if (window._lastApiActivityAt && (now - window._lastApiActivityAt) < KEEP_ALIVE_COOLDOWN_MS) {
      return false;
    }
    try {
      const lastPing = parseInt(sessionStorage.getItem('warg_last_health_ping') || '0', 10);
      if (lastPing && (now - lastPing) < KEEP_ALIVE_COOLDOWN_MS) {
        return false;
      }
    } catch { /* ignore storage restrictions */ }
    return true;
  };

  const ping = () => {
    if (!shouldPing()) return;
    try {
      sessionStorage.setItem('warg_last_health_ping', String(Date.now()));
    } catch { /* ignore */ }
    fetch(window.API_BASE_URL + '/health', { credentials: 'include' }).catch(() => {});
  };

  setTimeout(ping, 3000);
  setInterval(ping, 10 * 60 * 1000);
})();
