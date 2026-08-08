/**
 * FlagModal Component
 * A reusable modal for flagging/reporting issues.
 * Injects its own HTML and CSS into the DOM.
 */

export class FlagModal {
  constructor() {
    this.initDOM();
    this.bindEvents();
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
            <label for="flag-subject">Subject</label>
            <input type="text" id="flag-subject" placeholder="What is the issue?" autocomplete="off" />
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

    this.subjectInput = this.overlay.querySelector('#flag-subject');
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

    // Mock submit behavior
    this.submitBtn.addEventListener('click', () => {
      const subject = this.subjectInput.value.trim();
      const description = this.descriptionInput.value.trim();

      if (!subject || !description) {
        alert("Please fill out both the subject and description.");
        return;
      }

      // Simulate a successful submission
      const origText = this.submitBtn.textContent;
      this.submitBtn.textContent = 'Submitting...';
      this.submitBtn.disabled = true;

      setTimeout(() => {
        this.submitBtn.textContent = origText;
        this.submitBtn.disabled = false;
        this.close();
        
        // Optional: show a toast or alert that it was successful
        alert("Report submitted successfully! Thanks for keeping the platform safe.");
      }, 800);
    });
  }

  isOpen() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  open(context = '') {
    if (context) {
      this.subjectInput.value = context;
    } else {
      this.subjectInput.value = '';
    }
    this.descriptionInput.value = '';
    
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    
    // Auto-focus subject input slightly after modal appears
    setTimeout(() => {
      this.subjectInput.focus();
    }, 100);
  }

  close() {
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}
