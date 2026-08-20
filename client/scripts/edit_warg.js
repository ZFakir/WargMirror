/**
 * WARG Platform — Edit WARG Script
 * Interactive DAG editor for WARG graph.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── State ──
  let nodes = [
    { id: 'wp1', x: 30, y: 40, title: 'The Great Hall', description: 'Find the plaque near the entrance.', gamemode: 'GPS Location', type: 'gps' },
    { id: 'wp2', x: 60, y: 35, title: 'Library Archway', description: 'Scan the historic archway to reveal the hidden message.', gamemode: 'AR Object Scan', type: 'ar' },
    { id: 'wp3', x: 75, y: 70, title: 'Coffee Shop Secret', description: 'Scan the special barcode on the cup.', gamemode: 'Barcode Game', type: 'barcode' }
  ];
  let edges = [
    { id: 'e1', from: 'wp1', to: 'wp2', triggers: [] },
    { id: 'e2', from: 'wp2', to: 'wp3', triggers: [] }
  ];

  let nextId = 4;
  let selectedId = null;
  let selectedType = null; // 'node' or 'edge'
  let isPlacementMode = false;
  
  // Interaction State
  let dragState = null; // null | { type: 'node_move', id: 'wp1' } | { type: 'edge_draw', from: 'wp1', x: 0, y: 0 }
  let mousePos = { x: 50, y: 50 }; // percentages

  // ── Elements ──
  const mapWrapper = document.getElementById('game-map-wrapper');
  const mapContainer = document.getElementById('game-map');
  const btnAddWaypoint = document.getElementById('btn-add-waypoint');
  
  // Right Panel Elements
  const panelEmptyState = document.getElementById('panel-empty-state');
  
  // Node Editor Elements
  const waypointEditor = document.getElementById('waypoint-editor');
  const editorTitle = document.getElementById('editor-title');
  const editorDesc = document.getElementById('editor-desc');
  const btnRemoveWaypoint = document.getElementById('btn-remove-waypoint');
  
  // Edge Editor Elements
  const edgeEditor = document.getElementById('edge-editor');
  const btnRemoveEdge = document.getElementById('btn-remove-edge');
  
  // Global Save
  const btnGlobalSave = document.getElementById('btn-global-save');
  
  // Confirm Modal Elements
  const confirmModalOverlay = document.getElementById('confirm-modal-overlay');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalDesc = document.getElementById('confirm-modal-desc');
  const btnCloseConfirmModal = document.getElementById('btn-close-confirm-modal');
  const btnCancelConfirm = document.getElementById('btn-cancel-confirm');
  const btnAcceptConfirm = document.getElementById('btn-accept-confirm');
  let confirmCallback = null;

  // Alert Modal Elements
  const alertModalOverlay = document.getElementById('alert-modal-overlay');
  const alertModalDesc = document.getElementById('alert-modal-desc');
  const btnCloseAlertModal = document.getElementById('btn-close-alert-modal');
  const btnAcceptAlert = document.getElementById('btn-accept-alert');

  const svgNS = "http://www.w3.org/2000/svg";

  // ── Utilities ──
  function getMousePercentages(e) {
    const rect = mapWrapper.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    return { x, y };
  }

  // ── Rendering ──
  function renderMap() {
    if (!mapContainer) return;
    mapContainer.innerHTML = '';

    // Render Edges
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'mock-path');
    
    // Define arrow marker
    const defs = document.createElementNS(svgNS, 'defs');
    const marker = document.createElementNS(svgNS, 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '12');
    marker.setAttribute('markerHeight', '12');
    marker.setAttribute('refX', '18'); // Offset from node center
    marker.setAttribute('refY', '5');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'userSpaceOnUse');

    const arrowPath = document.createElementNS(svgNS, 'polyline');
    arrowPath.setAttribute('points', '0,1 5,5 0,9');
    arrowPath.setAttribute('fill', 'none');
    arrowPath.setAttribute('stroke', 'var(--color-border-accent)');
    arrowPath.setAttribute('stroke-width', '2');
    
    marker.appendChild(arrowPath);
    defs.appendChild(marker);

    // Define mid arrow marker
    const markerMid = document.createElementNS(svgNS, 'marker');
    markerMid.setAttribute('id', 'arrowhead-mid');
    markerMid.setAttribute('markerWidth', '12');
    markerMid.setAttribute('markerHeight', '12');
    markerMid.setAttribute('refX', '2.5'); // Visually centered at the vertex
    markerMid.setAttribute('refY', '5');
    markerMid.setAttribute('orient', 'auto');
    markerMid.setAttribute('markerUnits', 'userSpaceOnUse');

    const arrowPathMid = document.createElementNS(svgNS, 'polyline');
    arrowPathMid.setAttribute('points', '0,1 5,5 0,9');
    arrowPathMid.setAttribute('fill', 'none');
    arrowPathMid.setAttribute('stroke', 'var(--color-border-accent)');
    arrowPathMid.setAttribute('stroke-width', '2');
    
    markerMid.appendChild(arrowPathMid);
    defs.appendChild(markerMid);
    
    svg.appendChild(defs);
    
    // Existing Edges
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (fromNode && toNode) {
        const group = document.createElementNS(svgNS, 'g');
        group.setAttribute('class', `edge-group ${selectedType === 'edge' && selectedId === edge.id ? 'selected' : ''}`);
        
        // Invisible thicker line for hitbox
        const hitbox = document.createElementNS(svgNS, 'line');
        hitbox.setAttribute('class', 'edge-hitbox');
        hitbox.setAttribute('x1', `${fromNode.x}%`);
        hitbox.setAttribute('y1', `${fromNode.y}%`);
        hitbox.setAttribute('x2', `${toNode.x}%`);
        hitbox.setAttribute('y2', `${toNode.y}%`);
        
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        // Visible line 1 (to mid)
        const visible1 = document.createElementNS(svgNS, 'line');
        visible1.setAttribute('class', 'edge-visible');
        visible1.setAttribute('x1', `${fromNode.x}%`);
        visible1.setAttribute('y1', `${fromNode.y}%`);
        visible1.setAttribute('x2', `${midX}%`);
        visible1.setAttribute('y2', `${midY}%`);
        visible1.setAttribute('marker-end', 'url(#arrowhead-mid)');
        
        // Visible line 2 (from mid)
        const visible2 = document.createElementNS(svgNS, 'line');
        visible2.setAttribute('class', 'edge-visible');
        visible2.setAttribute('x1', `${midX}%`);
        visible2.setAttribute('y1', `${midY}%`);
        visible2.setAttribute('x2', `${toNode.x}%`);
        visible2.setAttribute('y2', `${toNode.y}%`);
        visible2.setAttribute('marker-end', 'url(#arrowhead)');
        
        group.appendChild(hitbox);
        group.appendChild(visible1);
        group.appendChild(visible2);
        
        // Edge interactions
        group.addEventListener('mousedown', (e) => {
          if (isPlacementMode) return;
          e.stopPropagation();
          selectItem('edge', edge.id);
        });

        svg.appendChild(group);
      }
    });

    // Temp drawing edge
    if (dragState && dragState.type === 'edge_draw') {
      const fromNode = nodes.find(n => n.id === dragState.from);
      if (fromNode) {
        const midX = (fromNode.x + dragState.x) / 2;
        const midY = (fromNode.y + dragState.y) / 2;

        const drawingLine1 = document.createElementNS(svgNS, 'line');
        drawingLine1.setAttribute('class', 'edge-drawing');
        drawingLine1.setAttribute('x1', `${fromNode.x}%`);
        drawingLine1.setAttribute('y1', `${fromNode.y}%`);
        drawingLine1.setAttribute('x2', `${midX}%`);
        drawingLine1.setAttribute('y2', `${midY}%`);
        drawingLine1.setAttribute('marker-end', 'url(#arrowhead-mid)');
        
        const drawingLine2 = document.createElementNS(svgNS, 'line');
        drawingLine2.setAttribute('class', 'edge-drawing');
        drawingLine2.setAttribute('x1', `${midX}%`);
        drawingLine2.setAttribute('y1', `${midY}%`);
        drawingLine2.setAttribute('x2', `${dragState.x}%`);
        drawingLine2.setAttribute('y2', `${dragState.y}%`);
        drawingLine2.setAttribute('marker-end', 'url(#arrowhead)');
        
        svg.appendChild(drawingLine1);
        svg.appendChild(drawingLine2);
      }
    }

    mapContainer.appendChild(svg);

    // Render Nodes
    nodes.forEach(wp => {
      const pin = document.createElement('div');
      pin.className = `mock-waypoint ${selectedType === 'node' && selectedId === wp.id ? 'selected' : ''}`;
      pin.setAttribute('data-id', wp.id);
      pin.setAttribute('data-type', wp.type);
      pin.style.left = `${wp.x}%`;
      pin.style.top = `${wp.y}%`;
      pin.title = wp.title;

      // Handle (burger icon)
      const handle = document.createElement('div');
      handle.className = 'mock-waypoint__handle';
      handle.title = 'Drag to move';
      handle.innerHTML = '<span></span><span></span><span></span>';
      
      // Node events
      handle.addEventListener('mousedown', (e) => {
        if (isPlacementMode) return;
        e.stopPropagation();
        selectItem('node', wp.id);
        dragState = { type: 'node_move', id: wp.id };
      });

      pin.addEventListener('mousedown', (e) => {
        if (isPlacementMode) return;
        e.stopPropagation();
        selectItem('node', wp.id);
        if (e.target !== handle && !handle.contains(e.target)) {
          // Click on body: start drawing edge
          dragState = { type: 'edge_draw', from: wp.id, x: wp.x, y: wp.y };
        }
      });
      
      pin.addEventListener('mouseup', (e) => {
        if (dragState && dragState.type === 'edge_draw' && dragState.from !== wp.id) {
          e.stopPropagation();
          // Check for existing edge to prevent duplicates
          const exists = edges.some(edge => 
            (edge.from === dragState.from && edge.to === wp.id)
          );
          
          if (!exists) {
            if (hasPath(wp.id, dragState.from)) {
              openAlertModal("Cannot connect waypoints: This would create a cyclic loop. WARGs must be a directed acyclic graph (DAG).");
            } else {
              const newEdge = {
                id: `e${Date.now()}`,
                from: dragState.from,
                to: wp.id,
                triggers: []
              };
              edges.push(newEdge);
              selectItem('edge', newEdge.id);
            }
          }
        }
        dragState = null;
        renderMap();
      });

      pin.appendChild(handle);
      mapContainer.appendChild(pin);
    });

    // Render Ghost Node in Placement Mode
    if (isPlacementMode) {
      const ghost = document.createElement('div');
      ghost.className = 'mock-waypoint ghost';
      ghost.style.left = `${mousePos.x}%`;
      ghost.style.top = `${mousePos.y}%`;
      mapContainer.appendChild(ghost);
    }
  }

  // ── Panel Management ──
  function selectItem(type, id) {
    selectedType = type;
    selectedId = id;
    isPlacementMode = false;
    updatePanel();
    renderMap();
  }

  function clearSelection() {
    selectedType = null;
    selectedId = null;
    isPlacementMode = false;
    updatePanel();
    renderMap();
  }

  function updatePanel() {
    panelEmptyState.hidden = true;
    waypointEditor.hidden = true;
    edgeEditor.hidden = true;

    if (!selectedType) {
      panelEmptyState.hidden = false;
    } else if (selectedType === 'node') {
      waypointEditor.hidden = false;
      const node = nodes.find(n => n.id === selectedId);
      if (node) {
        editorTitle.value = node.title;
        editorDesc.value = node.description;
        
        // Mock render games
        const gamesList = document.getElementById('editor-games-list');
        if (gamesList) {
          gamesList.innerHTML = `
            <div class="sub-card" role="button" tabindex="0">
              <span class="sub-card__text">${node.gamemode}</span>
              <button class="icon-btn sub-card__action" aria-label="More options">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
              </button>
            </div>
          `;
        }
      }
    } else if (selectedType === 'edge') {
      edgeEditor.hidden = false;
      const edge = edges.find(e => e.id === selectedId);
      if (edge) {
        const fromNode = nodes.find(n => n.id === edge.from);
        const titleEl = document.getElementById('edge-editor-title');
        if (titleEl && fromNode) {
          titleEl.textContent = `Transition from ${fromNode.title}`;
        }
        
        // Mock render transitions from predecessor games
        const transitionList = document.getElementById('transition-games-list');
        if (transitionList && fromNode) {
          transitionList.innerHTML = `
            <div class="transition-game-card">
              <div class="transition-game-card__title">${fromNode.gamemode}</div>
              <div class="transition-game-card__controls">
                <label class="trigger-checkbox-label">
                  <input type="checkbox" class="trigger--pass" ${Math.random() > 0.5 ? 'checked' : ''}>
                  Pass
                </label>
                <label class="trigger-checkbox-label">
                  <input type="checkbox" class="trigger--fail">
                  Fail
                </label>
              </div>
            </div>
          `;
        }
      }
    }
  }

  // ── Global Map Events ──
  mapWrapper.addEventListener('mousemove', (e) => {
    mousePos = getMousePercentages(e);
    
    if (isPlacementMode) {
      renderMap(); // update ghost
    } else if (dragState) {
      if (dragState.type === 'node_move') {
        const node = nodes.find(n => n.id === dragState.id);
        if (node) {
          node.x = mousePos.x;
          node.y = mousePos.y;
          renderMap();
        }
      } else if (dragState.type === 'edge_draw') {
        dragState.x = mousePos.x;
        dragState.y = mousePos.y;
        renderMap();
      }
    }
  });

  mapWrapper.addEventListener('mousedown', (e) => {
    if (isPlacementMode) {
      // Place new node
      const newNode = {
        id: `wp${nextId++}`,
        x: mousePos.x,
        y: mousePos.y,
        title: 'New Waypoint',
        description: '',
        gamemode: 'Unknown',
        type: 'gps'
      };
      nodes.push(newNode);
      selectItem('node', newNode.id);
    } else {
      // Clicked on empty map space
      clearSelection();
    }
  });

  window.addEventListener('mouseup', () => {
    if (dragState) {
      dragState = null;
      renderMap();
    }
  });

  // ── UI Actions ──
  if (btnAddWaypoint) {
    btnAddWaypoint.addEventListener('click', (e) => {
      e.stopPropagation();
      isPlacementMode = true;
      selectedType = null;
      selectedId = null;
      updatePanel();
      renderMap();
    });
  }

  // ── Auto-save inputs to state ──
  if (editorTitle) {
    editorTitle.addEventListener('input', () => {
      if (selectedType === 'node' && selectedId) {
        const node = nodes.find(n => n.id === selectedId);
        if (node) node.title = editorTitle.value;
      }
    });
  }

  if (editorDesc) {
    editorDesc.addEventListener('input', () => {
      if (selectedType === 'node' && selectedId) {
        const node = nodes.find(n => n.id === selectedId);
        if (node) node.description = editorDesc.value;
      }
    });
  }

  // ── Global Save Actions ──
  if (btnGlobalSave) {
    btnGlobalSave.addEventListener('click', () => {
      // Mock global save
      openAlertModal("All changes have been successfully saved to the server.");
    });
  }

  if (btnRemoveWaypoint) {
    btnRemoveWaypoint.addEventListener('click', () => {
      openConfirmModal('Delete Node', 'Are you sure you want to delete this waypoint? All connected edges will also be removed.', () => {
        nodes = nodes.filter(n => n.id !== selectedId);
        edges = edges.filter(e => e.from !== selectedId && e.to !== selectedId);
        clearSelection();
      });
    });
  }

  if (btnRemoveEdge) {
    btnRemoveEdge.addEventListener('click', () => {
      openConfirmModal('Delete Edge', 'Are you sure you want to delete this connection?', () => {
        edges = edges.filter(e => e.id !== selectedId);
        clearSelection();
      });
    });
  }

  // ── Confirm Modal Logic ──
  function openConfirmModal(title, desc, callback) {
    confirmModalTitle.textContent = title;
    confirmModalDesc.textContent = desc;
    confirmCallback = callback;
    confirmModalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeConfirmModal() {
    confirmModalOverlay.setAttribute('aria-hidden', 'true');
    confirmCallback = null;
  }

  if (btnCloseConfirmModal) btnCloseConfirmModal.addEventListener('click', closeConfirmModal);
  if (btnCancelConfirm) btnCancelConfirm.addEventListener('click', closeConfirmModal);
  
  if (btnAcceptConfirm) {
    btnAcceptConfirm.addEventListener('click', () => {
      if (confirmCallback) confirmCallback();
      closeConfirmModal();
    });
  }

  // ── Alert Modal Logic ──
  function openAlertModal(desc) {
    if (alertModalDesc) alertModalDesc.textContent = desc;
    if (alertModalOverlay) alertModalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeAlertModal() {
    if (alertModalOverlay) alertModalOverlay.setAttribute('aria-hidden', 'true');
  }

  if (btnCloseAlertModal) btnCloseAlertModal.addEventListener('click', closeAlertModal);
  if (btnAcceptAlert) btnAcceptAlert.addEventListener('click', closeAlertModal);
  
  if (alertModalOverlay) {
    alertModalOverlay.addEventListener('click', (e) => {
      if (e.target === alertModalOverlay) closeAlertModal();
    });
  }

  // ── Cycle Detection Utility ──
  function hasPath(startId, targetId) {
    if (startId === targetId) return true;
    const visited = new Set();
    const stack = [startId];
    
    while (stack.length > 0) {
      const current = stack.pop();
      if (current === targetId) return true;
      
      if (!visited.has(current)) {
        visited.add(current);
        const outgoingEdges = edges.filter(e => e.from === current);
        outgoingEdges.forEach(e => {
          if (!visited.has(e.to)) {
            stack.push(e.to);
          }
        });
      }
    }
    return false;
  }

  if (confirmModalOverlay) {
    confirmModalOverlay.addEventListener('click', (e) => {
      if (e.target === confirmModalOverlay) closeConfirmModal();
    });
  }

  // Initialize
  clearSelection();
});

