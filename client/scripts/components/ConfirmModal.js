/**
 * ConfirmModal Component
 * A reusable modal for generic confirmations (delete game, ban user, delete comment).
 */

class ConfirmModal {
  constructor() {
    this.initDOM();
    this.bindEvents();
    this.callback = null;
  }

  initDOM() {
    // Inject the CSS link if it doesn't exist
    if (!document.querySelector('link[href*="remove-modal.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'styles/components/remove-modal.css';
      document.head.appendChild(link);
    }

    // Create the overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'remove-modal-overlay';
    this.overlay.id = 'generic-confirm-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="remove-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div class="remove-modal__header">
          <h2 class="remove-modal__title" id="generic-confirm-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--color-warning);">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Confirm Action
          </h2>
          <button class="remove-modal__close-btn" id="btn-generic-confirm-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="remove-modal__body">
          <p id="generic-confirm-desc">Are you sure?</p>
        </div>
        <div class="remove-modal__footer">
          <button class="btn btn--outline" id="btn-generic-confirm-cancel">Cancel</button>
          <button class="btn btn--primary btn--danger" id="btn-generic-confirm-submit">Confirm</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.titleEl = this.overlay.querySelector('#generic-confirm-modal-title');
    this.descEl = this.overlay.querySelector('#generic-confirm-desc');
    this.closeBtn = this.overlay.querySelector('#btn-generic-confirm-close');
    this.cancelBtn = this.overlay.querySelector('#btn-generic-confirm-cancel');
    this.submitBtn = this.overlay.querySelector('#btn-generic-confirm-submit');
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
      const origText = this.submitBtn.textContent;
      this.submitBtn.textContent = 'Processing...';
      this.submitBtn.disabled = true;

      try {
        if (this.callback) {
          await this.callback();
        }
        this.close();
      } catch (err) {
        console.error(err);
      } finally {
        this.submitBtn.textContent = origText;
        this.submitBtn.disabled = false;
      }
    });
  }

  isOpen() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  open({ title, desc, confirmText, callback }) {
    if (title) this.titleEl.innerHTML = this.titleEl.innerHTML.replace('Confirm Action', title);
    if (desc) this.descEl.innerHTML = desc;
    if (confirmText) this.submitBtn.textContent = confirmText;
    
    this.callback = callback;
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    this.callback = null;
  }
}

// Instantiate a global singleton
if (typeof window !== 'undefined') {
  window.confirmModal = new ConfirmModal();
}
