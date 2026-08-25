// This file holds global configuration for the frontend

// Automatically determine if we are running locally or in production
const isLocalhost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';

// Define the base URL for the backend API
const API_BASE_URL = isLocalhost 
  ? 'http://localhost:3000' 
  : 'https://wargmirror.onrender.com';

// Make it globally available
window.API_BASE_URL = API_BASE_URL;
