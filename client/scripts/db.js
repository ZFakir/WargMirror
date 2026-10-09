// client/scripts/db.js
// Lightweight IndexedDB wrapper for offline caching

const DB_NAME = 'warg-offline-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('puzzles')) {
        db.createObjectStore('puzzles', { keyPath: 'url' });
      }
      if (!db.objectStoreNames.contains('pending-attempts')) {
        db.createObjectStore('pending-attempts', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function savePuzzle(url, data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('puzzles', 'readwrite');
    const store = tx.objectStore('puzzles');
    store.put({ url, data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPuzzle(url) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('puzzles', 'readonly');
    const store = tx.objectStore('puzzles');
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result ? request.result.data : null);
    request.onerror = () => reject(request.error);
  });
}

async function addPendingAttempt(attempt) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-attempts', 'readwrite');
    const store = tx.objectStore('pending-attempts');
    store.add(attempt);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingAttempts() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-attempts', 'readonly');
    const store = tx.objectStore('pending-attempts');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearPendingAttempt(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-attempts', 'readwrite');
    const store = tx.objectStore('pending-attempts');
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const dbWrapper = {
  savePuzzle,
  getPuzzle,
  addPendingAttempt,
  getPendingAttempts,
  clearPendingAttempt
};

if (typeof window !== 'undefined') {
  window.offlineDB = dbWrapper;
} else if (typeof self !== 'undefined') {
  self.offlineDB = dbWrapper;
}
