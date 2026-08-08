/**
 * WARG Platform — Edit WARG Script
 * Handles the builder map interface and waypoint configuration.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── State ──
  const mockWaypoints = [
    {
      id: 'wp1',
      x: 30, // percentage relative to map container
      y: 40,
      title: 'The Great Hall',
      description: 'Find the plaque near the entrance.',
      gamemode: 'GPS Location',
      type: 'gps' // visual styling type
    },
    {
      id: 'wp2',
      x: 60,
      y: 35,
      title: 'Library Archway',
      description: 'Scan the historic archway to reveal the hidden message.',
      gamemode: 'AR Object Scan',
      type: 'ar'
    },
    {
      id: 'wp3',
      x: 75,
      y: 70,
      title: 'Coffee Shop Secret',
      description: 'Scan the special barcode on the cup.',
      gamemode: 'Barcode Game',
      type: 'barcode'
    }
  ];

  let currentWaypointId = null;

  // ── Elements ──
  const mapContainer = document.getElementById('game-map');
  const modalOverlay = document.getElementById('waypoint-modal-overlay');
  const modalTitle = document.getElementById('waypoint-modal-title');
  const modalDesc = document.getElementById('waypoint-modal-desc');
  const modalGamemode = document.getElementById('waypoint-gamemode');
  
  const btnCloseModal = document.getElementById('btn-close-waypoint-modal');
  const btnRemoveWaypoint = document.getElementById('btn-remove-waypoint');
  const btnEditWaypoint = document.getElementById('btn-edit-waypoint');
  const btnAddWaypoint = document.getElementById('btn-add-waypoint');
  
  // Editor elements
  const waypointEditor = document.getElementById('waypoint-editor');
  const builderActionsContainer = document.getElementById('builder-actions-container');
  const editorTitle = document.getElementById('editor-title');
  const editorDesc = document.getElementById('editor-desc');
  const btnCancelEditor = document.getElementById('btn-cancel-editor');
  const btnSaveEditor = document.getElementById('btn-save-editor');

  // Transition Modal elements
  const transitionModalOverlay = document.getElementById('transition-modal-overlay');
  const btnCloseTransition = document.getElementById('btn-close-transition-modal');
  const btnCancelTransition = document.getElementById('btn-cancel-transition');
  const btnSaveTransition = document.getElementById('btn-save-transition');
  const transitionGamesList = document.getElementById('transition-games-list');
  const editorPredecessorsList = document.getElementById('editor-predecessors-list');
  const editorSuccessorsList = document.getElementById('editor-successors-list');

  // ── Render Map ──
  function renderMap() {
    if (!mapContainer) return;

    // Clear existing map items (except placeholder if any)
    const existingPins = mapContainer.querySelectorAll('.mock-waypoint, .mock-path');
    existingPins.forEach(el => el.remove());

    if (mockWaypoints.length > 0) {
      // Draw path lines between waypoints
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, 'svg');
      svg.setAttribute('class', 'mock-path');
      
      for (let i = 0; i < mockWaypoints.length - 1; i++) {
        const wp1 = mockWaypoints[i];
        const wp2 = mockWaypoints[i+1];
        
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', `${wp1.x}%`);
        line.setAttribute('y1', `${wp1.y}%`);
        line.setAttribute('x2', `${wp2.x}%`);
        line.setAttribute('y2', `${wp2.y}%`);
        svg.appendChild(line);
      }
      mapContainer.appendChild(svg);
    }

    // Render pins
    mockWaypoints.forEach(wp => {
      const pin = document.createElement('div');
      pin.className = 'mock-waypoint';
      pin.setAttribute('data-id', wp.id);
      pin.setAttribute('data-type', wp.type);
      pin.style.left = `${wp.x}%`;
      pin.style.top = `${wp.y}%`;
      pin.title = wp.title;

      pin.addEventListener('click', () => openModal(wp));
      mapContainer.appendChild(pin);
    });
  }

  // ── Modal Handlers ──
  function openModal(wp) {
    currentWaypointId = wp.id;
    modalTitle.textContent = wp.title;
    modalDesc.textContent = wp.description;
    modalGamemode.textContent = wp.gamemode;
    
    // Customize icon based on type (optional enhancement)
    const iconContainer = document.querySelector('.gamemode-card__icon');
    if (iconContainer) {
      if (wp.type === 'ar') {
        iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`;
      } else {
        iconContainer.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>`;
      }
    }

    modalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    currentWaypointId = null;
    modalOverlay.setAttribute('aria-hidden', 'true');
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // ── Actions ──
  function openEditor(waypointData = null) {
    if (builderActionsContainer) builderActionsContainer.hidden = true;
    if (waypointEditor) waypointEditor.hidden = false;
    
    if (waypointData) {
      editorTitle.value = waypointData.title || '';
      editorDesc.value = waypointData.description || '';
    } else {
      editorTitle.value = '';
      editorDesc.value = '';
    }
    
    // Scroll editor into view
    setTimeout(() => {
      waypointEditor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  function closeEditor() {
    if (waypointEditor) waypointEditor.hidden = true;
    if (builderActionsContainer) builderActionsContainer.hidden = false;
  }

  if (btnAddWaypoint) {
    btnAddWaypoint.addEventListener('click', () => {
      openEditor();
    });
  }

  if (btnEditWaypoint) {
    btnEditWaypoint.addEventListener('click', () => {
      if (!currentWaypointId) return;
      const wp = mockWaypoints.find(w => w.id === currentWaypointId);
      closeModal();
      if (wp) openEditor(wp);
    });
  }

  if (btnCancelEditor) {
    btnCancelEditor.addEventListener('click', closeEditor);
  }

  if (btnSaveEditor) {
    btnSaveEditor.addEventListener('click', () => {
      // Mock save action
      closeEditor();
    });
  }

  if (btnRemoveWaypoint) {
    btnRemoveWaypoint.addEventListener('click', () => {
      if (!currentWaypointId) return;
      
      const confirmRemove = confirm('Are you sure you want to remove this waypoint?');
      if (confirmRemove) {
        const index = mockWaypoints.findIndex(wp => wp.id === currentWaypointId);
        if (index > -1) {
          mockWaypoints.splice(index, 1);
          renderMap();
        }
        closeModal();
      }
    });
  }

  // ── Transition Modal Logic ──
  function openTransitionModal(games) {
    if (!transitionGamesList) return;
    transitionGamesList.innerHTML = ''; // Clear list

    if (games.length === 0) {
      transitionGamesList.innerHTML = '<p class="modal__desc" style="text-align: center; opacity: 0.5;">No games to configure.</p>';
    } else {
      games.forEach((game, index) => {
        const card = document.createElement('div');
        card.className = 'transition-game-card';
        card.innerHTML = `
          <div class="transition-game-card__title">${game.name}</div>
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
        `;
        transitionGamesList.appendChild(card);
      });
    }
    if (transitionModalOverlay) {
      transitionModalOverlay.setAttribute('aria-hidden', 'false');
    }
  }

  function closeTransitionModal() {
    if (transitionModalOverlay) {
      transitionModalOverlay.setAttribute('aria-hidden', 'true');
    }
  }

  if (btnCloseTransition) btnCloseTransition.addEventListener('click', closeTransitionModal);
  if (btnCancelTransition) btnCancelTransition.addEventListener('click', closeTransitionModal);
  if (btnSaveTransition) {
    btnSaveTransition.addEventListener('click', () => {
      // Mock save
      closeTransitionModal();
    });
  }
  if (transitionModalOverlay) {
    transitionModalOverlay.addEventListener('click', (e) => {
      if (e.target === transitionModalOverlay) closeTransitionModal();
    });
  }

  // Delegated click events for Predecessor and Successor cards
  if (editorPredecessorsList) {
    editorPredecessorsList.addEventListener('click', (e) => {
      const subCard = e.target.closest('.sub-card');
      // Ignore clicks on the 3 dots action button itself
      if (subCard && !e.target.closest('.sub-card__action')) {
        // Mock loading games from the selected predecessor
        const mockPredecessorGames = [
          { name: 'AR Object Scan' },
          { name: 'GPS Location' }
        ];
        openTransitionModal(mockPredecessorGames);
      }
    });
  }

  if (editorSuccessorsList) {
    editorSuccessorsList.addEventListener('click', (e) => {
      const subCard = e.target.closest('.sub-card');
      // Ignore clicks on the 3 dots action button itself
      if (subCard && !e.target.closest('.sub-card__action')) {
        // Mock loading games from the current waypoint
        const mockCurrentGames = [
          { name: 'Barcode Game' }
        ];
        openTransitionModal(mockCurrentGames);
      }
    });
  }

  // Initial render
  renderMap();
});
