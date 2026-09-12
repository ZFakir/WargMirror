/**
 * PlayMenu Modal Component
 * Handles the display of the current waypoint, rendering the canvas space,
 * and providing a modular API for developers to inject controls.
 */

export class PlayModal {
  constructor() {
    this.overlay = document.getElementById('play-modal-overlay');
    this.titleEl = document.getElementById('play-modal-title');
    this.descriptionEl = document.getElementById('play-modal-description');
    this.readMoreBtn = document.getElementById('btn-read-more');
    this.closeBtn = document.getElementById('btn-play-modal-close');
    this.controlsContainer = document.getElementById('play-modal-controls');
    this.canvas = document.getElementById('play-canvas');
    this.canvasWrapper = this.canvas ? this.canvas.parentElement : null;

    if (!this.overlay) return; // Not initialized

    this.bindEvents();
  }

  bindEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    
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

    this.readMoreBtn.addEventListener('click', () => this.toggleReadMore());
  }

  isOpen() {
    return this.overlay.getAttribute('aria-hidden') === 'false';
  }

  open(title, description) {
    this.titleEl.textContent = title || 'Unknown Waypoint';
    this.descriptionEl.textContent = description || '';
    
    if (this.canvasWrapper) {
      this.canvasWrapper.style.display = 'none';
    }

    this.resetReadMore();

    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling

    // Check if we need the read more button after rendering
    // A small delay ensures the DOM has painted the new text
    setTimeout(() => {
      if (this.descriptionEl.scrollHeight > this.descriptionEl.clientHeight) {
        this.readMoreBtn.hidden = false;
      } else {
        this.readMoreBtn.hidden = true;
      }
    }, 50);
  }

  close() {
    if (document.activeElement && this.overlay.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  resetReadMore() {
    this.descriptionEl.classList.remove('is-expanded');
    this.readMoreBtn.textContent = 'Read more';
    this.readMoreBtn.hidden = true;
  }

  toggleReadMore() {
    const isExpanded = this.descriptionEl.classList.toggle('is-expanded');
    this.readMoreBtn.textContent = isExpanded ? 'Read less' : 'Read more';
  }

  /**
   * Modular API to inject controls below the canvas
   * @param {HTMLElement|HTMLElement[]|string} controls 
   */
  setControls(controls) {
    this.controlsContainer.innerHTML = '';
    
    if (typeof controls === 'string') {
      this.controlsContainer.innerHTML = controls;
    } else if (Array.isArray(controls)) {
      controls.forEach(el => this.controlsContainer.appendChild(el));
    } else if (controls instanceof HTMLElement) {
      this.controlsContainer.appendChild(controls);
    }
  }

  /**
   * Clears the controls area
   */
  clearControls() {
    this.controlsContainer.innerHTML = '';
  }

  /**
   * Render feedback toast in the modal
   */
  showFeedback(outcome, autoClose = true) {
    const feedbackEl = document.createElement('div');
    feedbackEl.style = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${outcome === 'pass' ? 'var(--color-green)' : 'var(--color-red)'};
      color: var(--color-bg-base);
      padding: 1rem 2rem;
      border-radius: var(--radius-md);
      font-weight: bold;
      font-size: 1.2rem;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    feedbackEl.textContent = outcome === 'pass' ? 'Success!' : 'Failed';
    this.controlsContainer.appendChild(feedbackEl);
    
    setTimeout(() => {
      if (feedbackEl.parentNode) {
        feedbackEl.remove();
      }
      if (autoClose) {
        this.close();
      }
    }, 2000);
  }

  /**
   * Returns the canvas element or its context for game rendering
   */
  getCanvas() {
    if (this.canvasWrapper) {
      this.canvasWrapper.style.display = 'flex'; // or whatever its default was
    }
    return this.canvas;
  }
}

// Singleton instance
const playModal = new PlayModal();
export default playModal;
