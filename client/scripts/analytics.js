/**
 * WARG Platform — Analytics Script
 * Handles interactivity and mock data for the Creator Analytics dashboard.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── State ──
  let mockFlags = [
    {
      id: 'f1',
      type: 'high',
      title: 'Waypoint 4 Inaccessible',
      description: 'The park gate is locked after 8 PM, making the physical location unreachable at night.',
      meta: 'Reported by @shadow_runner · 2 hours ago'
    },
    {
      id: 'f2',
      type: 'medium',
      title: 'Inaccurate GPS Coordinates',
      description: 'Clue 2 leads to the middle of the street instead of the coffee shop entrance.',
      meta: 'Reported by @neon_dreamer · 1 day ago'
    },
    {
      id: 'f3',
      type: 'medium',
      title: 'AR Trigger Not Registering',
      description: 'The mural scan didn\'t trigger the next step for 3 players in our group.',
      meta: 'Reported by @pixel_punk · 3 days ago'
    }
  ];
  let resolvedFlags = [];
  let currentFlagId = null;

  // ── Elements ──
  const flagsList = document.getElementById('flags-list');
  const modalOverlay = document.getElementById('flag-modal-overlay');
  const modalTitle = document.getElementById('flag-modal-title');
  const modalDesc = document.getElementById('flag-modal-desc');
  const modalMeta = document.getElementById('flag-modal-meta');
  const btnCloseModal = document.getElementById('btn-close-flag-modal');
  const btnCancelFlag = document.getElementById('btn-cancel-flag');
  const btnResolveFlag = document.getElementById('btn-resolve-flag');
  const badgeCount = document.querySelector('.analytics-card.flags-card .badge');

  // ── Render Flags ──
  function renderFlags() {
    if (!flagsList) return;

    if (mockFlags.length === 0) {
      flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-text-muted);">No active flags.</div>`;
      if (badgeCount) badgeCount.style.display = 'none';
      return;
    }

    if (badgeCount) {
      badgeCount.style.display = 'inline-block';
      badgeCount.textContent = `${mockFlags.length} New`;
    }

    flagsList.innerHTML = mockFlags.map(flag => {
      const isHigh = flag.type === 'high';
      const icon = isHigh 
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

      return `
        <div class="flag-item ${isHigh ? 'flag-item--high' : ''}" data-id="${flag.id}">
          <div class="flag-item__icon">
            ${icon}
          </div>
          <div class="flag-item__content">
            <div class="flag-item__title">${flag.title}</div>
            <div class="flag-item__desc">${flag.description}</div>
            <div class="flag-item__meta">${flag.meta}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Initial render
  renderFlags();

  // ── Modal Handlers ──
  function openModal(flag) {
    currentFlagId = flag.id;
    modalTitle.textContent = flag.title;
    modalDesc.textContent = flag.description;
    modalMeta.textContent = flag.meta;
    modalOverlay.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    currentFlagId = null;
    modalOverlay.setAttribute('aria-hidden', 'true');
  }

  if (flagsList) {
    flagsList.addEventListener('click', (e) => {
      const flagItem = e.target.closest('.flag-item');
      if (!flagItem) return;

      const flagId = flagItem.getAttribute('data-id');
      const flag = mockFlags.find(f => f.id === flagId);
      if (flag) {
        openModal(flag);
      }
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelFlag) btnCancelFlag.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  if (btnResolveFlag) {
    btnResolveFlag.addEventListener('click', () => {
      if (!currentFlagId) return;
      
      const flagIndex = mockFlags.findIndex(f => f.id === currentFlagId);
      if (flagIndex > -1) {
        // Move to resolved array
        const resolved = mockFlags.splice(flagIndex, 1)[0];
        resolvedFlags.push(resolved);
        renderFlags();
      }
      closeModal();
    });
  }

  // ── Card Footer Actions ──
  const btnLoadMore = document.getElementById('btn-load-more-flags');
  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
      alert('Loading more historical flags from the database...');
    });
  }

  const btnViewResolved = document.getElementById('btn-view-resolved');
  if (btnViewResolved) {
    btnViewResolved.addEventListener('click', () => {
      alert(`Viewing ${resolvedFlags.length} resolved flags.`);
    });
  }

  // ── Action Buttons ──
  const btnEdit = document.getElementById('btn-edit-warg');
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      alert('Opening WARG Builder to edit "Operation: Midnight Sun"...');
    });
  }

  const btnRemove = document.getElementById('btn-remove-warg');
  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      const confirmDelete = confirm('WARNING: Are you sure you want to permanently delete "Operation: Midnight Sun"? This action cannot be undone and will erase all player progress.');
      if (confirmDelete) {
        alert('ARG removed successfully. Returning to Creator Studio...');
        window.location.href = 'studio.html';
      }
    });
  }
});
