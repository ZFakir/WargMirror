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
          container.innerHTML = `
            <div style="text-align: center; padding: 1rem;">
              <p style="margin-bottom: 1rem; color: var(--color-text-muted);">Ensure you are physically at this location.</p>
              <button id="btn-verify-location" class="btn btn--primary">Verify Location</button>
            </div>
          `;
          container.querySelector('#btn-verify-location').addEventListener('click', () => {
             // In GPS proximity, we just submit an empty payload. The server validates proximity before this, 
             // but we can also just do an empty submit since /arrive passed.
             onSubmit({}); 
          });
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
