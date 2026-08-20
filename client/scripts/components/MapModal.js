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
    this._edgesSvg = null;      // SVG overlay for editor edges
    this._editorMode = false;
    this._editorCallbacks = {};
    this._selectedNodeId = null;
    
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

  /**
   * Editor mode initializer — used by edit_warg.js and create_warg.js
   * @param {Object} options
   * @param {Array}  options.nodes     - Initial node state array
   * @param {Function} options.onMapClick   - (lat, lng) => void
   * @param {Function} options.onNodeSelected - (id) => void
   * @param {Function} options.onNodeMoved   - (id, lat, lng) => void
   * @param {Function} options.onMapDeselect - () => void
   */
  async initEditor(options = {}) {
    this._editorMode = true;
    this._editorCallbacks = options;

    await Promise.all([
      this.loadCSS('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'),
      this.loadCSS('styles/map-modal.css')
    ]);
    await this.loadLeafletJS();

    this.injectHTML();

    this.container = document.querySelector('.map-modal');
    this.fullscreenBtn = document.getElementById('btn-map-fullscreen');

    this.bindEvents();
    this.startClock();

    // Wire map-click for placement and deselect, waiting a tick for DOM
    await new Promise(resolve => {
      setTimeout(() => {
        this.initMapAndNodes();
        if (this.map) {
          this.map.invalidateSize();

          // Click on empty map space
          this.map.on('click', (e) => {
            if (this._editorCallbacks.onMapClick) {
              this._editorCallbacks.onMapClick(e.latlng.lat, e.latlng.lng);
            } else if (this._editorCallbacks.onMapDeselect) {
              this._editorCallbacks.onMapDeselect();
            }
          });

          // Re-project edges on map move/zoom
          this.map.on('move zoom zoomend', () => {
            this._redrawEdgeSvg();
          });

          // Mouse move for temp edge
          this.map.on('mousemove', (e) => {
            if (this._editorCallbacks.onMapMouseMove) {
              this._editorCallbacks.onMapMouseMove(e.latlng.lat, e.latlng.lng);
            }
          });

          // Mouse up for ending edge on empty space
          this.map.on('mouseup', (e) => {
            if (this._editorCallbacks.onMapMouseUp) {
              this._editorCallbacks.onMapMouseUp();
            }
          });
        }
        resolve();
      }, 50);
    });

    this.isInitialized = true;
  }

  /**
   * Standard player mode initializer (game.html)
   */
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

    // Editor mode: simpler HUD without the field log
    if (this._editorMode) {
      const html = `
        <div class="map-modal" aria-labelledby="map-modal-title">
          <button class="map-modal__close-btn" id="btn-map-fullscreen" aria-label="Toggle Fullscreen" title="Toggle Fullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
            </svg>
          </button>
          <div class="maparea" style="width:100%;height:100%;position:relative;">
            <div id="map-modal-leaflet" style="width:100%;height:100%;"></div>
            <div class="scan-overlay"></div>
            <div class="scan-sweep"></div>
            <div class="hud">
              <div class="hud__badge">EDITOR</div>
              <div class="hud__title">
                <strong>Campus Node Network</strong>
                <span>click map to place • drag markers to move</span>
              </div>
            </div>
            <!-- SVG overlay for editor edges -->
            <svg id="editor-edges-svg" style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:500;"
                 xmlns="http://www.w3.org/2000/svg">
              <defs>
                <marker id="ed-arrow" markerWidth="10" markerHeight="10" refX="16" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                  <polyline points="0,1 5,5 0,9" fill="none" stroke="rgba(153,172,255,0.8)" stroke-width="2"/>
                </marker>
                <marker id="ed-arrow-mid" markerWidth="10" markerHeight="10" refX="2.5" refY="5" orient="auto" markerUnits="userSpaceOnUse">
                  <polyline points="0,1 5,5 0,9" fill="none" stroke="rgba(153,172,255,0.8)" stroke-width="2"/>
                </marker>
              </defs>
            </svg>
          </div>
        </div>
      `;
      target.innerHTML = html;
      this._edgesSvg = document.getElementById('editor-edges-svg');
      return;
    }

    // Player mode HTML (unchanged)
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
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      subdomains: 'abc',
      maxZoom: cfg.maxZoom,
    }).addTo(this.map);

    // Circular bubble mask
    this._addCircularMask();

    // In editor mode don't add the static NODES
    if (!this._editorMode) {
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
              document.dispatchEvent(new CustomEvent('warg:play-node', { detail: node }));
              this.close();
            }
          });
        }
      });

      this.renderList();
    }

    this.isMapRendered = true;
  }

  /* ─── Editor Mode API ─── */

  /**
   * Add a draggable editor marker for a node.
   * @param {{ id, lat, lng, title }} node
   */
  addEditorNode(node) {
    if (!this.map) return;

    const icon = L.divIcon({
      className: '',
      html: `<div class="node-marker editor-node" id="em-${node.id}">
               <div class="node-marker__core">+</div>
               <div class="mock-waypoint__handle"><span></span><span></span><span></span></div>
             </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14]
    });

    const marker = L.marker([node.lat, node.lng], { icon, draggable: true }).addTo(this.map);

    // Let the handle handle dragging, core handles edge drawing
    marker.on('add', () => {
      const el = marker.getElement();
      if (!el) return;
      const core = el.querySelector('.node-marker__core');
      const handle = el.querySelector('.mock-waypoint__handle');

      if (core) {
        L.DomEvent.on(core, 'mousedown', (e) => {
          L.DomEvent.stopPropagation(e); // prevent map panning
          e.preventDefault(); // prevent leaflet drag
          if (this._editorCallbacks.onNodeCoreDown) this._editorCallbacks.onNodeCoreDown(node.id);
        });
        L.DomEvent.on(core, 'mouseup', (e) => {
          L.DomEvent.stopPropagation(e);
          if (this._editorCallbacks.onNodeMouseUp) this._editorCallbacks.onNodeMouseUp(node.id);
        });
      }
      if (handle) {
        L.DomEvent.on(handle, 'mousedown', (e) => {
          // let leaflet handle the drag via default marker behavior
          // but we still want to select the node
          if (this._editorCallbacks.onNodeSelected) this._editorCallbacks.onNodeSelected(node.id);
        });
      }
    });

    marker.on('click', (e) => {
      L.DomEvent.stopPropagation(e);
      if (this._editorCallbacks.onNodeSelected) this._editorCallbacks.onNodeSelected(node.id);
    });

    marker.on('dragend', () => {
      const ll = marker.getLatLng();
      if (this._editorCallbacks.onNodeMoved) this._editorCallbacks.onNodeMoved(node.id, ll.lat, ll.lng);
    });

    this.markerLookup[node.id] = marker;
  }

  /**
   * Remove an editor marker by node id.
   */
  removeEditorNode(id) {
    const marker = this.markerLookup[id];
    if (marker && this.map) {
      this.map.removeLayer(marker);
      delete this.markerLookup[id];
    }
  }

  /**
   * Visually highlight the selected node marker.
   */
  setSelectedNode(id) {
    this._selectedNodeId = id;
    Object.entries(this.markerLookup).forEach(([nodeId, marker]) => {
      const el = marker.getElement();
      if (!el) return;
      const core = el.querySelector('.node-marker');
      if (core) core.classList.toggle('selected', nodeId === id);
    });
  }

  /**
   * Update the tooltip/title of an editor node marker.
   */
  updateEditorNodeTitle(id, title) {
    const marker = this.markerLookup[id];
    if (marker) marker.setTooltipContent(title);
  }

  /**
   * Redraw SVG edge lines between editor nodes.
   * @param {Array} edges
   * @param {Array} nodes
   */
  updateEditorEdges(edges, nodes) {
    this._cachedEdges = edges;
    this._cachedNodes = nodes;
    this._redrawEdgeSvg();
  }

  /**
   * Set a temporary edge for drawing
   */
  setTempEdge(fromId, lat, lng) {
    this._tempEdge = { from: fromId, lat, lng };
    this._redrawEdgeSvg();
  }

  clearTempEdge() {
    this._tempEdge = null;
    this._redrawEdgeSvg();
  }

  _redrawEdgeSvg() {
    const svg = this._edgesSvg;
    if (!svg || !this.map) return;

    // Remove old lines (keep <defs>)
    [...svg.querySelectorAll('line,g.ed-edge')].forEach(el => el.remove());

    const edges = this._cachedEdges || [];
    const nodes = this._cachedNodes || [];
    const ns = 'http://www.w3.org/2000/svg';

    // Re-project each edge
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode   = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const fp = this.map.latLngToContainerPoint([fromNode.lat, fromNode.lng]);
      const tp = this.map.latLngToContainerPoint([toNode.lat,   toNode.lng]);
      const mx = (fp.x + tp.x) / 2;
      const my = (fp.y + tp.y) / 2;

      const g = document.createElementNS(ns, 'g');
      g.setAttribute('class', 'ed-edge');
      g.style.pointerEvents = 'auto';
      g.style.cursor = 'pointer';

      // Invisible thicker line for hitbox
      const hitbox = document.createElementNS(ns, 'line');
      hitbox.setAttribute('x1', fp.x); hitbox.setAttribute('y1', fp.y);
      hitbox.setAttribute('x2', tp.x); hitbox.setAttribute('y2', tp.y);
      hitbox.setAttribute('stroke', 'transparent');
      hitbox.setAttribute('stroke-width', '15');
      
      // Selected edge styling
      const isSelected = this._selectedNodeId === edge.id; // Using same prop for edge ID for convenience
      const color = isSelected ? '#fff' : 'rgba(153,172,255,0.75)';
      const width = isSelected ? '3' : '2';

      // Half 1 → mid with mid-arrow
      const l1 = document.createElementNS(ns, 'line');
      l1.setAttribute('x1', fp.x); l1.setAttribute('y1', fp.y);
      l1.setAttribute('x2', mx);   l1.setAttribute('y2', my);
      l1.setAttribute('stroke', color);
      l1.setAttribute('stroke-width', width);
      l1.setAttribute('stroke-dasharray', '6 4');
      l1.setAttribute('marker-end', 'url(#ed-arrow-mid)');

      // Half 2 → end with end-arrow
      const l2 = document.createElementNS(ns, 'line');
      l2.setAttribute('x1', mx);   l2.setAttribute('y1', my);
      l2.setAttribute('x2', tp.x); l2.setAttribute('y2', tp.y);
      l2.setAttribute('stroke', color);
      l2.setAttribute('stroke-width', width);
      l2.setAttribute('stroke-dasharray', '6 4');
      l2.setAttribute('marker-end', 'url(#ed-arrow)');

      g.appendChild(hitbox);
      g.appendChild(l1);
      g.appendChild(l2);
      
      // Edge click
      g.addEventListener('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (this._editorCallbacks.onEdgeSelected) this._editorCallbacks.onEdgeSelected(edge.id);
      });

      svg.appendChild(g);
    });

    // Temp drawing edge
    if (this._tempEdge) {
      const fromNode = nodes.find(n => n.id === this._tempEdge.from);
      if (fromNode) {
        const fp = this.map.latLngToContainerPoint([fromNode.lat, fromNode.lng]);
        const tp = this.map.latLngToContainerPoint([this._tempEdge.lat, this._tempEdge.lng]);
        const mx = (fp.x + tp.x) / 2;
        const my = (fp.y + tp.y) / 2;

        const g = document.createElementNS(ns, 'g');
        const l1 = document.createElementNS(ns, 'line');
        l1.setAttribute('x1', fp.x); l1.setAttribute('y1', fp.y);
        l1.setAttribute('x2', mx);   l1.setAttribute('y2', my);
        l1.setAttribute('stroke', 'rgba(153,172,255,0.4)');
        l1.setAttribute('stroke-width', '2');
        l1.setAttribute('stroke-dasharray', '4 4');
        l1.setAttribute('marker-end', 'url(#ed-arrow-mid)');

        const l2 = document.createElementNS(ns, 'line');
        l2.setAttribute('x1', mx);   l2.setAttribute('y1', my);
        l2.setAttribute('x2', tp.x); l2.setAttribute('y2', tp.y);
        l2.setAttribute('stroke', 'rgba(153,172,255,0.4)');
        l2.setAttribute('stroke-width', '2');
        l2.setAttribute('stroke-dasharray', '4 4');
        l2.setAttribute('marker-end', 'url(#ed-arrow)');

        g.appendChild(l1);
        g.appendChild(l2);
        svg.appendChild(g);
      }
    }
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
