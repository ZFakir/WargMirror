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
    
    // Only lock background scrolling on desktop. On mobile, we want the map scrollable.
    if (!window.matchMedia('(max-width: 768px)').matches) {
      document.body.style.overflow = 'hidden'; 
    }

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
  showFeedback(outcome, autoClose = true, canRetry = false) {
    this.controlsContainer.innerHTML = '';
    
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'minigame-feedback-container';
    feedbackEl.style = 'text-align: center; padding: 2rem; background: var(--color-bg-elevated); border-radius: var(--radius-md); animation: fadeIn 0.3s ease;';
    
    let iconHtml = '';
    let textHtml = '';
    
    if (outcome === 'pass') {
      iconHtml = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-green, #4ade80)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      textHtml = '<p style="color: var(--color-green, #4ade80); font-weight: bold; margin: 0; font-size: 1.1rem;">Success!</p>';
    } else {
      iconHtml = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger, #ef4444)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      textHtml = `<p style="color: var(--color-danger, #ef4444); font-weight: bold; margin: 0; font-size: 1.1rem;">Failed</p>${canRetry ? '<p style="color: var(--color-text-muted); margin: 0.25rem 0 0 0; font-size: 0.9rem;">Try again...</p>' : ''}`;
    }
    
    feedbackEl.innerHTML = `
      <div class="spinner-container" style="position: relative; width: 60px; height: 60px; margin: 0 auto 1rem;">
        <div class="spinner" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 4px solid var(--color-bg-elevated); border-radius: 50%; box-sizing: border-box; border-color: ${outcome === 'pass' ? 'var(--color-green, #4ade80)' : 'var(--color-danger, #ef4444)'}"></div>
        <div class="feedback-icon" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1); display: flex; align-items: center; justify-content: center;">
          ${iconHtml}
        </div>
      </div>
      <div class="feedback-text-container" style="min-height: 2.5rem; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        ${textHtml}
      </div>
    `;
    
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
