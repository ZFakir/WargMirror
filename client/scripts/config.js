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
