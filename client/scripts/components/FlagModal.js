/**
 * FlagModal Component
 * A reusable modal for flagging/reporting issues.
 * Injects its own HTML and CSS into the DOM.
 */

export class FlagModal {
  constructor() {
    this.argId = null;
    this.initDOM();
    this.bindEvents();
  }

  open(argId, title = 'Report / Flag') {
    this.argId = argId;
    this.overlay.querySelector('#flag-modal-title').innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
        <line x1="4" y1="22" x2="4" y2="15"/>
      </svg>
      ${title}
    `;
    this.overlay.setAttribute('aria-hidden', 'false');
    this.subjectInput.value = '';
    this.descriptionInput.value = '';
    this.subjectInput.focus();
  }

  initDOM() {
    // Inject the CSS link if it doesn't exist
    if (!document.querySelector('link[href*="flag-modal.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'styles/components/flag-modal.css';
      document.head.appendChild(link);
    }

    // Create the overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'flag-modal-overlay';
    this.overlay.id = 'flag-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="flag-modal" role="dialog" aria-modal="true" aria-labelledby="flag-modal-title">
        <div class="flag-modal__header">
          <h2 class="flag-modal__title" id="flag-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
            Report / Flag
          </h2>
          <button class="flag-modal__close-btn" id="btn-flag-modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="flag-modal__body">
          <div class="form-group">
            <label for="flag-reason">Reason</label>
            <select id="flag-reason">
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="inaccurate_location">Inaccurate Location</option>
              <option value="safety_concern">Safety Concern</option>
              <option value="spam">Spam</option>
              <option value="copyright">Copyright Violation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="flag-description">Description</label>
            <textarea id="flag-description" placeholder="Please provide more details..."></textarea>
          </div>
        </div>
        <div class="flag-modal__footer">
          <button class="btn btn--outline" id="btn-flag-cancel">Cancel</button>
          <button class="btn btn--primary" id="btn-flag-submit">Submit</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.reasonInput = this.overlay.querySelector('#flag-reason');
    this.descriptionInput = this.overlay.querySelector('#flag-description');
    this.closeBtn = this.overlay.querySelector('#btn-flag-modal-close');
    this.cancelBtn = this.overlay.querySelector('#btn-flag-cancel');
    this.submitBtn = this.overlay.querySelector('#btn-flag-submit');
  }

  bindEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    
    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    // Submit behavior
    this.submitBtn.addEventListener('click', async () => {
      const reason = this.reasonInput.value;
      const description = this.descriptionInput.value.trim();

      if (!reason) {
        alert("Please select a reason.");
        return;
      }

      const origText = this.submitBtn.textContent;
      this.submitBtn.textContent = 'Submitting...';
      this.submitBtn.disabled = true;

      try {
        if (typeof api !== 'undefined' && api.flagArg) {
          await api.flagArg(this.argId, reason, description);
        } else {
          console.warn('API not found, mocking submission');
          await new Promise(r => setTimeout(r, 800));
        }
        
        this.submitBtn.textContent = 'Reported!';
        this.submitBtn.style.background = 'var(--color-success)';
        
        setTimeout(() => {
          this.close();
          this.submitBtn.textContent = origText;
          this.submitBtn.style.background = '';
          this.submitBtn.disabled = false;
        }, 1500);
      } catch (err) {
        console.error('Failed to submit flag', err);
        alert('Failed to submit report. Please try again.');
        this.submitBtn.textContent = origText;
        this.submitBtn.disabled = false;
      }
    });
  }

  isOpen() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  close() {
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Expose globally for non-module scripts like GameCard.js
if (typeof window !== 'undefined') {
  window.FlagModal = FlagModal;
}
