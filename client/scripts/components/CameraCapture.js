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
    this.onScoreUpdate = null; // Stub for score updates, currently unused until snap
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
      this.canvasElement.width = this.videoElement.videoWidth;
      this.canvasElement.height = this.videoElement.videoHeight;
      const ctx = this.canvasElement.getContext('2d');
      ctx.drawImage(this.videoElement, 0, 0, this.canvasElement.width, this.canvasElement.height);
      
      this.canvasElement.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/jpeg', 0.9);
    });
  }
}
