/**
 * Minigame Handlers Registry
 * Exports a function to get the UI handler for a specific game type.
 */

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
               <button id="btn-scan-barcode" class="btn btn--primary">Scan Barcode</button>
               <input type="text" id="qr-override" class="input-field" style="margin-top: 1rem; display: none;" placeholder="Enter code manually (dev)" />
            </div>
          `;
          const btn = container.querySelector('#btn-scan-barcode');
          const input = container.querySelector('#qr-override');
          btn.addEventListener('click', () => {
             // Mock scanner UI for development
             input.style.display = 'block';
             btn.textContent = 'Submit Code';
             btn.addEventListener('click', () => {
                onSubmit(input.value);
             }, { once: true });
          }, { once: true });
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
