/**
 * Minigame Handlers Registry
 * Exports a function to get the UI handler for a specific game type.
 */
/* global Html5QrcodeScanner */
import { getSensorDataAndReset } from '../sensors.js';
import mapModal from './MapModal.js';

function formatDominationDuration(hours) {
  const totalSeconds = Math.max(0, Math.round((Number(hours) || 0) * 3600));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function formatDistanceLabel(meters) {
  if (meters === null || meters === undefined || !Number.isFinite(Number(meters))) return '--';
  const m = Number(meters);
  const unit = localStorage.getItem('warg_units') || 'metric';
  if (unit === 'imperial') {
    const ft = m * 3.28084;
    return ft >= 1000 ? `${(m * 0.000621371).toFixed(2)} mi` : `${Math.round(ft)} ft`;
  }
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)}m`;
}

let activeDomination = null;

export function stopActiveDomination() {
  if (!activeDomination) return;
  if (activeDomination.pingInterval) {
    clearInterval(activeDomination.pingInterval);
  }
  if (activeDomination.hudEl && activeDomination.hudEl.parentNode) {
    activeDomination.hudEl.remove();
  }
  if (activeDomination.waypointId) {
    mapModal.clearBounceHighlight(activeDomination.waypointId);
  }
  activeDomination = null;
}

export function getMinigameHandler(gameType) {
  switch (gameType) {
    case 'gps_proximity':
      return {
        render: (container, config, onSubmit) => {
          // Geofence has already been verified on click of "Play".
          // We can immediately submit without requiring an extra button click.
          onSubmit({});
        }
      };
    case 'text_answer':
      return {
        render: (container, config, onSubmit) => {
          container.innerHTML = '';
          const wrapper = document.createElement('div');
          wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 0.85rem; padding: 0.75rem;';

          const errorMsg = document.createElement('p');
          errorMsg.style.cssText = 'display: none; color: var(--color-danger); font-size: var(--font-size-body-sm); margin: 0;';

          if (config.is_mcq && config.options) {
            const heading = document.createElement('h3');
            heading.style.cssText = 'font-weight: 600; font-size: var(--text-lg); margin: 0 0 0.25rem; color: var(--color-text-primary);';
            heading.textContent = config.question || config.hint || 'Question';
            wrapper.appendChild(heading);

            const optionsList = document.createElement('div');
            optionsList.style.cssText = 'display: flex; flex-direction: column; gap: 0.5rem;';
            config.options.forEach((opt, idx) => {
              const label = document.createElement('label');
              label.style.cssText = 'display: flex; align-items: center; gap: 0.75rem; min-height: 44px; background: var(--color-bg-elevated); padding: 0.75rem 0.9rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer;';
              const radio = document.createElement('input');
              radio.type = 'radio';
              radio.name = 'mcq-option';
              radio.value = String(idx);
              radio.style.cssText = 'width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--color-accent);';
              const span = document.createElement('span');
              span.textContent = opt;
              label.append(radio, span);
              optionsList.appendChild(label);
            });
            wrapper.appendChild(optionsList);
            wrapper.appendChild(errorMsg);

            const submitBtn = document.createElement('button');
            submitBtn.id = 'btn-submit-answer';
            submitBtn.className = 'btn btn--primary';
            submitBtn.style.marginTop = '0.25rem';
            submitBtn.textContent = 'Submit';
            submitBtn.addEventListener('click', () => {
              const selected = wrapper.querySelector('input[name="mcq-option"]:checked');
              if (selected) {
                errorMsg.style.display = 'none';
                onSubmit(selected.value);
              } else {
                errorMsg.textContent = 'Please select an answer before submitting.';
                errorMsg.style.display = 'block';
              }
            });
            wrapper.appendChild(submitBtn);
          } else {
            const label = document.createElement('label');
            label.setAttribute('for', 'text-answer-input');
            label.style.fontWeight = '500';
            label.textContent = config.hint || 'Enter answer';

            const input = document.createElement('input');
            input.type = 'text';
            input.id = 'text-answer-input';
            input.className = 'input-field';
            input.placeholder = 'Type here...';
            input.autocomplete = 'off';

            const submitBtn = document.createElement('button');
            submitBtn.id = 'btn-submit-answer';
            submitBtn.className = 'btn btn--primary';
            submitBtn.style.marginTop = '0.25rem';
            submitBtn.textContent = 'Submit';

            const trySubmit = () => {
              const val = input.value.trim();
              if (!val) {
                errorMsg.textContent = 'Please enter an answer.';
                errorMsg.style.display = 'block';
                return;
              }
              errorMsg.style.display = 'none';
              onSubmit(val);
            };
            submitBtn.addEventListener('click', trySubmit);
            input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                trySubmit();
              }
            });

            wrapper.append(label, input, errorMsg, submitBtn);
          }

          container.appendChild(wrapper);
        }
      };
    case 'qr_barcode':
      return {
        render: (container, config, onSubmit) => {
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
               <p style="margin-bottom: 1rem; color: var(--color-text-secondary);">Scan the hidden QR or Barcode.</p>
               <div id="gameplay-barcode-scanner-container" style="width: 100%; max-width: 400px; margin: 0 auto; overflow: hidden; border-radius: 8px;"></div>
               <button id="btn-scan-barcode" class="btn btn--primary" style="margin-top: 1rem;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M9 9h6v6H9z"></path></svg>
                 <span style="vertical-align: middle;">Start Scanner</span>
               </button>
               <div style="margin-top: 1rem;">
                 <a href="#" id="link-manual-entry" style="font-size: 13px; color: var(--color-accent); text-decoration: none;">Having trouble? Enter manually</a>
                 <div id="manual-entry-container" style="display: none; margin-top: 0.75rem; gap: 0.5rem; flex-direction: column;">
                   <input type="text" id="qr-override" class="input-field" placeholder="Enter barcode manually" />
                   <button id="btn-submit-manual" class="btn btn--primary btn--sm">Submit</button>
                 </div>
               </div>
            </div>
          `;
          
          let scanner = null;
          const btnScan = container.querySelector('#btn-scan-barcode');
          const linkManual = container.querySelector('#link-manual-entry');
          const manualContainer = container.querySelector('#manual-entry-container');
          const inputOverride = container.querySelector('#qr-override');
          const btnSubmitManual = container.querySelector('#btn-submit-manual');
          
          const cleanupScanner = () => {
            if (scanner) {
              scanner.clear().catch(err => console.error(err));
              scanner = null;
            }
          };

          btnScan.addEventListener('click', () => {
            if (scanner) return;
            btnScan.style.display = 'none';
            scanner = new Html5QrcodeScanner(
              "gameplay-barcode-scanner-container", 
              { fps: 10, qrbox: {width: 240, height: 240} }, 
              /* verbose= */ false
            );
            scanner.render((decodedText) => {
              cleanupScanner();
              onSubmit(decodedText);
            }, () => {
              // ignore parse errors
            });
          });

          linkManual.addEventListener('click', (e) => {
            e.preventDefault();
            manualContainer.style.display = 'flex';
            cleanupScanner();
            btnScan.style.display = 'inline-flex';
            inputOverride.focus();
          });

          const submitManual = () => {
            const val = inputOverride.value.trim();
            if (val) {
              cleanupScanner();
              onSubmit(val);
            }
          };

          btnSubmitManual.addEventListener('click', submitManual);
          inputOverride.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitManual();
            }
          });
        }
      };
    case 'plaque_scan':
      return {
        render: (container, config, onSubmit) => {
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
               <p style="margin-bottom: 1rem; color: var(--color-text-muted);">Take a photo of the plaque or sign to read its text.</p>
               <input type="file" id="plaque-photo-input" accept="image/*" capture="environment" style="display: none;" />
               <button id="btn-take-photo" class="btn btn--primary" style="margin-top: 1rem;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                 <span style="vertical-align: middle;">Take Photo</span>
               </button>
               <div id="plaque-preview-container" style="display: none; margin-top: 1rem;">
                 <img id="plaque-preview-img" style="max-width: 100%; max-height: 250px; border-radius: 8px; border: 1px solid var(--color-border);" />
                 <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center;">
                   <button id="btn-retake-photo" class="btn btn--outline">Retake</button>
                   <button id="btn-submit-photo" class="btn btn--primary">Submit Photo</button>
                 </div>
               </div>
            </div>
          `;
          
          const btnTake = container.querySelector('#btn-take-photo');
          const fileInput = container.querySelector('#plaque-photo-input');
          const previewContainer = container.querySelector('#plaque-preview-container');
          const previewImg = container.querySelector('#plaque-preview-img');
          const btnRetake = container.querySelector('#btn-retake-photo');
          const btnSubmit = container.querySelector('#btn-submit-photo');
          let base64Data = null;

          btnTake.addEventListener('click', () => {
            fileInput.click();
          });

          btnRetake.addEventListener('click', () => {
            fileInput.click();
          });

          fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (evt) => {
                base64Data = evt.target.result;
                previewImg.src = base64Data;
                btnTake.style.display = 'none';
                previewContainer.style.display = 'block';
              };
              reader.readAsDataURL(file);
            }
          });

          btnSubmit.addEventListener('click', () => {
            if (base64Data) {
              btnSubmit.disabled = true;
              btnSubmit.innerHTML = '<span class="camera-feedback-spinner" style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;vertical-align:middle;margin-right:6px;"></span> Submitting...';
              onSubmit(base64Data);
            }
          });
        }
      };
    case 'point_domination':
      return {
        render: async (container, config) => {
          const isSameActive = activeDomination &&
            String(activeDomination.gameId) === String(config.game_id) &&
            String(activeDomination.waypointId) === String(config.waypoint_id);

          container.innerHTML = '';
          const card = document.createElement('div');
          card.className = 'pd-card';

          const title = document.createElement('h3');
          title.className = 'pd-card__title';
          title.textContent = 'Point Domination';

          const subtitle = document.createElement('p');
          subtitle.className = 'pd-card__desc';
          subtitle.textContent = 'Stay within the zone radius while this tab is open to accumulate hold time. Pings run every 15 seconds using GPS + motion verification.';

          const statusBox = document.createElement('div');
          statusBox.className = 'pd-card__status';

          const statusBadge = document.createElement('span');
          statusBadge.className = 'pd-card__badge';

          const timerText = document.createElement('strong');
          timerText.className = 'pd-card__time';

          const radiusNote = document.createElement('span');
          radiusNote.className = 'pd-card__meta';

          statusBox.append(statusBadge, timerText, radiusNote);

          const toggleBtn = document.createElement('button');
          toggleBtn.type = 'button';
          toggleBtn.id = 'btn-start-domination';
          toggleBtn.className = 'btn btn--primary';
          toggleBtn.style.width = '100%';

          card.append(title, subtitle, statusBox, toggleBtn);
          container.appendChild(card);

          const getCoords = () => new Promise((resolve, reject) => {
            if (window.lastPlayerLocation && Number.isFinite(window.lastPlayerLocation.latitude)) {
              resolve(window.lastPlayerLocation);
              return;
            }
            if (!('geolocation' in navigator)) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy
              }),
              reject,
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
          });

          const renderUI = () => {
            const running = activeDomination &&
              String(activeDomination.gameId) === String(config.game_id) &&
              String(activeDomination.waypointId) === String(config.waypoint_id);

            if (!running) {
              statusBadge.textContent = 'Ready';
              statusBadge.dataset.state = 'idle';
              timerText.textContent = '0s held';
              radiusNote.textContent = config.validation_radius_m
                ? `Zone radius: ${formatDistanceLabel(config.validation_radius_m)}`
                : 'Live leaderboard available on map marker';
              toggleBtn.textContent = 'Start Dominating';
              toggleBtn.className = 'btn btn--primary';
              return;
            }

            const s = activeDomination.lastState || {};
            statusBadge.textContent = s.label || 'Dominating';
            statusBadge.dataset.state = s.state || 'holding';
            timerText.textContent = `${formatDominationDuration(s.hours || 0)} held`;
            radiusNote.textContent = s.detail || 'Tracking your position every 15s';
            toggleBtn.textContent = 'Stop Dominating';
            toggleBtn.className = 'btn btn--danger';
          };

          const ensureHudPill = () => {
            let hud = document.querySelector('.pd-hud-pill');
            if (!hud) {
              hud = document.createElement('div');
              hud.className = 'pd-hud-pill';
              const mapArea = document.querySelector('.map-modal .maparea');
              (mapArea || document.body).appendChild(hud);
            }
            return hud;
          };

          const updateHud = () => {
            if (!activeDomination || !activeDomination.hudEl) return;
            const s = activeDomination.lastState || {};
            const hud = activeDomination.hudEl;
            hud.dataset.state = s.state || 'holding';
            hud.innerHTML = '';

            const dot = document.createElement('span');
            dot.className = 'pd-hud-pill__dot';

            const info = document.createElement('div');
            info.className = 'pd-hud-pill__info';

            const line1 = document.createElement('strong');
            line1.textContent = `${s.label || 'Dominating'} • ${formatDominationDuration(s.hours || 0)}`;

            const line2 = document.createElement('span');
            line2.textContent = s.detail || (config.waypoint_title || 'Holding zone');

            info.append(line1, line2);

            const stopBtn = document.createElement('button');
            stopBtn.type = 'button';
            stopBtn.className = 'pd-hud-pill__stop';
            stopBtn.textContent = 'Stop';
            stopBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              stopActiveDomination();
              if (document.body.contains(card)) renderUI();
            });

            hud.append(dot, info, stopBtn);
          };

          const performPing = async () => {
            if (!activeDomination) return;
            try {
              const loc = await getCoords();
              const sensorData = getSensorDataAndReset();
              const API_BASE = window.API_BASE_URL || window.API_BASE || '';

              const res = await fetch(`${API_BASE}/api/game/${config.arg_id}/waypoint/${config.waypoint_id}/domination-ping`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  game_id: config.game_id,
                  lat: loc.latitude,
                  lng: loc.longitude,
                  accuracy_m: loc.accuracy,
                  ...sensorData
                })
              });

              if (!activeDomination) return;

              if (res.status === 403) {
                activeDomination.lastState = {
                  ...activeDomination.lastState,
                  state: 'warn',
                  label: 'Paused',
                  detail: 'Motion check flagged — walk naturally inside zone'
                };
              } else if (!res.ok) {
                throw new Error(`Ping HTTP ${res.status}`);
              } else {
                const data = await res.json();
                const hours = data.submissionData ? data.submissionData.cumulative_time_hours : 0;

                if (data.within_radius) {
                  mapModal.clearBounceHighlight(config.waypoint_id);
                  activeDomination.lastState = {
                    state: 'holding',
                    label: data.is_top_scorer ? 'Leading Zone' : 'Holding Zone',
                    hours,
                    detail: data.radius
                      ? `Inside ${formatDistanceLabel(data.radius)} radius (${formatDistanceLabel(data.distance)} from center)`
                      : 'Inside domination zone'
                  };
                } else {
                  mapModal.showNodeRadius(config.waypoint_id, data.radius || config.validation_radius_m || 30, {
                    highlightBounce: true,
                    distance: data.distance,
                    fitBounds: false
                  });
                  activeDomination.lastState = {
                    state: 'outside',
                    label: 'Out of Zone',
                    hours,
                    detail: `You are ${formatDistanceLabel(data.distance)} away — move within ${formatDistanceLabel(data.radius)} radius`
                  };
                }
              }
            } catch (err) {
              console.error('Domination ping error:', err);
              if (activeDomination) {
                activeDomination.lastState = {
                  ...activeDomination.lastState,
                  state: 'warn',
                  label: 'GPS Waiting',
                  detail: 'Waiting for location fix...'
                };
              }
            }

            if (activeDomination) {
              updateHud();
              if (document.body.contains(card)) renderUI();
            }
          };

          if (!isSameActive) {
            renderUI();
          } else {
            renderUI();
          }

          toggleBtn.addEventListener('click', async () => {
            const currentlyRunning = activeDomination &&
              String(activeDomination.gameId) === String(config.game_id) &&
              String(activeDomination.waypointId) === String(config.waypoint_id);

            if (currentlyRunning) {
              stopActiveDomination();
              renderUI();
              return;
            }

            if (!('geolocation' in navigator)) {
              radiusNote.textContent = 'Geolocation is not supported by your browser.';
              return;
            }

            // Replace any other active domination session cleanly
            stopActiveDomination();

            const hudEl = ensureHudPill();
            activeDomination = {
              argId: config.arg_id,
              waypointId: config.waypoint_id,
              gameId: config.game_id,
              hudEl,
              lastState: {
                state: 'holding',
                label: 'Connecting...',
                hours: 0,
                detail: 'Sending initial zone check...'
              },
              pingInterval: setInterval(performPing, 15000)
            };

            updateHud();
            renderUI();
            await performPing();
          });
        }
      };
    default:
      return {
        render: (container, config, onSubmit) => {
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
              <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Minigame type <strong>${gameType}</strong> not fully implemented in UI yet.</p>
              <button id="btn-fallback-submit" class="btn btn--primary">Mark Complete</button>
            </div>
          `;
          container.querySelector('#btn-fallback-submit').addEventListener('click', () => onSubmit({}));
        }
      };
  }
}
