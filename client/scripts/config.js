// This file holds global configuration for the frontend

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://wargmirror.onrender.com';
// Define the base URL for the backend API
const API_BASE_URL = 'http://localhost:3000';

// Make it globally available
window.API_BASE_URL = API_BASE_URL;
