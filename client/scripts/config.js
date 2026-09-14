// Global config — switches between local dev and production automatically
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://wargmirror.onrender.com';

// Make it globally available (also as API_BASE for backwards compatibility)
window.API_BASE_URL = API_BASE_URL;
window.API_BASE = API_BASE_URL;
