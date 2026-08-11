/**
 * Map Modal Component
 * 
 * Reusable modal displaying a Leaflet map and field log sidebar.
 * It dynamically injects its required HTML and CSS to stay modular.
 */

export class MapModal {
  constructor() {
    this.isInitialized = false;
    this.isMapRendered = false;
    this.map = null;
    this.markerLookup = {};
    
    // Core data
    this.NODES = [
      { id:'great-hall', name:'Cipher at the Great Hall', lat:-26.19233, lng:28.02987, type:'solo', status:'completed', desc:'Solve cryptographic puzzles hidden in the architecture of Wits’ Great Hall.', progress:100, progLabel:'5 / 5 waypoints' },
      { id:'east-campus', name:'Symmetry Hunt — East Campus', lat:-26.19075, lng:28.03215, type:'solo', status:'completed', desc:'Find and photograph pairs of architecturally mirrored structures.', progress:100, progLabel:'Completed' },
      { id:'shadow-tracer', name:'Shadow Tracer', lat:-26.18975, lng:28.02870, type:'coop', status:'current', desc:'A team of up to 4 players follows shadow clues cast by campus landmarks at set times of day.', progress:29, progLabel:'2 / 7 waypoints' },
      { id:'braamfontein', name:'Then & Now — Braamfontein', lat:-26.19420, lng:28.03310, type:'solo', status:'locked', desc:'Match historical photographs of Braamfontein to their present-day locations.', progress:0, progLabel:'Not started' },
      { id:'senate-house', name:'Point Domination — Senate House', lat:-26.19011, lng:28.02958, type:'pvp', status:'locked', desc:'Capture and hold zones around Senate House. The team with the most control time wins.', progress:0, progLabel:'Not started' },
      { id:'plaque-hunter', name:'Plaque Hunter: Origins', lat:-26.19320, lng:28.02790, type:'solo', status:'locked', desc:'Discover 9 commemorative plaques across campus and unlock the story behind each.', progress:0, progLabel:'0 / 9 plaques' },
      { id:'west-campus', name:'AR Photo-Bombs — West Campus', lat:-26.19520, lng:28.02690, type:'pvp', status:'locked', desc:'Plant AR tags on opponents’ selfies before they notice. Most successful tags wins.', progress:0, progLabel:'Not started' },
      { id:'humanities', name:'Landmark Relay — Humanities', lat:-26.18890, lng:28.03080, type:'coop', status:'locked', desc:'Teams of 3 race to collect digital tokens from 10 Humanities faculty landmarks.', progress:0, progLabel:'0 / 10 tokens' },
    ];
    this.BADGE_LABEL = { solo:'Solo', coop:'Co-op', pvp:'PvP' };
    
    this.clockInterval = null;
  }

  /**
   * Inject dependencies and DOM elements once
   */
  loadCSS(href) {
    return new Promise((resolve) => {
      // Very basic check, better to match exactly or by ID in a real app, but this works for our specific links
      const fileName = href.split('/').pop();
      if (document.querySelector(`link[href*="${fileName}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = () => resolve();
      link.onerror = () => resolve(); // continue even if it fails
      document.head.appendChild(link);
    });
  }

  async init() {
    if (this.isInitialized) return;

    // 1. & 2. Inject CSS and wait for them to load
    await Promise.all([
      this.loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'),
      this.loadCSS('styles/map-modal.css')
    ]);

    // 3. Inject Leaflet JS if needed, and wait for it
    await this.loadLeafletJS();

    // 4. Inject Modal HTML structure
    this.injectHTML();

    // 5. Cache DOM elements
    this.container = document.querySelector('.map-modal');
    this.fullscreenBtn = document.getElementById('btn-map-fullscreen');
    this.listEl = document.getElementById('map-nodeList');
    
    // 6. Bind events
    this.bindEvents();
    
    this.startClock();

    // Init map rendering immediately
    setTimeout(() => {
      this.initMapAndNodes();
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 50);

    this.isInitialized = true;
  }

  loadLeafletJS() {
    return new Promise((resolve, reject) => {
      if (window.L) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Leaflet script'));
      document.head.appendChild(script);
    });
  }

  injectHTML() {
    const target = document.getElementById('game-map');
    if (!target || target.querySelector('.map-modal')) return;

    const html = `
        <div class="map-modal" aria-labelledby="map-modal-title">
          
          <button class="map-modal__close-btn" id="btn-map-fullscreen" aria-label="Toggle Fullscreen" title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>

          <div class="wrap">
            <aside class="fieldlog">
              <div class="fieldlog__head">
                <div class="fieldlog__eyebrow">Signal Active</div>
                <div class="fieldlog__title" id="map-modal-title">Field Log</div>
                <div class="fieldlog__progress">
                  <div class="fieldlog__track"><div class="fieldlog__fill" id="map-progressFill"></div></div>
                  <div class="fieldlog__count" id="map-progressCount">0 / 0</div>
                </div>
              </div>
              <div class="fieldlog__list" id="map-nodeList"></div>
              <div class="fieldlog__foot">
                <span>WITS_MAIN_CAMPUS</span>
                <span id="map-footClock">--:--:--</span>
              </div>
            </aside>

            <div class="maparea">
              <div id="map-modal-leaflet"></div>
              <div class="scan-overlay"></div>
              <div class="scan-sweep"></div>
              <div class="hud">
                <div class="hud__badge">TRACKING</div>
                <div class="hud__title">
                  <strong>Campus Node Network</strong>
                  <span>tap a marker to open the brief</span>
                </div>
              </div>
            </div>
          </div>
        </div>
    `;

    target.innerHTML = html;
  }

  bindEvents() {
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }
    
    // Close fullscreen on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isFullscreen()) {
        this.toggleFullscreen();
      }
    });
  }

  startClock() {
    const clockEl = document.getElementById('map-footClock');
    const tickClock = () => {
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString('en-GB');
      }
    };
    tickClock();
    this.clockInterval = setInterval(tickClock, 1000);
  }

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  initMapAndNodes() {
    if (this.isMapRendered || !window.L) return;

    this.map = L.map('map-modal-leaflet', { zoomControl: true }).setView([-26.19180, 28.02990], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abc',
      maxZoom: 19
    }).addTo(this.map);

    this.NODES.forEach(node => {
      const marker = L.marker([node.lat, node.lng], { icon: this.iconFor(node) }).addTo(this.map);
      marker.bindPopup(this.popupHTML(node), { closeButton: true, className: '' });
      this.markerLookup[node.id] = marker;
    });

    // Handle clicks inside popups
    this.map.on('popupopen', (e) => {
      const btn = e.popup._contentNode.querySelector('.map-play-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          const nodeId = btn.getAttribute('data-node-id');
          const node = this.NODES.find(n => n.id === nodeId);
          if (node) {
            // Dispatch custom event that game.js can listen for
            document.dispatchEvent(new CustomEvent('warg:play-node', { detail: node }));
            this.close(); // optionally close the map
          }
        });
      }
    });

    this.renderList();
    this.isMapRendered = true;
  }

  iconFor(node) {
    const cls = node.status === 'completed' ? 'completed' : (node.status === 'current' ? 'current' : 'locked');
    const glyph = node.status === 'completed' ? '✓' : (node.status === 'locked' ? '•' : (this.BADGE_LABEL[node.type][0]));
    const ping = node.status === 'current' ? '<span class="ping"></span><span class="ping delay"></span>' : '';
    return L.divIcon({
      className: '',
      html: `<div class="node-marker ${cls}">${ping}<div class="node-marker__core">${glyph}</div></div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14]
    });
  }

  popupHTML(node) {
    let btn;
    if (node.status === 'locked') {
      btn = `<div class="pc__btn pc__btn--locked">Locked</div>`;
    } else if (node.status === 'completed') {
      btn = `<div class="pc__btn pc__btn--done">Completed</div>`;
    } else {
      btn = `<div class="pc__btn pc__btn--go map-play-btn" data-node-id="${node.id}">Play</div>`;
    }
    return `
      <div class="pc">
        <span class="pc__badge pc__badge--${node.type}">${this.BADGE_LABEL[node.type]}</span>
        <div class="pc__title">${node.name}</div>
        <div class="pc__desc">${node.desc}</div>
        <div class="pc__coords">${node.lat.toFixed(5)}, ${node.lng.toFixed(5)}</div>
        <div class="pc__row">
          <div class="pc__track"><div class="pc__fill" style="width:${node.progress}%"></div></div>
          <div class="pc__label">${node.progLabel}</div>
        </div>
        ${btn}
      </div>`;
  }

  renderList() {
    this.listEl.innerHTML = '';
    this.NODES.forEach(node => {
      const row = document.createElement('div');
      row.className = `node-row status-${node.status}`;
      row.innerHTML = `
        <div class="node-row__dot"></div>
        <div class="node-row__info">
          <div class="node-row__name">${node.name}</div>
          <div class="node-row__meta">${node.status === 'locked' ? 'Locked' : node.progLabel}</div>
        </div>`;
      
      row.addEventListener('click', () => {
        this.map.flyTo([node.lat, node.lng], 17, { duration: 0.6 });
        this.markerLookup[node.id].openPopup();
      });
      
      this.listEl.appendChild(row);
    });
    
    const done = this.NODES.filter(n => n.status === 'completed').length;
    document.getElementById('map-progressCount').textContent = `${done} / ${this.NODES.length}`;
    document.getElementById('map-progressFill').style.width = `${(done / this.NODES.length) * 100}%`;
  }

  isFullscreen() {
    return this.container && this.container.classList.contains('is-fullscreen');
  }

  toggleFullscreen() {
    if (!this.container) return;
    
    this.container.classList.toggle('is-fullscreen');
    
    if (this.isFullscreen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    // Resize map to fit new dimensions
    if (this.map) {
      setTimeout(() => this.map.invalidateSize(), 300);
    }
  }
}

// Export singleton instance
const mapModal = new MapModal();
export default mapModal;
