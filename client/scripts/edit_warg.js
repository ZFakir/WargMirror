/**
 * WARG Platform — Edit / Create WARG Script
 * Uses MapModal for real geographic waypoint placement.
 */

import { MapModal } from './components/MapModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  // ── Create vs Edit mode ──
  const isCreateMode = window.location.pathname.includes('create_warg');

  // ── State — nodes now use real lat/lng ──
  let nodes = isCreateMode ? [] : [
    { id: 'wp1', lat: -26.19233, lng: 28.02987, title: 'The Great Hall', description: 'Find the plaque near the entrance.', gamemode: 'GPS Location', type: 'gps' },
    { id: 'wp2', lat: -26.19075, lng: 28.03215, title: 'Library Archway', description: 'Scan the historic archway to reveal the hidden message.', gamemode: 'AR Object Scan', type: 'ar' },
    { id: 'wp3', lat: -26.19320, lng: 28.02790, title: 'Coffee Shop Secret', description: 'Scan the special barcode on the cup.', gamemode: 'Barcode Game', type: 'barcode' }
  ];
  let edges = isCreateMode ? [] : [
    { id: 'e1', from: 'wp1', to: 'wp2', triggers: [] },
    { id: 'e2', from: 'wp2', to: 'wp3', triggers: [] }
  ];

  let nextId = isCreateMode ? 1 : 4;
  let selectedId = null;
  let selectedType = null; // 'node' or 'edge'
  let isPlacementMode = false;
  let dragState = null; // null | { type: 'edge_draw', from: 'wp1' }

  // ── Elements ──
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

  // Global Save / Publish
  const btnGlobalSave = document.getElementById('btn-global-save');
  const btnGlobalPublish = document.getElementById('btn-global-publish');

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

  // ── Initialise Leaflet map in editor mode ──
  const mapModal = new MapModal();
  await mapModal.initEditor({
    nodes,
    onMapClick(lat, lng) {
      if (!isPlacementMode) return;
      const newNode = {
        id: `wp${nextId++}`,
        lat, lng,
        title: 'New Waypoint',
        description: '',
        gamemode: 'Unknown',
        type: 'gps'
      };
      nodes.push(newNode);
      mapModal.addEditorNode(newNode);
      mapModal.updateEditorEdges(edges, nodes);
      selectItem('node', newNode.id);
      isPlacementMode = false;
      _setPlacementCursor(false);
    },
    onNodeSelected(id) {
      selectItem('node', id);
    },
    onEdgeSelected(id) {
      selectItem('edge', id);
    },
    onNodeMoved(id, lat, lng) {
      const node = nodes.find(n => n.id === id);
      if (node) { node.lat = lat; node.lng = lng; }
      mapModal.updateEditorEdges(edges, nodes);
    },
    onMapDeselect() {
      clearSelection();
    },
    onNodeCoreDown(id) {
      dragState = { type: 'edge_draw', from: id };
      _setPlacementCursor(true);
    },
    onMapMouseMove(lat, lng) {
      if (dragState && dragState.type === 'edge_draw') {
        mapModal.setTempEdge(dragState.from, lat, lng);
      }
    },
    onNodeMouseUp(id) {
      if (dragState && dragState.type === 'edge_draw' && dragState.from !== id) {
        // Prevent duplicate edges
        const exists = edges.some(edge => edge.from === dragState.from && edge.to === id);
        if (!exists) {
          if (hasPath(id, dragState.from)) {
            openAlertModal("Cannot connect waypoints: This would create a cyclic loop. WARGs must be a directed acyclic graph (DAG).");
          } else {
            const newEdge = { id: `e${Date.now()}`, from: dragState.from, to: id, triggers: [] };
            edges.push(newEdge);
            selectItem('edge', newEdge.id);
          }
        }
      }
      _endEdgeDraw();
    },
    onMapMouseUp() {
      if (dragState && dragState.type === 'edge_draw') {
        _endEdgeDraw();
      }
    }
  });

  function _endEdgeDraw() {
    dragState = null;
    mapModal.clearTempEdge();
    mapModal.updateEditorEdges(edges, nodes);
    _setPlacementCursor(false);
  }

  // Paint initial nodes onto the map
  nodes.forEach(n => mapModal.addEditorNode(n));
  mapModal.updateEditorEdges(edges, nodes);
  clearSelection();

  // ── Placement cursor helper ──
  function _setPlacementCursor(on) {
    const mapEl = document.getElementById('game-map');
    if (mapEl) mapEl.style.cursor = on ? 'crosshair' : '';
  }

  // ── Panel Management ──
  function selectItem(type, id) {
    selectedType = type;
    selectedId = id;
    isPlacementMode = false;
    _setPlacementCursor(false);
    updatePanel();
    // Highlight selected marker
    mapModal.setSelectedNode(type === 'node' ? id : null);
  }

  function clearSelection() {
    selectedType = null;
    selectedId = null;
    isPlacementMode = false;
    _setPlacementCursor(false);
    updatePanel();
    mapModal.setSelectedNode(null);
  }

  function updatePanel() {
    if (panelEmptyState) panelEmptyState.setAttribute('hidden', 'true');
    if (waypointEditor) waypointEditor.setAttribute('hidden', 'true');
    if (edgeEditor) edgeEditor.setAttribute('hidden', 'true');

    if (!selectedType) {
      if (panelEmptyState) panelEmptyState.removeAttribute('hidden');
    } else if (selectedType === 'node') {
      if (waypointEditor) waypointEditor.removeAttribute('hidden');
      const node = nodes.find(n => n.id === selectedId);
      if (node) {
        if (editorTitle) editorTitle.value = node.title;
        if (editorDesc) editorDesc.value = node.description;

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
      if (edgeEditor) edgeEditor.removeAttribute('hidden');
      const edge = edges.find(e => e.id === selectedId);
      if (edge) {
        const fromNode = nodes.find(n => n.id === edge.from);
        const titleEl = document.getElementById('edge-editor-title');
        if (titleEl && fromNode) titleEl.textContent = `Transition from ${fromNode.title}`;

        const transitionList = document.getElementById('transition-games-list');
        if (transitionList && fromNode) {
          transitionList.innerHTML = `
            <div class="transition-game-card">
              <div class="transition-game-card__title">${fromNode.gamemode}</div>
              <div class="transition-game-card__controls">
                <label class="trigger-checkbox-label">
                  <input type="checkbox" class="trigger--pass">
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

  // ── UI Actions ──
  if (btnAddWaypoint) {
    btnAddWaypoint.addEventListener('click', (e) => {
      e.stopPropagation();
      isPlacementMode = true;
      selectedType = null;
      selectedId = null;
      _setPlacementCursor(true);
      updatePanel();
      // Show placement hint in empty state
      if (panelEmptyState) {
        panelEmptyState.removeAttribute('hidden');
        const p = panelEmptyState.querySelector('p');
        if (p) p.textContent = 'Click anywhere on the map to drop a new waypoint.';
      }
      if (waypointEditor) waypointEditor.setAttribute('hidden', 'true');
      if (edgeEditor) edgeEditor.setAttribute('hidden', 'true');
    });
  }

  // ── Auto-save inputs to state ──
  if (editorTitle) {
    editorTitle.addEventListener('input', () => {
      if (selectedType === 'node' && selectedId) {
        const node = nodes.find(n => n.id === selectedId);
        if (node) {
          node.title = editorTitle.value;
          mapModal.updateEditorNodeTitle(selectedId, node.title);
        }
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
      const msg = isCreateMode
        ? 'Your new WARG has been saved as a draft.'
        : 'All changes have been successfully saved to the server.';
      openAlertModal(msg);
    });
  }

  // ── Publish Action ──
  if (btnGlobalPublish) {
    btnGlobalPublish.addEventListener('click', () => {
      const titleEl = document.getElementById('arg-title');
      const wargTitle = (titleEl ? titleEl.textContent.trim() : '') || 'Untitled WARG';
      if (nodes.length === 0) {
        openAlertModal('Please add at least one waypoint before publishing your WARG.');
        return;
      }
      openConfirmModal(
        'Publish WARG',
        `Publish "${wargTitle}"? It will become visible to all players.`,
        () => {
          openAlertModal(`"${wargTitle}" has been published! Players can now discover and play it.`);
          setTimeout(() => { window.location.href = 'studio.html'; }, 2000);
        }
      );
    });
  }

  if (btnRemoveWaypoint) {
    btnRemoveWaypoint.addEventListener('click', () => {
      openConfirmModal('Delete Node', 'Are you sure you want to delete this waypoint? All connected edges will also be removed.', () => {
        mapModal.removeEditorNode(selectedId);
        nodes = nodes.filter(n => n.id !== selectedId);
        edges = edges.filter(e => e.from !== selectedId && e.to !== selectedId);
        mapModal.updateEditorEdges(edges, nodes);
        clearSelection();
      });
    });
  }

  if (btnRemoveEdge) {
    btnRemoveEdge.addEventListener('click', () => {
      openConfirmModal('Delete Edge', 'Are you sure you want to delete this connection?', () => {
        edges = edges.filter(e => e.id !== selectedId);
        mapModal.updateEditorEdges(edges, nodes);
        clearSelection();
      });
    });
  }

  // ── Confirm Modal Logic ──
  function openConfirmModal(title, desc, callback) {
    if (confirmModalTitle) confirmModalTitle.textContent = title;
    if (confirmModalDesc) confirmModalDesc.textContent = desc;
    confirmCallback = callback;
    if (confirmModalOverlay) confirmModalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeConfirmModal() {
    if (confirmModalOverlay) confirmModalOverlay.setAttribute('aria-hidden', 'true');
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
        edges.filter(e => e.from === current).forEach(e => {
          if (!visited.has(e.to)) stack.push(e.to);
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
});
