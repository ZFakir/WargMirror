// This file holds global configuration for the frontend

// Define the base URL for the backend API
let API_BASE_URL = 'https://wargmirror.onrender.com';

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  API_BASE_URL = 'http://localhost:3000';
}

// Make it globally available
window.API_BASE_URL = API_BASE_URL;
