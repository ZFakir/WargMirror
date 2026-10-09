// Global config — switches between local dev and production automatically
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://wargmirror.onrender.com';
// This file holds global configuration for the frontend

// Define the base URL for the backend API
window.API_BASE_URL = 'https://wargmirror.onrender.com';

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.API_BASE_URL = 'http://localhost:3000';
}

// Make it globally available (also as API_BASE for backwards compatibility)
window.API_BASE_URL = API_BASE_URL;
window.API_BASE = API_BASE_URL;

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
