/**
 * Map Modal Component
 * 
 * Reusable modal displaying a Leaflet map and field log sidebar.
 * It dynamically injects its required HTML and CSS to stay modular.
 */

export class MapModal {
  // Map configuration — single source of truth
  static MAP_CONFIG = {
    center: [-26.19180, 28.02990],    // Wits Main Campus
    startZoom: 16,
    minZoom: 14,
    maxZoom: 19,
    bubbleRadiusMeters: 2000,          // 2 km campus bubble
  };

  constructor() {
    this.isInitialized = false;
    this.isMapRendered = false;
    this.map = null;
    this.markerLookup = {};
    this._maskSvg = null;
    
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

  /**
   * Compute an L.latLngBounds box around a center point using geodesic distance.
   * Uses the relationship: 1° latitude ≈ 111 320 m; 1° longitude ≈ 111 320 · cos(lat) m.
   */
  _geodesicBounds(center, radiusMeters) {
    const [lat, lng] = center;
    const METERS_PER_DEG_LAT = 111320;
    const METERS_PER_DEG_LNG = 111320 * Math.cos(lat * Math.PI / 180);

    const dLat = radiusMeters / METERS_PER_DEG_LAT;
    const dLng = radiusMeters / METERS_PER_DEG_LNG;

    return L.latLngBounds(
      [lat - dLat, lng - dLng],
      [lat + dLat, lng + dLng]
    );
  }

  initMapAndNodes() {
    if (this.isMapRendered || !window.L) return;

    const cfg = MapModal.MAP_CONFIG;
    const bounds = this._geodesicBounds(cfg.center, cfg.bubbleRadiusMeters);

    this.map = L.map('map-modal-leaflet', {
      zoomControl: true,
      center: cfg.center,
      zoom: cfg.startZoom,
      minZoom: cfg.minZoom,
      maxZoom: cfg.maxZoom,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0,        // hard-stop at the edge
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abc',
      maxZoom: cfg.maxZoom,
    }).addTo(this.map);

    // Circular bubble mask
    this._addCircularMask();

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

  /* ─── Circular Bubble Mask ─── */

  /**
   * Creates an SVG overlay that blacks out everything outside a circle
   * of `bubbleRadiusMeters` around the map center. The fill colour
   * matches the modal background so it blends seamlessly.
   *
   * Technique: a full-viewport <rect> with an SVG <mask> — the mask is
   * white everywhere (visible) except a circular cut-out (hidden),
   * meaning the dark rect is painted everywhere *except* the circle.
   */
  _addCircularMask() {
    const mapContainer = this.map.getContainer();

    // Create the SVG element
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.classList.add('bubble-mask-svg');
    svg.setAttribute('xmlns', ns);

    // Defs → mask
    const defs = document.createElementNS(ns, 'defs');
    const mask = document.createElementNS(ns, 'mask');
    mask.setAttribute('id', 'bubble-cutout');

    // White rect = everything visible (will be painted by the dark fill)
    this._maskRect = document.createElementNS(ns, 'rect');
    this._maskRect.setAttribute('fill', 'white');
    mask.appendChild(this._maskRect);

    // Black circle = the hole (blocks the dark fill → map shows through)
    this._maskCircle = document.createElementNS(ns, 'circle');
    this._maskCircle.setAttribute('fill', 'black');
    mask.appendChild(this._maskCircle);

    defs.appendChild(mask);
    svg.appendChild(defs);

    // The visible dark overlay that references the mask
    this._overlayRect = document.createElementNS(ns, 'rect');
    this._overlayRect.setAttribute('fill', '#12100E');  // --color-bg
    this._overlayRect.setAttribute('mask', 'url(#bubble-cutout)');
    svg.appendChild(this._overlayRect);

    // Optional: soft feathered edge on the bubble
    const feather = document.createElementNS(ns, 'filter');
    feather.setAttribute('id', 'bubble-feather');
    const blur = document.createElementNS(ns, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '6');
    feather.appendChild(blur);
    defs.appendChild(feather);
    this._maskCircle.setAttribute('filter', 'url(#bubble-feather)');

    mapContainer.appendChild(svg);
    this._maskSvg = svg;

    // Initial positioning
    this._updateMask();

    // Re-position on every map movement, zoom, or container resize
    this.map.on('move zoom zoomend resize', () => this._updateMask());
    // Also handle window resize for fullscreen toggling
    window.addEventListener('resize', () => {
      if (this._maskSvg) this._updateMask();
    });
  }

  /**
   * Recompute the mask circle position and pixel-radius so it stays
   * locked to the geographic center regardless of pan / zoom.
   */
  _updateMask() {
    const cfg = MapModal.MAP_CONFIG;
    const container = this.map.getContainer();
    const w = container.clientWidth;
    const h = container.clientHeight;

    // SVG viewport
    this._maskSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    this._maskSvg.setAttribute('width', w);
    this._maskSvg.setAttribute('height', h);

    // Full-size rects
    for (const rect of [this._maskRect, this._overlayRect]) {
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
    }

    // Project the centre and a point on the circle edge to get pixel radius
    const centerPx = this.map.latLngToContainerPoint(cfg.center);
    // Offset by bubbleRadiusMeters eastward to find the pixel radius
    const METERS_PER_DEG_LNG = 111320 * Math.cos(cfg.center[0] * Math.PI / 180);
    const edgeLng = cfg.center[1] + cfg.bubbleRadiusMeters / METERS_PER_DEG_LNG;
    const edgePx = this.map.latLngToContainerPoint([cfg.center[0], edgeLng]);
    const radiusPx = Math.abs(edgePx.x - centerPx.x);

    this._maskCircle.setAttribute('cx', centerPx.x);
    this._maskCircle.setAttribute('cy', centerPx.y);
    this._maskCircle.setAttribute('r', radiusPx);
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
        this.map.flyTo([node.lat, node.lng], MapModal.MAP_CONFIG.startZoom, { duration: 0.6 });
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
    
    // Resize map to fit new dimensions and re-align the mask
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
        if (this._maskSvg) this._updateMask();
      }, 300);
    }
  }
}

// Export singleton instance
const mapModal = new MapModal();
export default mapModal;
