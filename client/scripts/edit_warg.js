/**
 * WARG Platform — Edit / Create WARG Script
 * Uses MapModal for real geographic waypoint placement.
 */

import { MapModal } from './components/MapModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  const API_BASE = window.API_BASE_URL || 'https://wargmirror.onrender.com';
  
  // ── Create vs Edit mode ──
  const isCreateMode = window.location.pathname.includes('create_warg');
  const urlParams = new URLSearchParams(window.location.search);
  let currentArgId = urlParams.get('id');

  let nodes = [];
  let edges = [];
  let nextId = 1;
  let nextEdgeId = 1;

  // UI Elements for Title/Desc
  const titleEl = document.getElementById('arg-title');
  const descEl = document.getElementById('arg-desc');

  const mapBackendGameTypeToFrontend = (gameType) => {
    const map = {
      'gps_proximity': { type: 'gps', label: 'GPS Location' },
      'ar_object_scan': { type: 'ar', label: 'AR Object Scan' },
      'qr_barcode': { type: 'barcode', label: 'Barcode Game' },
      'text_answer': { type: 'text_answer', label: 'QnA / MCQ' }
    };
    return map[gameType] || { type: 'gps', label: 'GPS Location' };
  };

  if (!isCreateMode && currentArgId) {
    try {
      const res = await fetch(`${API_BASE}/api/args/${currentArgId}`, { credentials: 'include' });
      if (res.ok) {
        const argData = await res.json();
        if (titleEl) titleEl.textContent = argData.title;
        if (descEl) descEl.textContent = argData.description || 'Add a description for your WARG…';
        
        // Map Waypoints to nodes
        const idMap = {}; // mapping waypoint_id to frontend node id
        if (argData.Waypoints) {
          argData.Waypoints.forEach(wp => {
            const nodeId = `wp${nextId++}`;
            idMap[wp.waypoint_id] = nodeId;
            
            const nodeGames = [];
            if (wp.Minigames && wp.Minigames.length > 0) {
              wp.Minigames.forEach(mg => {
                const mappedType = mapBackendGameTypeToFrontend(mg.game_type);
                nodeGames.push({
                  type: mappedType.type,
                  gamemode: mappedType.label,
                  minigame_config: mg.config_json || null
                });
              });
            }

            nodes.push({
              id: nodeId,
              waypoint_id: wp.waypoint_id,
              lat: wp.location.coordinates[1],
              lng: wp.location.coordinates[0],
              title: wp.title,
              description: wp.description,
              games: nodeGames
            });
          });
        }

        if (argData.WaypointEdges) {
          argData.WaypointEdges.forEach(edge => {
            let triggers = [];
            let conditions = edge.conditions_json;
            if (typeof conditions === 'string') {
              try { conditions = JSON.parse(conditions); } catch { /* ignore parse error */ }
            }
            if (conditions && Array.isArray(conditions)) {
              const fromWpData = (argData.Waypoints || []).find(w => w.waypoint_id === edge.from_waypoint_id);
              if (fromWpData && fromWpData.Minigames) {
                 triggers = conditions.map(cond => {
                   const index = fromWpData.Minigames.findIndex(mg => mg.game_id === cond.game_id);
                   return { game_index: index, outcome: cond.outcome };
                 }).filter(t => t.game_index !== -1);
              }
            }
            edges.push({
              id: `e${nextEdgeId++}`,
              from: idMap[edge.from_waypoint_id],
              to: idMap[edge.to_waypoint_id],
              triggers
            });
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch ARG data:', err);
    }
  } else if (!isCreateMode) {
    // Demo data for visual testing if no ID provided in edit mode
    nodes = [
      { id: 'wp1', lat: -26.19233, lng: 28.02987, title: 'The Great Hall', description: 'Find the plaque near the entrance.', games: [{ gamemode: 'GPS Location', type: 'gps' }] },
      { id: 'wp2', lat: -26.19075, lng: 28.03215, title: 'Library Archway', description: 'Scan the historic archway to reveal the hidden message.', games: [{ gamemode: 'AR Object Scan', type: 'ar' }] },
      { id: 'wp3', lat: -26.19320, lng: 28.02790, title: 'Coffee Shop Secret', description: 'Scan the special barcode on the cup.', games: [{ gamemode: 'Barcode Game', type: 'barcode' }] }
    ];
    edges = [
      { id: 'e1', from: 'wp1', to: 'wp2', triggers: [] },
      { id: 'e2', from: 'wp2', to: 'wp3', triggers: [] }
    ];
    nextId = 4;
    nextEdgeId = 3;
  }

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
        gamemode: 'GPS Location',
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
    onNodeMoving(id, lat, lng) {
      const node = nodes.find(n => n.id === id);
      if (node) { node.lat = lat; node.lng = lng; }
      mapModal.updateEditorEdges(edges, nodes);
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
      } else if (isPlacementMode) {
        mapModal.updateGhostNode(lat, lng);
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
            const newEdge = { id: `e${nextEdgeId++}`, from: dragState.from, to: id, triggers: [] };
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

  function hasPath(fromId, toId) {
    if (fromId === toId) return true;
    const visited = new Set();
    const queue = [fromId];
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === toId) return true;
      if (!visited.has(current)) {
        visited.add(current);
        const outgoingEdges = edges.filter(e => e.from === current);
        for (const edge of outgoingEdges) {
          queue.push(edge.to);
        }
      }
    }
    return false;
  }

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
    if (!on && mapModal) {
      mapModal.hideGhostNode();
    }
  }

  // ── Panel Management ──
  function selectItem(type, id) {
    selectedType = type;
    selectedId = id;
    isPlacementMode = false;
    _setPlacementCursor(false);
    updatePanel();
    // Highlight selected marker and edge
    mapModal.setSelectedNode(type === 'node' ? id : null);
    mapModal.setSelectedEdge(type === 'edge' ? id : null);
  }

  function clearSelection() {
    selectedType = null;
    selectedId = null;
    isPlacementMode = false;
    _setPlacementCursor(false);
    updatePanel();
    mapModal.setSelectedNode(null);
    mapModal.setSelectedEdge(null);
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
          if (node.games && node.games.length > 0) {
            let html = '';
            node.games.forEach((game, index) => {
              const config = game.minigame_config || {};
              const unlimitedChecked = config.allow_multiple_attempts ? 'checked' : '';
              html += `
                <div class="sub-card" style="position: relative;" tabindex="0">
                  <div><span class="sub-card__text">${game.gamemode}</span></div>
                  <label style="display: inline-block; font-size: 11px; margin-top: 4px; cursor: pointer; color: var(--color-text-muted);">
                    <input type="checkbox" class="unlimited-attempts-checkbox" data-index="${index}" ${unlimitedChecked}>
                    Unlimited attempts
                  </label>
                  <button class="icon-btn sub-card__action btn-game-options" data-index="${index}" aria-label="More options">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                  </button>
                  <div class="sub-card__dropdown game-options-dropdown" id="game-dropdown-${index}">
                    <button class="dropdown-item btn-edit-game" data-index="${index}">Edit Game</button>
                    <button class="dropdown-item dropdown-item--danger btn-delete-game" data-index="${index}">Delete Game</button>
                  </div>
                </div>
              `;
            });
            gamesList.innerHTML = html;

            // Unlimited attempts checkbox logic
            gamesList.querySelectorAll('.unlimited-attempts-checkbox').forEach(cb => {
              cb.addEventListener('change', (e) => {
                const cbIndex = e.target.getAttribute('data-index');
                if (!node.games[cbIndex].minigame_config) {
                  node.games[cbIndex].minigame_config = {};
                }
                node.games[cbIndex].minigame_config.allow_multiple_attempts = e.target.checked;
              });
            });

            // Wire up dropdown logic
            const optionBtns = gamesList.querySelectorAll('.btn-game-options');
            optionBtns.forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = btn.getAttribute('data-index');
                const dropdown = document.getElementById(`game-dropdown-${index}`);
                
                // close others
                gamesList.querySelectorAll('.game-options-dropdown.show').forEach(d => {
                  if (d !== dropdown) d.classList.remove('show');
                });
                
                dropdown.classList.toggle('show');
              });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
              gamesList.querySelectorAll('.game-options-dropdown.show').forEach(d => {
                if (!d.contains(e.target) && !e.target.closest('.btn-game-options')) {
                  d.classList.remove('show');
                }
              });
            });

            const editBtns = gamesList.querySelectorAll('.btn-edit-game');
            editBtns.forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = btn.getAttribute('data-index');
                const dropdown = document.getElementById(`game-dropdown-${index}`);
                dropdown.classList.remove('show');
                
                const game = node.games[index];
                if (game.gamemode === 'QnA / MCQ') {
                  openQnaModal(game.minigame_config, index);
                } else {
                  openAlertModal('Editor for this game type is coming soon.');
                }
              });
            });

            const deleteBtns = gamesList.querySelectorAll('.btn-delete-game');
            deleteBtns.forEach(btn => {
              btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = btn.getAttribute('data-index');
                const dropdown = document.getElementById(`game-dropdown-${index}`);
                dropdown.classList.remove('show');
                
                openConfirmModal('Delete Game', 'Are you sure you want to remove this game from the waypoint?', () => {
                  node.games.splice(index, 1);
                  updatePanel();
                });
              });
            });

          } else {
            gamesList.innerHTML = ''; // No game attached yet
          }
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
          if (fromNode.games && fromNode.games.length > 0) {
            let html = '';
            fromNode.games.forEach((game, index) => {
              const passChecked = edge.triggers.some(t => t.game_index === index && t.outcome === 'pass') ? 'checked' : '';
              const failChecked = edge.triggers.some(t => t.game_index === index && t.outcome === 'fail') ? 'checked' : '';
              const isUnlimited = game.minigame_config && game.minigame_config.allow_multiple_attempts;

              html += `
                <div class="transition-game-card">
                  <div class="transition-game-card__title">${game.gamemode}</div>
                  ${isUnlimited ? '<div class="warning-text" style="font-size: 11px; color: #ff9800; margin-bottom: 6px; line-height: 1.2;">Warning: Game has Unlimited Attempts. Fail branch will not trigger.</div>' : ''}
                  <div class="transition-game-card__controls">
                    <label class="trigger-checkbox-label">
                      <input type="checkbox" class="trigger--pass" data-game-index="${index}" ${passChecked}>
                      Pass
                    </label>
                    <label class="trigger-checkbox-label">
                      <input type="checkbox" class="trigger--fail" data-game-index="${index}" ${failChecked}>
                      Fail
                    </label>
                  </div>
                </div>
              `;
            });
            transitionList.innerHTML = html;
            
            transitionList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
              cb.addEventListener('change', (e) => {
                 const tType = e.target.classList.contains('trigger--pass') ? 'pass' : 'fail';
                 const gIdx = parseInt(e.target.getAttribute('data-game-index'), 10);
                 if (e.target.checked) {
                   edge.triggers.push({ game_index: gIdx, outcome: tType });
                 } else {
                   edge.triggers = edge.triggers.filter(t => !(t.game_index === gIdx && t.outcome === tType));
                 }
              });
            });
          } else {
            transitionList.innerHTML = '';
          }
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

  async function saveArg(status) {
    const title = titleEl ? titleEl.textContent.trim() : 'Untitled WARG';
    const description = descEl ? descEl.textContent.trim() : '';

    const payload = {
      title,
      description,
      status,
      waypoints: nodes,
      edges: edges
    };

    const method = currentArgId ? 'PUT' : 'POST';
    const url = currentArgId ? `${API_BASE}/api/args/${currentArgId}` : `${API_BASE}/api/args`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to save ARG');
      }
      
      const data = await res.json();
      
      if (!currentArgId && data.arg_id) {
        currentArgId = data.arg_id;
        window.history.pushState({}, '', `edit_warg?id=${currentArgId}`);
      }
      
      return data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  function setLoadingState(btn, isLoading, originalText) {
    if (!btn) return;
    if (isLoading) {
      btn.disabled = true;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;animation:spin 1s linear infinite;margin-right:8px;vertical-align:middle"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg><span style="vertical-align:middle">${originalText}</span>`;
    } else {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // ── Global Save Actions ──
  if (btnGlobalSave) {
    btnGlobalSave.addEventListener('click', async () => {
      const origText = btnGlobalSave.textContent;
      setLoadingState(btnGlobalSave, true, origText);
      try {
        await saveArg('unpublished');
        const msg = isCreateMode && !currentArgId
          ? 'Your new WARG has been saved as a draft.'
          : 'All changes have been successfully saved to the server.';
        openAlertModal(msg);
      } catch {
        openAlertModal('Failed to save draft. Please try again.');
      } finally {
        setLoadingState(btnGlobalSave, false, origText);
      }
    });
  }

  // ── Publish Action ──
  if (btnGlobalPublish) {
    btnGlobalPublish.addEventListener('click', () => {
      const wargTitle = (titleEl ? titleEl.textContent.trim() : '') || 'Untitled WARG';
      if (nodes.length === 0) {
        openAlertModal('Please add at least one waypoint before publishing your WARG.');
        return;
      }
      openConfirmModal(
        'Publish WARG',
        `Publish "${wargTitle}"? It will become visible to all players.`,
        async () => {
          try {
            await saveArg('published');
            openAlertModal(`"${wargTitle}" has been published! Players can now discover and play it.`);
            setTimeout(() => { window.location.href = 'studio.html'; }, 2000);
          } catch {
            openAlertModal('Failed to publish WARG. Please try again.');
          }
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
    btnAcceptConfirm.addEventListener('click', async () => {
      if (confirmCallback) {
        const origText = btnAcceptConfirm.textContent;
        setLoadingState(btnAcceptConfirm, true, origText);
        try {
          await confirmCallback();
        } finally {
          setLoadingState(btnAcceptConfirm, false, origText);
          closeConfirmModal();
        }
      } else {
        closeConfirmModal();
      }
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

  if (confirmModalOverlay) {
    confirmModalOverlay.addEventListener('click', (e) => {
      if (e.target === confirmModalOverlay) closeConfirmModal();
    });
  }
  // ── QnA / MCQ Modal Logic ──
  const btnAddGame = document.getElementById('btn-add-game');
  const qnaModalOverlay = document.getElementById('qna-modal-overlay');
  const btnCloseQnaModal = document.getElementById('btn-close-qna-modal');
  const btnCancelQna = document.getElementById('btn-cancel-qna');
  const btnSaveQna = document.getElementById('btn-save-qna');
  const btnAddQnaOption = document.getElementById('btn-add-qna-option');
  const qnaOptionsList = document.getElementById('qna-options-list');
  const qnaQuestion = document.getElementById('qna-question');

  let qnaOptionsData = [];

  function getLetter(index) {
    return String.fromCharCode(65 + index) + '.';
  }

  function renderQnaOptions() {
    if (!qnaOptionsList) return;
    qnaOptionsList.innerHTML = '';
    qnaOptionsData.forEach((opt, idx) => {
      const row = document.createElement('div');
      row.className = 'qna-option-row';
      
      const letter = document.createElement('div');
      letter.className = 'qna-option-letter';
      letter.textContent = getLetter(idx);
      
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'qna-option-input';
      input.placeholder = `Option ${getLetter(idx).replace('.','')}`;
      input.value = opt.text;
      input.addEventListener('input', (e) => {
        opt.text = e.target.value;
      });

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'qna-correct-answer';
      radio.className = 'qna-option-radio';
      radio.checked = opt.isCorrect;
      radio.addEventListener('change', () => {
        qnaOptionsData.forEach(o => o.isCorrect = false);
        opt.isCorrect = true;
      });

      const btnDel = document.createElement('button');
      btnDel.className = 'icon-btn qna-option-delete';
      btnDel.title = 'Delete Option';
      btnDel.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      btnDel.addEventListener('click', () => {
        qnaOptionsData.splice(idx, 1);
        renderQnaOptions();
      });

      row.appendChild(letter);
      row.appendChild(input);
      row.appendChild(radio);
      row.appendChild(btnDel);
      qnaOptionsList.appendChild(row);
    });
  }

  let currentEditGameIndex = null;

  function openQnaModal(existingConfig = null, editIndex = null) {
    currentEditGameIndex = editIndex;
    if (existingConfig && existingConfig.is_mcq) {
      qnaQuestion.value = existingConfig.question || '';
      qnaOptionsData = (existingConfig.options || []).map((text, idx) => ({
        text,
        isCorrect: idx === existingConfig.correct_index
      }));
    } else {
      qnaQuestion.value = '';
      qnaOptionsData = [{ text: '', isCorrect: true }];
    }
    renderQnaOptions();
    if (qnaModalOverlay) qnaModalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeQnaModal() {
    if (qnaModalOverlay) qnaModalOverlay.setAttribute('aria-hidden', 'true');
    currentEditGameIndex = null;
  }

  const gameSelectorModalOverlay = document.getElementById('game-selector-modal-overlay');
  const btnCloseGameSelectorModal = document.getElementById('btn-close-game-selector-modal');
  const gameTypeBtns = document.querySelectorAll('.game-type-btn');

  function openGameSelectorModal() {
    if (gameSelectorModalOverlay) gameSelectorModalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeGameSelectorModal() {
    if (gameSelectorModalOverlay) gameSelectorModalOverlay.setAttribute('aria-hidden', 'true');
  }

  if (btnCloseGameSelectorModal) btnCloseGameSelectorModal.addEventListener('click', closeGameSelectorModal);
  if (gameSelectorModalOverlay) {
    gameSelectorModalOverlay.addEventListener('click', (e) => {
      if (e.target === gameSelectorModalOverlay) closeGameSelectorModal();
    });
  }

  gameTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const gameType = btn.getAttribute('data-game-type');
      closeGameSelectorModal();
      if (gameType === 'qna') {
        openQnaModal(null, null); // Always new game when adding from selector
      }
    });
  });

  if (btnAddGame) {
    btnAddGame.addEventListener('click', () => {
      openGameSelectorModal();
    });
  }

  if (btnCloseQnaModal) btnCloseQnaModal.addEventListener('click', closeQnaModal);
  if (btnCancelQna) btnCancelQna.addEventListener('click', closeQnaModal);

  if (btnAddQnaOption) {
    btnAddQnaOption.addEventListener('click', () => {
      qnaOptionsData.push({ text: '', isCorrect: false });
      renderQnaOptions();
    });
  }

  if (btnSaveQna) {
    btnSaveQna.addEventListener('click', () => {
      const node = nodes.find(n => n.id === selectedId);
      if (!node) return;

      const questionText = qnaQuestion.value.trim();
      if (!questionText) {
        openAlertModal('Please enter a question.');
        return;
      }
      
      if (qnaOptionsData.length < 2) {
        openAlertModal('Please provide at least 2 options.');
        return;
      }

      const emptyOption = qnaOptionsData.find(o => !o.text.trim());
      if (emptyOption) {
        openAlertModal('Please fill out all option fields.');
        return;
      }

      let correctIndex = qnaOptionsData.findIndex(o => o.isCorrect);
      if (correctIndex === -1) {
        openAlertModal('Please select a correct answer.');
        return;
      }

      const configJson = {
        question: questionText,
        is_mcq: true,
        options: qnaOptionsData.map(o => o.text.trim()),
        correct_index: correctIndex
      };

      const newGame = {
        gamemode: 'QnA / MCQ',
        type: 'text_answer',
        minigame_config: configJson
      };

      if (!node.games) node.games = [];

      if (currentEditGameIndex !== null && currentEditGameIndex !== undefined) {
        node.games[currentEditGameIndex] = newGame;
      } else {
        node.games.push(newGame);
      }

      updatePanel(); 
      closeQnaModal();
    });
  }

  if (qnaModalOverlay) {
    qnaModalOverlay.addEventListener('click', (e) => {
      if (e.target === qnaModalOverlay) closeQnaModal();
    });
  }

});
