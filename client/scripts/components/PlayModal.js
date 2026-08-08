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
   * Returns the canvas element or its context for game rendering
   */
  getCanvas() {
    return this.canvas;
  }
}

// Singleton instance
const playModal = new PlayModal();
export default playModal;
