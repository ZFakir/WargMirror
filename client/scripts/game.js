/* global showToast */
/**
 * WARG Platform — Game Page Script
 * Handles: Progress timeline rendering, game engine integration, and interactions.
 */

import playModal from './components/PlayModal.js';
import { FlagModal } from './components/FlagModal.js';
import mapModal from './components/MapModal.js';
import { getMinigameHandler } from './components/minigame-handlers.js';
import { startSensors, stopSensors, logPosition, getSensorDataAndReset } from './sensors.js';
import { CameraCapture } from './components/CameraCapture.js';

function setupConnectionBanner() {
  const banner = document.createElement('div');
  banner.id = 'connection-banner';
  banner.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; padding: 10px; text-align: center; font-weight: bold; z-index: 10000; transition: all 0.3s ease; display: none;';
  document.body.appendChild(banner);

  const updateBanner = () => {
    if (!navigator.onLine) {
      banner.textContent = 'Offline Mode - Progress will sync when reconnected.';
      banner.style.backgroundColor = 'var(--color-warning, #f0ad4e)';
      banner.style.color = '#fff';
      banner.style.display = 'block';
    } else {
      banner.textContent = 'Back Online! Syncing progress...';
      banner.style.backgroundColor = 'var(--color-success, #5cb85c)';
      
      // Fallback for browsers without Background Sync API
      if (!('SyncManager' in window) && navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'MANUAL_SYNC' });
      }

      // Dispatch reconnect event for state reconciliation
      window.dispatchEvent(new Event('warg:reconnect'));

      setTimeout(() => {
        banner.style.display = 'none';
      }, 3000);
    }
  };

  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  // Initial check
  if (!navigator.onLine) updateBanner();
}

// Ensure showToast is available on the game page
window.showToast = function(message) {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background-color: var(--color-surface, #1e1e1e); color: var(--color-on-surface, #ffffff); padding: 12px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 10000; font-weight: 500; border: 1px solid var(--color-border, #333);';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

document.addEventListener('DOMContentLoaded', () => {
  setupConnectionBanner();
  const API_BASE = window.API_BASE_URL || 'https://wargmirror.onrender.com';

  const syncChannel = new BroadcastChannel('warg_sync_channel');
  syncChannel.onmessage = (event) => {
    if (event.data.type === 'SYNC_RESULT') {
      const result = event.data.result;
      if (event.data.success) {
        if (window.showToast) {
          window.showToast(result.passed ? `Offline attempt passed! +${result.points_awarded} pts` : 'Offline attempt analyzed: Not Quite...');
        }
        // Update in-game overlay if it is still open
        const overlay = document.getElementById('camera-result-overlay');
        if (overlay) {
          overlay.className = `camera-result-overlay ${result.passed ? 'pass' : 'fail'}`;
          overlay.innerHTML = `
            <h2>${result.passed ? 'Match Found!' : 'Not Quite...'}</h2>
            <p>Score: ${Math.round(result.confidence_score * 100)}%</p>
            <p>+${result.points_awarded} Points</p>
            <p>${result.message || ''}</p>
            <button id="camera-overlay-close-btn-sync" class="btn-primary" style="margin-top: 15px;">Close</button>
          `;
          document.getElementById('camera-overlay-close-btn-sync').addEventListener('click', () => {
            overlay.remove();
            playModal.close();
          });
        }
        // Reload the game state to update the map markers
        loadGameStateAndInitMap();
      } else {
        if (window.showToast) {
          window.showToast('Offline sync failed: ' + event.data.error);
        }
        const overlay = document.getElementById('camera-result-overlay');
        if (overlay) {
          overlay.className = 'camera-result-overlay fail';
          overlay.innerHTML = `
            <h2>Sync Failed</h2>
            <p>${event.data.error}</p>
            <button id="camera-overlay-close-btn-sync-fail" class="btn-primary" style="margin-top: 15px;">Close</button>
          `;
          document.getElementById('camera-overlay-close-btn-sync-fail').addEventListener('click', () => {
            overlay.remove();
            playModal.close();
          });
        }
      }
    }
  };

  // Initialize the reusable Flag Modal
  const flagModal = new FlagModal();
  const btnFlagGame = document.getElementById('btn-flag-game');
  if (btnFlagGame) {
    btnFlagGame.addEventListener('click', () => {
      flagModal.open('Issue with this WARG');
    });
  }
  
  // Re-fetch game state when coming back online
  window.addEventListener('warg:reconnect', () => {
    if (argId && gameState) {
      loadGameStateAndInitMap();
    }
  });

  // Get the ARG ID from the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const argId = urlParams.get('id');

  if (!argId) {
    alert('No WARG ID provided. Redirecting to catalogue.');
    window.location.href = 'catalogue.html';
    return;
  }

  let gameState = null;

  async function loadGameStateAndInitMap() {
    try {
      // Start or resume session
      const startRes = await fetch(`${API_BASE}/api/game/${argId}/start`, { method: 'POST', credentials: 'include' });
      if (!startRes.ok) {
        if (startRes.status === 401) {
          // If not logged in, we might just load the arg info and show locked nodes
          // But for now, require login
          alert("You must be logged in to play.");
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to start session');
      }

      // Get full state
      const stateRes = await fetch(`${API_BASE}/api/game/${argId}/state`, { credentials: 'include' });
      if (!stateRes.ok) throw new Error('Failed to load game state');

      startSensors();

      gameState = await stateRes.json();

      const nodes = [];
      if (gameState.waypoints) {
        gameState.waypoints.forEach(wp => {
          // Find progress for this waypoint
          const prog = gameState.progress.find(p => p.waypoint_id === wp.waypoint_id);
          const status = prog ? prog.status : 'locked';

          let progLabel = 'Not started';
          let progressPercent = 0;
          if (status === 'unlocked') { progLabel = 'Available'; progressPercent = 10; }
          if (status === 'completed') { progLabel = 'Completed'; progressPercent = 100; }
          if (status === 'failed') { progLabel = 'Failed'; progressPercent = 100; }

          nodes.push({
            id: wp.waypoint_id.toString(),
            name: wp.title || 'Waypoint',
            lat: wp.location.coordinates[1],
            lng: wp.location.coordinates[0],
            desc: wp.description || '',
            type: 'solo',
            minigames: wp.Minigames || [],
            status: status,
            progress: progressPercent,
            progLabel: progLabel
          });
        });
      }

      // Prefetch minigame references for unlocked waypoints so they are cached offline
      const doPrefetch = () => {
        const prefetchPromises = [];
        nodes.filter(n => n.status === 'unlocked' || n.status === 'in_progress').forEach(node => {
          if (node.minigames) {
            node.minigames.forEach(mg => {
              if (mg.game_id && mg.config_json && mg.config_json.reference_image_url) {
                prefetchPromises.push(
                  // Use the API helper which SW will intercept and cache
                  api.getMinigameReference(mg.game_id).catch(err => console.warn('Prefetch failed for game:', mg.game_id, err))
                );
              }
            });
          }
        });
        Promise.allSettled(prefetchPromises);
      };

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(() => {
          // Small delay to ensure SW has fully claimed clients
          setTimeout(doPrefetch, 500);
        });
      } else {
        doPrefetch();
      }

      // Wait for an ARG fetch just to get title
      let argData = {};
      const argRes = await fetch(`${API_BASE}/api/args/${argId}`, { credentials: 'include' });
      if (argRes.ok) {
        argData = await argRes.json();
        document.title = argData.title ? `WARG – ${argData.title}` : 'WARG – Discover Games';
      }

      const btnLike = document.getElementById('btn-like-game');
      const btnDislike = document.getElementById('btn-dislike-game');
      if (btnLike) btnLike.querySelector('span').textContent = `(${argData.like_count || 0})`;
      if (btnDislike) btnDislike.querySelector('span').textContent = `(${argData.dislike_count || 0})`;

      try {
        const localVotes = JSON.parse(localStorage.getItem('warg_votes') || '{}');
        const userVote = argData.user_vote || localVotes[argId] || null;
        if (userVote === 'like' && btnLike) {
          btnLike.classList.add('is-active');
        } else if (userVote === 'dislike' && btnDislike) {
          btnDislike.classList.add('is-active');
        }
      } catch { /* ignore */ }

      mapModal.init({
        nodes, edges: (gameState.edges || []).map(e => ({
          id: (e.edge_id || e.id || '').toString(),
          from: (e.from_waypoint_id || e.from).toString(),
          to: (e.to_waypoint_id || e.to).toString()
        }))
      });

      if (gameState && gameState.session && gameState.session.status === 'completed') {
        setTimeout(() => {
          mapModal.showCompletedOverlay();
        }, 500);
      }

      // Start watching player location
      if (navigator.geolocation) {
        const gpsMode = localStorage.getItem('warg_gps_mode') || 'high';
        const enableHighAccuracy = gpsMode === 'high';
        const maximumAge = gpsMode === 'saver' ? 30000 : 10000;
        
        navigator.geolocation.watchPosition((position) => {
          const { latitude, longitude, accuracy } = position.coords;
          window.lastPlayerLocation = { latitude, longitude, accuracy };
          logPosition(latitude, longitude);
          mapModal.updatePlayerLocation(latitude, longitude, accuracy);
        }, (error) => {
          console.warn("Player location not available:", error);
        }, { enableHighAccuracy, maximumAge });
      }
    } catch (err) {
      console.error('Failed to load ARG data for map:', err);
      mapModal.init(); // Fallback to hardcoded nodes
    }
  }

  const btnLike = document.getElementById('btn-like-game');
  const btnDislike = document.getElementById('btn-dislike-game');

  async function handleVote(action) {
    const activeBtn = action === 'like' ? btnLike : btnDislike;

    // Optimistic UI updates
    const parseCount = span => span ? parseInt(span.textContent.replace(/[^0-9-]/g, ''), 10) || 0 : 0;

    let currentLikes = parseCount(btnLike ? btnLike.querySelector('span') : null);
    let currentDislikes = parseCount(btnDislike ? btnDislike.querySelector('span') : null);

    const isPressed = activeBtn && activeBtn.classList.contains('is-active');

    // Pre-click state, restored if the server rejects the vote (guests).
    const prevLikes = currentLikes;
    const prevDislikes = currentDislikes;
    const prevLikeActive = btnLike ? btnLike.classList.contains('is-active') : false;
    const prevDislikeActive = btnDislike ? btnDislike.classList.contains('is-active') : false;
    let prevStoredVote = null;
    try { prevStoredVote = (JSON.parse(localStorage.getItem('warg_votes') || '{}'))[argId] || null; } catch { /* ignore */ }

    if (activeBtn) activeBtn.classList.toggle('is-active', !isPressed);

    if (action === 'like') {
      currentLikes += isPressed ? -1 : 1;
      if (!isPressed && btnDislike && btnDislike.classList.contains('is-active')) {
        btnDislike.classList.remove('is-active');
        currentDislikes--;
      }
    } else {
      currentDislikes += isPressed ? -1 : 1;
      if (!isPressed && btnLike && btnLike.classList.contains('is-active')) {
        btnLike.classList.remove('is-active');
        currentLikes--;
      }
    }

    if (btnLike) btnLike.querySelector('span').textContent = `(${currentLikes})`;
    if (btnDislike) btnDislike.querySelector('span').textContent = `(${currentDislikes})`;

    try {
      const localVotes = JSON.parse(localStorage.getItem('warg_votes') || '{}');
      let newVote = null;
      if (btnLike && btnLike.classList.contains('is-active')) newVote = 'like';
      else if (btnDislike && btnDislike.classList.contains('is-active')) newVote = 'dislike';

      if (newVote) localVotes[argId] = newVote;
      else delete localVotes[argId];
      localStorage.setItem('warg_votes', JSON.stringify(localVotes));
    } catch { /* ignore */ }

    try {
      const res = await fetch(`${API_BASE}/api/args/${argId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: action }),
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (btnLike) btnLike.querySelector('span').textContent = `(${data.like_count})`;
          if (btnDislike) btnDislike.querySelector('span').textContent = `(${data.dislike_count})`;

          if (action === 'like') {
            if (btnLike) btnLike.classList.toggle('is-active', data.action === 'voted');
            if (btnDislike) btnDislike.classList.remove('is-active');
          } else {
            if (btnDislike) btnDislike.classList.toggle('is-active', data.action === 'voted');
            if (btnLike) btnLike.classList.remove('is-active');
          }
        }
      } else if (res.status === 401) {
        // Guests cannot vote — undo the optimistic update and offer login.
        if (btnLike) btnLike.classList.toggle('is-active', prevLikeActive);
        if (btnDislike) btnDislike.classList.toggle('is-active', prevDislikeActive);
        if (btnLike) btnLike.querySelector('span').textContent = `(${prevLikes})`;
        if (btnDislike) btnDislike.querySelector('span').textContent = `(${prevDislikes})`;
        try {
          const localVotes = JSON.parse(localStorage.getItem('warg_votes') || '{}');
          if (prevStoredVote) localVotes[argId] = prevStoredVote;
          else delete localVotes[argId];
          localStorage.setItem('warg_votes', JSON.stringify(localVotes));
        } catch { /* ignore */ }
        if (window.confirmModal) {
          window.confirmModal.open({
            title: 'Login required',
            desc: 'Log in to like or dislike games.',
            confirmText: 'Log in',
            callback: () => { window.location.href = 'login.html'; }
          });
        }
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  }

  if (btnLike) btnLike.addEventListener('click', () => handleVote('like'));
  if (btnDislike) btnDislike.addEventListener('click', () => handleVote('dislike'));



  loadGameStateAndInitMap();

  // Listen for the 'Play' event from the Map Modal
  document.addEventListener('warg:play-node', async (e) => {
    const node = e.detail;
    // Launch the game's actual Play Modal using the node's data
    playModal.open(node.name, node.desc);

    const cvGameTypes = ['shape_match', 'colour_match', 'texture_match', 'sift_match', 'symmetry_finder', 'plaque_scan'];

    // Check if the node has a CV minigame
    let cvMinigame = null;
    if (node.minigames && node.minigames.length > 0) {
      cvMinigame = node.minigames.find(mg => cvGameTypes.includes(mg.game_type));
    }

    if (cvMinigame) {
      playModal.setControls('<div id="camera-container" class="camera-container" style="position:relative; width:100%; min-height:300px;"></div>');
      const container = document.getElementById('camera-container');

      try {
        const refData = await api.getMinigameReference(cvMinigame.game_id);

        const camera = new CameraCapture(container, cvMinigame.game_type, refData);

        // Setup UI
        const captureBtn = document.createElement('button');
        captureBtn.className = 'btn-capture';

        const controlsDiv = document.createElement('div');
        controlsDiv.className = 'camera-controls';
        controlsDiv.appendChild(captureBtn);
        container.appendChild(controlsDiv);

        const feedbackDiv = document.createElement('div');
        feedbackDiv.className = 'camera-feedback';
        feedbackDiv.textContent = 'Aligning...';
        container.appendChild(feedbackDiv);

        camera.onScoreUpdate = (score) => {
          feedbackDiv.textContent = `Match: ${Math.round(score)}%`;
          if (score > 80) captureBtn.style.borderColor = 'var(--color-success)';
          else captureBtn.style.borderColor = 'var(--color-brand)';
        };

        await camera.start();

        captureBtn.addEventListener('click', async () => {
          const blob = await camera.snap();
          feedbackDiv.textContent = 'Analyzing...';
          try {
            const result = await api.submitMinigameAttempt(cvMinigame.game_id, blob);

            // Show result overlay
            const overlay = document.createElement('div');
            overlay.id = 'camera-result-overlay';
            if (result.offline) {
              overlay.className = 'camera-result-overlay pending';
              overlay.innerHTML = `
                <h2>Saved Offline</h2>
                <p>We'll analyze your attempt when you reconnect.</p>
                <p>${result.message || ''}</p>
                <button id="camera-overlay-close-btn-offline" class="btn-primary" style="margin-top: 15px;">Close</button>
              `;
            } else {
              overlay.className = `camera-result-overlay ${result.passed ? 'pass' : 'fail'}`;
              
              if (result.passed) {
                overlay.innerHTML = `
                  <h2>Match Found!</h2>
                  <p>Score: ${Math.round(result.confidence_score * 100)}%</p>
                  <p>+${result.points_awarded} Points</p>
                  <p>${result.message || ''}</p>
                `;
              } else {
                overlay.innerHTML = `
                  <h2>Not Quite...</h2>
                  <p>Score: ${Math.round(result.confidence_score * 100)}%</p>
                  <p>${result.message || ''}</p>
                  <button id="btn-retry-ar" class="btn btn--outline" style="margin-top: 1rem; border-color: white; color: white;">Try Again</button>
                `;
              }
            }
            container.appendChild(overlay);

            if (result.offline) {
              const closeBtn = document.getElementById('camera-overlay-close-btn-offline');
              if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                  overlay.remove();
                  playModal.close();
                });
              }
            } else {
              if (!result.passed) {
                const retryBtn = overlay.querySelector('#btn-retry-ar');
                if (retryBtn) {
                  retryBtn.addEventListener('click', () => {
                    overlay.remove();
                    feedbackDiv.textContent = 'Aligning...';
                  });
                }
              } else {
                setTimeout(() => {
                  if (typeof playModal !== 'undefined') playModal.close();
                  if (typeof mapModal !== 'undefined' && typeof mapModal.focusNode === 'function') mapModal.focusNode(argId);
                }, 2000);
              }
            }

          } catch (err) {
            console.error(err);
            feedbackDiv.textContent = 'Error: ' + err.message;
          }
        });

        // Clean up when modal closes
        const originalClose = playModal.close.bind(playModal);
        playModal.close = () => {
          camera.stop();
          originalClose();
        };

      } catch (err) {
        console.error(err);
        playModal.setControls('<p>Error initializing camera minigame.</p>');
      }
    } else {
      const actionBtn = document.createElement('button');
      actionBtn.className = 'btn btn--primary';
      actionBtn.textContent = 'Scan Barcode';
      playModal.setControls(actionBtn);

      if (node.status === 'locked') {
        alert("This waypoint is locked. Complete earlier waypoints to unlock it.");
        return;
      }

      if (node.status === 'completed') {
        alert("You have already completed this waypoint.");
        return;
      }

      // Open play modal immediately to show loading state
      playModal.open(node.name, "Checking your location...");
      playModal.clearControls();

      const loadingState = document.createElement('div');
      loadingState.style.textAlign = 'center';
      loadingState.style.padding = '2rem';
      loadingState.style.color = 'var(--color-text-muted)';
      loadingState.innerHTML = '<p>Verifying geofence...</p>';
      playModal.controlsContainer.appendChild(loadingState);

      // Try to get geolocation
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        playModal.close();
        return;
      }

      const processLocation = async (latitude, longitude, accuracy) => {
        try {
          const sensorData = getSensorDataAndReset();
          
          const arriveRes = await fetch(`${API_BASE}/api/game/${argId}/waypoint/${node.id}/arrive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lat: latitude, lng: longitude, accuracy_m: accuracy, ...sensorData })
          });

          if (!arriveRes.ok) throw new Error('Arrive check failed');
          const arriveData = await arriveRes.json();

          let geofenceOverride = false;
          if (!arriveData.within_radius) {
            // TEMP: Dev Override kept for ongoing testing — remove/gate before release.
            const unit = localStorage.getItem('warg_units') || 'metric';
            const dist = unit === 'imperial' ? (arriveData.distance * 3.28084).toFixed(1) + 'ft' : Math.round(arriveData.distance) + 'm';
            const rad = unit === 'imperial' ? (arriveData.radius * 3.28084).toFixed(1) + 'ft' : arriveData.radius + 'm';
            const override = confirm(`You are outside of the geofence (Distance: ${dist}, Radius: ${rad}).\n\nProceed anyway (Dev Override)?`);
            if (!override) {
              playModal.close();
              return;
            }
            // Sent with the minigame submission so the server's proximity
            // re-check keeps honouring the override (remove together with it).
            geofenceOverride = true;
          }

          // Restore actual description
          playModal.open(node.name, node.desc);

          // Find minigame config
          const wpData = gameState.waypoints.find(w => w.waypoint_id.toString() === node.id);
          const minigames = wpData.Minigames && wpData.Minigames.length > 0 ? wpData.Minigames : [{ game_type: 'gps_proximity' }];

          playModal.clearControls();

          const renderMinigame = (index) => {
            if (index >= minigames.length) {
              mapModal.updateNodeStatus(node.id, 'completed');
              playModal.close();
              return;
            }

            playModal.clearControls();

            const minigame = minigames[index];
            const handler = getMinigameHandler(minigame.game_type);

            const gameWrapper = document.createElement('div');
            gameWrapper.className = 'minigame-wrapper';
            gameWrapper.style.marginBottom = '20px';

            if (minigames.length > 1) {
              const gameTitle = document.createElement('h4');
              gameTitle.style.marginBottom = '10px';
              gameTitle.style.color = 'var(--color-brand)';
              gameTitle.textContent = `Task ${index + 1} of ${minigames.length}: ${minigame.game_type.replace('_', ' ').toUpperCase()}`;
              gameWrapper.appendChild(gameTitle);
            }

            playModal.controlsContainer.appendChild(gameWrapper);

            handler.render(gameWrapper, minigame.config_json || {}, async (submission) => {
              // Show loading spinner
              const originalContent = gameWrapper.innerHTML;
              gameWrapper.innerHTML = `
              <div class="minigame-feedback-container" style="text-align: center; padding: 2rem;">
                <div class="spinner-container" style="position: relative; width: 60px; height: 60px; margin: 0 auto 1rem;">
                  <div class="spinner" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 4px solid var(--color-bg-elevated); border-top: 4px solid var(--color-brand); border-radius: 50%; animation: spin 1s linear infinite; box-sizing: border-box;"></div>
                  <div class="feedback-icon" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; align-items: center; justify-content: center;"></div>
                </div>
                <div class="feedback-text-container" style="min-height: 2.5rem; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                  <p class="feedback-text" style="margin: 0; color: var(--color-text-muted);">Verifying...</p>
                </div>
              </div>
            `;

              // On Submit
              try {
                const submitRes = await fetch(`${API_BASE}/api/game/${argId}/waypoint/${node.id}/submit`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    game_id: minigame.game_id,
                    game_type: minigame.game_type,
                    submission,
                    geofence_override: geofenceOverride
                  })
                });
                if (!submitRes.ok) throw new Error('Submission failed');
                const result = await submitRes.json();
                
                const isLastGame = index === minigames.length - 1;

                const spinner = gameWrapper.querySelector('.spinner');
                const feedbackIcon = gameWrapper.querySelector('.feedback-icon');
                const feedbackTextContainer = gameWrapper.querySelector('.feedback-text-container');
                
                if (spinner) {
                  spinner.style.animation = 'none';
                  spinner.style.borderTopColor = 'var(--color-bg-elevated)';
                }
                
                if (result.outcome === 'pass') {
                  if (spinner) spinner.style.borderColor = 'var(--color-green, #4ade80)';
                  if (feedbackIcon) {
                    feedbackIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-green, #4ade80)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    requestAnimationFrame(() => {
                      feedbackIcon.style.transform = 'translate(-50%, -50%) scale(1)';
                    });
                  }
                  if (feedbackTextContainer) {
                    feedbackTextContainer.innerHTML = '<p style="color: var(--color-green, #4ade80); font-weight: bold; margin: 0; font-size: 1.1rem;">Correct!</p>';
                  }
                } else {
                  if (spinner) spinner.style.borderColor = 'var(--color-danger, #ef4444)';
                  if (feedbackIcon) {
                    feedbackIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger, #ef4444)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
                    requestAnimationFrame(() => {
                      feedbackIcon.style.transform = 'translate(-50%, -50%) scale(1)';
                    });
                  }
                  if (feedbackTextContainer) {
                    feedbackTextContainer.innerHTML = `<p style="color: var(--color-danger, #ef4444); font-weight: bold; margin: 0; font-size: 1.1rem;">Incorrect</p>${result.can_retry ? '<p style="color: var(--color-text-muted); margin: 0.25rem 0 0 0; font-size: 0.9rem;">Try again...</p>' : '<p style="color: var(--color-text-muted); margin: 0.25rem 0 0 0; font-size: 0.9rem;">Out of attempts</p>'}`;
                  }
                }

                  if (result.can_retry && result.outcome === 'fail') {
                    setTimeout(() => {
                      renderMinigame(index);
                    }, 2000);
                  } else if (result.outcome === 'pass' || result.outcome === 'fail') {
                    if (result.unlockedNodes) {
                      result.unlockedNodes.forEach(unlockedId => {
                        mapModal.updateNodeStatus(unlockedId.toString(), 'unlocked');
                      });
                    }

                    if (!isLastGame) {
                      setTimeout(() => {
                        renderMinigame(index + 1);
                      }, 2000);
                    } else {
                      const nodeStatus = result.outcome === 'fail' ? 'failed' : 'completed';
                      mapModal.updateNodeStatus(node.id, nodeStatus);
                      if (result.session_completed) {
                        setTimeout(() => {
                          mapModal.showCompletedOverlay();
                        }, 1000); // Wait a second for popup to close / feedback to finish
                      }
                      setTimeout(() => {
                        playModal.close();
                      }, 2000);
                    }
                  }
                } catch (err) {
                    console.error(err);
                    alert("Error submitting minigame.");
                    gameWrapper.innerHTML = originalContent;
                    renderMinigame(index);
                  }
                });
          };

          renderMinigame(0);

        } catch (err) {
          console.error(err);
          alert("Error during geofence check.");
          playModal.close();
        }
      };

      if (window.lastPlayerLocation) {
        processLocation(window.lastPlayerLocation.latitude, window.lastPlayerLocation.longitude, window.lastPlayerLocation.accuracy);
      } else {
        const gpsMode = localStorage.getItem('warg_gps_mode') || 'high';
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude, accuracy } = position.coords;
          window.lastPlayerLocation = { latitude, longitude, accuracy };
          processLocation(latitude, longitude, accuracy);
        }, (error) => {
          alert("Unable to retrieve your location for geofencing.");
          console.error(error);
          playModal.close();
        }, {
          enableHighAccuracy: gpsMode === 'high',
          timeout: 10000,
          maximumAge: gpsMode === 'saver' ? 30000 : 0
        });
      }
    }
  });

  // Comments System Logic (Copied from original)
  const commentsList = document.getElementById('comments-list');
  const commentInput = document.getElementById('comment-input');
  const btnPostComment = document.getElementById('btn-post-comment');
  const checkIsSpoiler = document.getElementById('comment-is-spoiler');

  async function loadComments() {
    try {
      const user = await api.getCurrentUser();
      const isAdmin = user && user.role === 'admin';

      const response = await fetch(`${API_BASE}/api/comments/arg/${argId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load comments');
      const comments = await response.json();

      commentsList.innerHTML = '';
      if (comments.length === 0) {
        commentsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">No comments yet. Be the first to share your thoughts!</div>';
        return;
      }

      const commentMap = new Map();
      const topLevelComments = [];

      comments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.comment_id, comment);
        if (comment.parent_id === null) topLevelComments.push(comment);
      });

      comments.forEach(comment => {
        if (comment.parent_id !== null && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id).replies.push(comment);
        }
      });

      function renderCommentNode(comment, isReply = false) {
        const timeString = new Date(comment.created_at).toLocaleString();
        const username = comment.User ? comment.User.username : 'Unknown User';
        const avatarSeed = comment.User ? comment.User.username : 'default';

        const div = document.createElement('div');
        div.className = `comment-item ${isReply ? 'is-reply' : ''}`;

        const avatarWrap = document.createElement('div');
        avatarWrap.className = 'comment-item__avatar';
        const avatarImg = document.createElement('img');
        avatarImg.src = `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(avatarSeed)}&backgroundColor=1a1816`;
        avatarImg.alt = username;
        avatarWrap.appendChild(avatarImg);

        const content = document.createElement('div');
        content.className = 'comment-item__content';

        const header = document.createElement('div');
        header.className = 'comment-item__header';
        const nameEl = document.createElement('strong');
        nameEl.textContent = username;
        const timeEl = document.createElement('span');
        timeEl.className = 'comment-item__time';
        timeEl.textContent = timeString;
        header.append(nameEl, timeEl);

        // Comment bodies are user content — render as text, never as HTML.
        const bodyEl = document.createElement('p');
        if (comment.is_spoiler) {
          const spoiler = document.createElement('span');
          spoiler.className = 'spoiler-text';
          spoiler.title = 'Click to reveal spoiler';
          spoiler.textContent = comment.body;
          spoiler.addEventListener('click', () => spoiler.classList.add('is-revealed'), { once: true });
          bodyEl.appendChild(spoiler);
        } else {
          bodyEl.textContent = comment.body;
        }

        const replyBtn = document.createElement('button');
        replyBtn.className = 'btn-reply';
        replyBtn.style.cssText = 'background: none; border: none; color: var(--color-brand); font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px;';
        replyBtn.textContent = 'Reply';

        content.append(header, bodyEl, replyBtn);

        if (isAdmin) {
          const btnDelete = document.createElement('button');
          btnDelete.className = 'btn-delete';
          btnDelete.style.cssText = 'background: none; border: none; color: var(--color-danger); font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px; margin-left: 12px;';
          btnDelete.textContent = 'Delete';
          btnDelete.addEventListener('click', async () => {
            if (window.confirmModal) {
              window.confirmModal.open({
                title: 'Delete Comment',
                desc: 'Are you sure you want to delete this comment?',
                confirmText: 'Delete',
                callback: async () => {
                  try {
                    const res = await fetch(`${API_BASE}/api/admin/comments/${comment.comment_id}`, { method: 'DELETE', credentials: 'include' });
                    if (res.ok) {
                      loadComments(); // refresh the list
                    } else {
                      if (typeof showToast !== 'undefined') showToast('Failed to delete comment.');
                    }
                  } catch (e) {
                    console.error(e);
                    if (typeof showToast !== 'undefined') showToast('Error deleting comment.');
                  }
                }
              });
            }
          });
          content.appendChild(btnDelete);
        }

        replyBtn.addEventListener('click', () => {
          const currentReply = document.querySelector('.reply-input-wrapper');
          if (currentReply) currentReply.remove();

          const replyWrapper = document.createElement('div');
          replyWrapper.className = 'compose-input-wrapper reply-input-wrapper';
          replyWrapper.style.marginTop = '8px';
          replyWrapper.innerHTML = `
            <input type="text" class="input-field reply-input" placeholder="Write a reply..." />
            <button class="btn btn--primary btn--sm btn-post-reply">Post</button>
          `;
          content.appendChild(replyWrapper);

          const btnPostReply = replyWrapper.querySelector('.btn-post-reply');
          const replyInput = replyWrapper.querySelector('.reply-input');
          replyInput.focus();

          btnPostReply.addEventListener('click', () => {
            postComment(replyInput.value, comment.comment_id, false, btnPostReply);
          });
        });

        div.append(avatarWrap, content);
        return div;
      }

      function appendCommentTree(comment, parentElement, isReply = false) {
        const node = renderCommentNode(comment, isReply);
        parentElement.appendChild(node);

        if (comment.replies && comment.replies.length > 0) {
          const repliesContainer = document.createElement('div');
          repliesContainer.className = 'comment-replies';
          node.querySelector('.comment-item__content').appendChild(repliesContainer);

          comment.replies.forEach(reply => {
            appendCommentTree(reply, repliesContainer, true);
          });
        }
      }

      topLevelComments.forEach(comment => {
        appendCommentTree(comment, commentsList, false);
      });
    } catch (error) {
      console.error(error);
      commentsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">Could not load comments.</div>';
    }
  }

  async function postComment(body, parentId = null, isSpoiler = false, btnElement = null) {
    if (!body.trim()) return;

    let originalBtnHTML = '';
    if (btnElement) {
      originalBtnHTML = btnElement.innerHTML;
      btnElement.disabled = true;
      btnElement.innerHTML = '<div style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;vertical-align:middle;"></div>';
    }

    try {
      const response = await fetch(`${API_BASE}/api/comments/arg/${argId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body, parent_id: parentId, is_spoiler: isSpoiler })
      });

      if (!response.ok) {
        if (btnElement) {
          btnElement.disabled = false;
          btnElement.innerHTML = originalBtnHTML;
        }
        if (response.status === 401) {
          if (typeof showToast !== 'undefined') showToast("You must be logged in to post a comment.");
        } else {
          if (typeof showToast !== 'undefined') showToast("Failed to post comment");
        }
        return;
      }

      commentInput.value = '';
      if (checkIsSpoiler) checkIsSpoiler.checked = false;

      // Wait for comments to reload before removing the spinner
      await loadComments();

      if (btnElement && document.body.contains(btnElement)) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalBtnHTML;
      }
    } catch (error) {
      console.error(error);
      if (btnElement && document.body.contains(btnElement)) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalBtnHTML;
      }
      alert("Error posting comment");
    }
  }

  if (btnPostComment) {
    btnPostComment.addEventListener('click', () => {
      postComment(commentInput.value, null, checkIsSpoiler ? checkIsSpoiler.checked : false, btnPostComment);
    });
  }

  loadComments();
});

window.addEventListener('beforeunload', stopSensors);
