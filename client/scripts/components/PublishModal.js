/**
 * PublishModal Component
 * A reusable modal for confirming the publishing of a WARG.
 */

export class PublishModal {
  constructor() {
    this.initDOM();
    this.bindEvents();
  }

  initDOM() {
    // Inject the CSS link if it doesn't exist
    if (!document.querySelector('link[href*="publish-modal.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'styles/components/publish-modal.css';
      document.head.appendChild(link);
    }

    // Create the overlay container
    this.overlay = document.createElement('div');
    this.overlay.className = 'publish-modal-overlay';
    this.overlay.id = 'publish-modal-overlay';
    this.overlay.setAttribute('aria-hidden', 'true');

    this.overlay.innerHTML = `
      <div class="publish-modal" role="dialog" aria-modal="true" aria-labelledby="publish-modal-title">
        <div class="publish-modal__header">
          <h2 class="publish-modal__title" id="publish-modal-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Publish WARG
          </h2>
          <button class="publish-modal__close-btn" id="btn-publish-modal-close" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="publish-modal__body">
          <p>Are you sure you want to publish <strong id="publish-game-title">this game</strong>?</p>
          <p style="color: var(--color-text-secondary); font-size: var(--font-size-caption);">Once published, it will be visible to all players in the catalogue. You can still make edits after publishing.</p>
        </div>
        <div class="publish-modal__footer">
          <button class="btn btn--outline" id="btn-publish-cancel">Cancel</button>
          <button class="btn btn--primary" id="btn-publish-submit">Publish</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    this.gameTitleEl = this.overlay.querySelector('#publish-game-title');
    this.closeBtn = this.overlay.querySelector('#btn-publish-modal-close');
    this.cancelBtn = this.overlay.querySelector('#btn-publish-cancel');
    this.submitBtn = this.overlay.querySelector('#btn-publish-submit');
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

    // Mock submit behavior
    this.submitBtn.addEventListener('click', () => {
      const origText = this.submitBtn.textContent;
      const isUnpublish = this.action === 'unpublish';
      this.submitBtn.textContent = isUnpublish ? 'Unpublishing...' : 'Publishing...';
      this.submitBtn.disabled = true;

      setTimeout(() => {
        this.submitBtn.textContent = origText;
        this.submitBtn.disabled = false;
        this.close();
        
        alert(`WARG ${isUnpublish ? 'unpublished' : 'published'} successfully!`);
      }, 800);
    });
  }

  isOpen() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  open(gameTitle = 'this game', action = 'publish') {
    this.action = action;
    this.gameTitleEl.textContent = gameTitle;
    
    const titleEl = this.overlay.querySelector('#publish-modal-title');
    const descEl = this.overlay.querySelector('.publish-modal__body p:last-child');
    
    if (action === 'unpublish') {
      titleEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 16 12 21 17 16"/>
          <line x1="12" y1="21" x2="12" y2="9"/>
        </svg>
        Unpublish WARG
      `;
      descEl.textContent = 'Once unpublished, this game will no longer be visible in the catalogue or playable by new users.';
      this.submitBtn.textContent = 'Unpublish';
      this.submitBtn.className = 'btn btn--primary'; // Keep it primary, but maybe a warning style? Let's use outline for cancel and primary for submit
    } else {
      titleEl.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color: var(--color-success);">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Publish WARG
      `;
      descEl.textContent = 'Once published, it will be visible to all players in the catalogue. You can still make edits after publishing.';
      this.submitBtn.textContent = 'Publish';
      this.submitBtn.className = 'btn btn--primary';
    }

    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}
