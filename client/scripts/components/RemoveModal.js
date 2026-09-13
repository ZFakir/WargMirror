/**
 * RemoveModal Component
 * A reusable modal for confirming the removal of a WARG from recently played.
 */

export class RemoveModal {
  constructor() {
    this.initDOM();
    this.bindEvents();
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
    this.overlay.id = 'remove-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="remove-modal" role="dialog" aria-modal="true" aria-labelledby="remove-modal-title">
        <div class="remove-modal__header">
          <h2 class="remove-modal__title" id="remove-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--color-warning);">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            Remove from Recent
          </h2>
          <button class="remove-modal__close-btn" id="btn-remove-modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="remove-modal__body">
          <p>Are you sure you want to remove <strong id="remove-game-title">this game</strong> from your recently played list?</p>
          <p style="color: var(--color-text-secondary); font-size: var(--font-size-caption);">Your progress won't be deleted, but it will no longer show up in this section.</p>
        </div>
        <div class="remove-modal__footer">
          <button class="btn btn--outline" id="btn-remove-cancel">Cancel</button>
          <button class="btn btn--primary" id="btn-remove-submit">Remove</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.gameTitleEl = this.overlay.querySelector('#remove-game-title');
    this.closeBtn = this.overlay.querySelector('#btn-remove-modal-close');
    this.cancelBtn = this.overlay.querySelector('#btn-remove-cancel');
    this.submitBtn = this.overlay.querySelector('#btn-remove-submit');
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
      this.submitBtn.textContent = 'Removing...';
      this.submitBtn.disabled = true;

      try {
        if (typeof api !== 'undefined' && api.removeRecentArg) {
          await api.removeRecentArg(this.argId);
        } else {
          // Mock delay
          await new Promise(r => setTimeout(r, 600));
        }

        // Dispatch an event so the UI can update
        document.dispatchEvent(new CustomEvent('warg:removed-recent', {
          detail: { argId: this.argId }
        }));

        this.close();
      } catch (err) {
        console.error('Failed to remove recent arg', err);
        alert('Failed to remove game. Please try again.');
      } finally {
        this.submitBtn.textContent = origText;
        this.submitBtn.disabled = false;
      }
    });
  }

  isOpen() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  open(argId, gameTitle = 'this game') {
    this.argId = argId;
    this.gameTitleEl.textContent = gameTitle;
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Expose globally for non-module scripts like GameCard.js
if (typeof window !== 'undefined') {
  window.RemoveModal = RemoveModal;
}
