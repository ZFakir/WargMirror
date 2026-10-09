/**
 * Minigame Handlers Registry
 * Exports a function to get the UI handler for a specific game type.
 */
/* global Html5QrcodeScanner */

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
          if (config.is_mcq && config.options) {
            let optionsHtml = config.options.map((opt, idx) => `
              <label style="display: flex; align-items: center; gap: 0.5rem; background: var(--color-bg-elevated); padding: 0.8rem; border: 1px solid var(--color-border); border-radius: var(--radius-md); cursor: pointer;">
                <input type="radio" name="mcq-option" value="${idx}" />
                <span>${opt}</span>
              </label>
            `).join('');

            container.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 1rem; padding: 1rem;">
                <h3 style="font-weight: 600; font-size: var(--text-lg); margin-bottom: 0.5rem; color: var(--color-text-primary);">${config.question || config.hint || 'Question'}</h3>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  ${optionsHtml}
                </div>
                <button id="btn-submit-answer" class="btn btn--primary" style="margin-top: 0.5rem;">Submit</button>
              </div>
            `;
            container.querySelector('#btn-submit-answer').addEventListener('click', () => {
               const selected = container.querySelector('input[name="mcq-option"]:checked');
               if (selected) {
                 // Send the index back as a string, backend handles parsing
                 onSubmit(selected.value);
               } else {
                 alert('Please select an option.');
               }
            });
          } else {
            container.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem;">
                <label for="text-answer-input" style="font-weight: 500;">${config.hint || 'Enter answer'}</label>
                <input type="text" id="text-answer-input" class="input-field" placeholder="Type here..." autocomplete="off" />
                <button id="btn-submit-answer" class="btn btn--primary" style="margin-top: 0.5rem;">Submit</button>
              </div>
            `;
            container.querySelector('#btn-submit-answer').addEventListener('click', () => {
               const val = container.querySelector('#text-answer-input').value;
               onSubmit(val);
            });
          }
        }
      };
    case 'qr_barcode':
      return {
        render: (container, config, onSubmit) => {
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
               <p style="margin-bottom: 1rem; color: var(--color-text-muted);">Scan the hidden QR or Barcode.</p>
               <div id="gameplay-barcode-scanner-container" style="width: 100%; max-width: 400px; margin: 0 auto; overflow: hidden; border-radius: 8px;"></div>
               <button id="btn-scan-barcode" class="btn btn--primary" style="margin-top: 1rem;">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; margin-right: 6px; vertical-align: middle;"><path d="M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M9 9h6v6H9z"></path></svg>
                 <span style="vertical-align: middle;">Start Scanner</span>
               </button>
               <div style="margin-top: 1rem;">
                 <a href="#" id="link-manual-entry" style="font-size: 12px; color: var(--color-brand); text-decoration: none;">Having trouble? Enter manually</a>
                 <div id="manual-entry-container" style="display: none; margin-top: 0.5rem; gap: 0.5rem; flex-direction: column;">
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
          
          btnScan.addEventListener('click', () => {
            if (scanner) return;
            btnScan.style.display = 'none';
            scanner = new Html5QrcodeScanner(
              "gameplay-barcode-scanner-container", 
              { fps: 10, qrbox: {width: 250, height: 250} }, 
              /* verbose= */ false
            );
            scanner.render((decodedText) => {
              scanner.clear().catch(err => console.error(err));
              scanner = null;
              onSubmit(decodedText);
            }, () => {
              // ignore parse errors
            });
          });

          linkManual.addEventListener('click', (e) => {
            e.preventDefault();
            manualContainer.style.display = 'flex';
            if (scanner) {
              scanner.clear().catch(err => console.error(err));
              scanner = null;
              btnScan.style.display = 'inline-block';
            }
          });

          btnSubmitManual.addEventListener('click', () => {
            const val = inputOverride.value.trim();
            if (val) onSubmit(val);
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
              onSubmit(base64Data);
            }
          });
        }
      };
    case 'point_domination':
      return {
        render: async (container, config) => {
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: var(--color-bg-elevated); border-radius: var(--radius-md);">
              <h3 style="margin-bottom: 1rem; color: var(--color-brand);">Point Domination</h3>
              <p style="font-size: 0.9rem; color: var(--color-text-muted); margin-bottom: 1.5rem;">Stay within this location to accumulate points over time. The leaderboard is visible on the map marker.</p>
              <button id="btn-start-domination" class="btn btn--primary" style="width: 100%;">Start Dominating</button>
            </div>
          `;

          const btnStart = container.querySelector('#btn-start-domination');

          btnStart.addEventListener('click', () => {
             const confirmed = confirm("This game will continue to track your location in the background as long as you are on this website. Are you sure you want to start?");
             if (!confirmed) return;

             btnStart.disabled = true;
             btnStart.textContent = "Dominating... (Background)";
             btnStart.style.backgroundColor = "var(--color-success)";

             if ('geolocation' in navigator) {
                // Throttle pings to every ~30 seconds
                let lastPingTime = 0;
                
                navigator.geolocation.watchPosition(async (position) => {
                   const now = Date.now();
                   if (now - lastPingTime < 30000) return; // 30 sec throttle
                   lastPingTime = now;

                   let sensorData = {};
                   // Make sure getSensorDataAndReset is exported to window if used from sensors.js
                   // Wait, sensors.js is an ES module. It's not on window. 
                   // To avoid dependency errors, we'll try to find it or send empty for now if not globally exposed.

                   try {
                     const API_BASE = window.API_BASE || '';
                     await fetch(`${API_BASE}/api/game/${config.arg_id}/waypoint/${config.waypoint_id}/domination-ping`, {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       credentials: 'include',
                       body: JSON.stringify({
                         game_id: config.game_id,
                         lat: position.coords.latitude,
                         lng: position.coords.longitude,
                         accuracy_m: position.coords.accuracy,
                         sensor_data: sensorData
                       })
                     });
                   } catch(e) {
                     console.error("Domination ping failed", e);
                   }
                }, (err) => {
                   console.error("WatchPosition error:", err);
                }, {
                   enableHighAccuracy: true,
                   maximumAge: 10000
                });
             } else {
                alert("Geolocation is not supported by your browser.");
             }
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
