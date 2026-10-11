export class CameraCapture {
  constructor(container, gameType, refData) {
    this.container = container;
    this.gameType = gameType;
    this.refData = refData;
    
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;
    this.videoElement.style.width = '100%';
    this.videoElement.style.height = '100%';
    this.videoElement.style.objectFit = 'cover';
    
    this.canvasElement = document.createElement('canvas');
    this.canvasElement.style.display = 'none';

    this.overlayImage = document.createElement('img');
    this.overlayImage.style.position = 'absolute';
    this.overlayImage.style.top = '0';
    this.overlayImage.style.left = '0';
    this.overlayImage.style.width = '100%';
    this.overlayImage.style.height = '100%';
    this.overlayImage.style.objectFit = 'contain';
    this.overlayImage.style.opacity = '0.4';
    this.overlayImage.style.pointerEvents = 'none'; // Don't block clicks

    if (this.refData instanceof Blob) {
      this.overlayImage.src = URL.createObjectURL(this.refData);
    } else if (this.refData && this.refData.url) {
      this.overlayImage.src = this.refData.url;
    }
    
    this.stream = null;
    this.spinnerElement = null;
    this.onScoreUpdate = null; // Stub for score updates, currently unused until snap
  }

  showSpinner(message = 'Analyzing...') {
    if (!document.getElementById('camera-spinner-keyframes')) {
      const style = document.createElement('style');
      style.id = 'camera-spinner-keyframes';
      style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
      document.head.appendChild(style);
    }
    if (this.container && getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    if (this.spinnerElement) {
      const textElem = this.spinnerElement.querySelector('.camera-spinner-text');
      if (textElem) textElem.textContent = message;
      return;
    }
    this.spinnerElement = document.createElement('div');
    this.spinnerElement.className = 'camera-spinner-overlay';
    this.spinnerElement.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;z-index:999;padding:20px;text-align:center;box-sizing:border-box;';
    this.spinnerElement.innerHTML = `
      <div class="camera-spinner" style="width:48px;height:48px;border:4px solid rgba(255,255,255,0.2);border-top-color:var(--color-brand,#ff6600);border-radius:50%;animation:spin 0.8s linear infinite;box-shadow:0 0 16px rgba(255,102,0,0.45);margin-bottom:14px;"></div>
      <p class="camera-spinner-text" style="font-size:1rem;font-weight:600;color:#ffffff;margin:0 0 4px 0;letter-spacing:0.5px;">${message}</p>
      <span class="camera-spinner-subtext" style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin:0;">Comparing with waypoint target...</span>
    `;
    this.container.appendChild(this.spinnerElement);
  }

  hideSpinner() {
    if (this.spinnerElement) {
      if (this.spinnerElement.parentNode) {
        this.spinnerElement.parentNode.removeChild(this.spinnerElement);
      }
      this.spinnerElement = null;
    }
  }

  async start() {
    this.container.appendChild(this.videoElement);
    this.container.appendChild(this.canvasElement);
    
    if (this.overlayImage.src) {
      this.container.appendChild(this.overlayImage);
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      this.videoElement.srcObject = this.stream;
    } catch (err) {
      console.error('Error accessing camera:', err);
      throw new Error('Camera permission denied or camera not found.', { cause: err });
    }
  }

  stop() {
    this.hideSpinner();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      if (this.videoElement.parentNode) {
        this.videoElement.parentNode.removeChild(this.videoElement);
      }
    }
    if (this.overlayImage && this.overlayImage.src && this.overlayImage.src.startsWith('blob:')) {
      URL.revokeObjectURL(this.overlayImage.src);
    }
    if (this.overlayImage && this.overlayImage.parentNode) {
      this.overlayImage.parentNode.removeChild(this.overlayImage);
    }
  }

  async snap() {
    return new Promise((resolve, reject) => {
      if (!this.videoElement.videoWidth) {
        return reject(new Error('Video not ready'));
      }

      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = this.videoElement.videoWidth;
      let height = this.videoElement.videoHeight;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }

      this.canvasElement.width = width;
      this.canvasElement.height = height;
      const ctx = this.canvasElement.getContext('2d');
      ctx.drawImage(this.videoElement, 0, 0, width, height);
      
      this.canvasElement.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.7);
    });
  }
}
