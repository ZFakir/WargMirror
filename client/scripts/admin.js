/**
 * WARG Platform — Admin Dashboard Script
 * Handles fetching real data for flagged games, recent flags, and player search.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Render Flagged Games Row ──
  const flaggedGamesRow = document.getElementById('row-flagged-games');
  
  // ── Render Recent Flags List ──
  const flagsList = document.getElementById('admin-flags-list');
  let activeFlagId = null;

  async function loadFlags() {
    if (!flagsList) return;

    // Show skeletons
    if (flaggedGamesRow) {
      flaggedGamesRow.innerHTML = ''; // Ensure no game cards are on screen initially
    }
    
    flagsList.innerHTML = Array(3).fill(
      `<div class="flag-item" style="opacity: 0.7; animation: pulse 1.5s infinite ease-in-out;">
        <div class="flag-item__icon" style="background:var(--color-surface-2); border-radius: 50%; color:transparent; width: 40px; height: 40px;"></div>
        <div class="flag-item__content" style="width: 100%;">
          <div class="skeleton-line skeleton-line--title" style="margin-bottom: 8px;"></div>
          <div class="skeleton-line skeleton-line--caption" style="margin-bottom: 8px; width: 80%;"></div>
          <div class="skeleton-line skeleton-line--caption" style="width: 40%;"></div>
        </div>
      </div>`
    ).join('');

    try {
      const response = await fetch(`${window.API_BASE_URL || ''}/api/admin/flags`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch flags');
      const flags = await response.json();

      if (flags.length === 0) {
        flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-text-muted);">No recent flags.</div>`;
        if (flaggedGamesRow) flaggedGamesRow.innerHTML = '';
        return;
      }

      flagsList.innerHTML = flags.map(flag => {
        const isHigh = flag.reason === 'inappropriate_content' || flag.reason === 'safety_concern';
        const icon = isHigh 
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

        const title = flag.reason.replace('_', ' ').toUpperCase();
        const meta = `Game: ${flag.Arg?.title || 'Unknown'} · Reported by @${flag.Reporter?.username || 'unknown'}`;

        return `
          <div class="flag-item ${isHigh ? 'flag-item--high' : ''}" data-id="${flag.flag_id}">
            <div class="flag-item__icon">
              ${icon}
            </div>
            <div class="flag-item__content">
              <div class="flag-item__title">${title}</div>
              <div class="flag-item__desc">${flag.description || 'No description provided.'}</div>
              <div class="flag-item__meta">${meta}</div>
            </div>
            <button class="btn btn--outline btn--small btn-review-flag" data-id="${flag.flag_id}" data-desc="${flag.description || 'N/A'}" data-meta="${meta}" data-title="${title}" data-gameid="${flag.Arg?.arg_id}">Review</button>
          </div>
        `;
      }).join('');

      // Render the unique flagged games in the row
      if (flaggedGamesRow && typeof GameCard !== 'undefined' && typeof GAMES !== 'undefined') {
        const uniqueGameIds = [...new Set(flags.map(f => f.Arg?.arg_id).filter(id => id))];
        // For demonstration, map these to mock GAMES if possible, or fetch real games. 
        // Here we just use GAMES mock matching IDs if they exist, or fallback to GAMES.slice(0, 4) if none match mock data
        let flaggedGames = GAMES.filter(g => uniqueGameIds.includes(Number(g.id)));
        if (flaggedGames.length === 0 && uniqueGameIds.length > 0) {
           flaggedGames = GAMES.slice(0, uniqueGameIds.length); // Fallback mock 
        }
        GameCard.renderRow(flaggedGames, flaggedGamesRow);
      }

    } catch (error) {
      console.error(error);
      flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-danger);">Error loading flags.</div>`;
    }
  }

  loadFlags();

  // Handle Review Flag clicks (Delegation)
  if (flagsList) {
    flagsList.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-review-flag');
      if (!btn) return;
      
      activeFlagId = btn.dataset.id;
      const gameId = btn.dataset.gameid;
      document.getElementById('flag-modal-title').textContent = btn.dataset.title;
      document.getElementById('flag-modal-desc').textContent = btn.dataset.desc;
      
      // Inject Delete Game button into the modal meta area alongside standard meta
      const metaHtml = `
        <div style="margin-bottom: var(--space-4);">${btn.dataset.meta}</div>
        ${gameId ? `<button class="btn btn--outline btn--small btn-delete-game" style="border-color: var(--color-danger); color: var(--color-danger);" data-gameid="${gameId}">Delete Game</button>` : ''}
      `;
      document.getElementById('flag-modal-meta').innerHTML = metaHtml;
      document.getElementById('flag-modal-overlay').setAttribute('aria-hidden', 'false');
    });
  }

  // Handle Close / Cancel Modal
  const closeModal = () => {
    document.getElementById('flag-modal-overlay').setAttribute('aria-hidden', 'true');
    activeFlagId = null;
  };
  document.getElementById('btn-close-flag-modal')?.addEventListener('click', closeModal);
  document.getElementById('btn-cancel-flag')?.addEventListener('click', closeModal);

  // Handle Resolve Flag
  document.getElementById('btn-resolve-flag')?.addEventListener('click', async () => {
    if (!activeFlagId) return;
    
    const btn = document.getElementById('btn-resolve-flag');
    const originalText = btn.textContent;
    btn.innerHTML = `<div style="display:inline-block;width:16px;height:16px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;vertical-align:middle;"></div>`;
    btn.disabled = true;

    try {
      const res = await fetch(`${window.API_BASE_URL || ''}/api/admin/flags/${activeFlagId}/resolve`, { method: 'PUT', credentials: 'include' });
      if (res.ok) {
        closeModal();
        loadFlags();
      } else {
        if (typeof showToast !== 'undefined') showToast('Failed to resolve flag.');
      }
    } catch (error) {
      console.error(error);
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Handle Delete Game from Modal
  document.getElementById('flag-modal-meta')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete-game');
    if (!btn) return;
    const gameId = btn.dataset.gameid;
    if (window.confirmModal) {
      window.confirmModal.open({
        title: 'Delete Game',
        desc: 'Are you sure you want to delete this game? This action cannot be undone.',
        confirmText: 'Delete',
        callback: async () => {
          try {
            const res = await fetch(`${window.API_BASE_URL || ''}/api/admin/games/${gameId}`, { method: 'DELETE', credentials: 'include' });
            if (res.ok) {
              if (typeof showToast !== 'undefined') showToast('Game deleted successfully.');
              closeModal();
              loadFlags();
            } else {
              if (typeof showToast !== 'undefined') showToast('Failed to delete game.');
            }
          } catch (error) {
            console.error(error);
          }
        }
      });
    }
  });

  // ── Catalogue Card Click Handler ──
  const btnGoCatalogue = document.getElementById('btn-go-catalogue');
  if (btnGoCatalogue) {
    btnGoCatalogue.addEventListener('click', () => {
      window.location.href = 'catalogue.html';
    });
  }

  // ── Player Search Handler ──
  const btnSearchPlayer = document.getElementById('btn-search-player');
  const inputSearchPlayer = document.getElementById('input-search-player');
  const searchResultsContainer = document.getElementById('search-results-container');

  async function loadUsers(query = '') {
    if (!searchResultsContainer) return;
    
    searchResultsContainer.innerHTML = Array(2).fill(
      `<div class="user-search-result" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); border-bottom: 1px solid var(--color-border); background: var(--color-surface); opacity: 0.7; animation: pulse 1.5s infinite ease-in-out;">
        <div style="flex: 1;">
          <div class="skeleton-line skeleton-line--title" style="margin-bottom: 8px; width: 30%;"></div>
          <div class="skeleton-line skeleton-line--caption" style="width: 50%;"></div>
        </div>
        <div style="width: 80px; display: flex; flex-direction: column; align-items: flex-end;">
          <div class="skeleton-line skeleton-line--caption" style="margin-bottom: 8px; width: 60px;"></div>
          <div class="skeleton-line skeleton-line--caption" style="height: 28px; width: 80px; border-radius: var(--radius-sm);"></div>
        </div>
      </div>`
    ).join('');

    try {
      const url = query ? `${window.API_BASE_URL || ''}/api/admin/users?search=${encodeURIComponent(query)}` : `${window.API_BASE_URL || ''}/api/admin/users`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch users');
      const users = await res.json();

      if (users.length === 0) {
        searchResultsContainer.innerHTML = `<p style="color: var(--color-text-muted);">No users found.</p>`;
        return;
      }

      searchResultsContainer.innerHTML = users.map(user => `
        <div class="user-search-result" style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); border-bottom: 1px solid var(--color-border); background: var(--color-surface);">
          <div>
            <div style="font-weight: 500;">${user.username}</div>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">${user.email}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: var(--font-size-sm); margin-bottom: 4px; ${user.trust_score < 50 ? 'color: var(--color-danger); font-weight: bold;' : 'color: var(--color-text-muted);'}">Trust: ${user.trust_score}</div>
            <button class="btn btn--small btn--outline btn-toggle-ban" data-id="${user.user_id}" style="border-color: ${user.is_flagged ? 'var(--color-primary)' : 'var(--color-danger)'}; color: ${user.is_flagged ? 'var(--color-primary)' : 'var(--color-danger)'};">
              ${user.is_flagged ? 'Unban User' : 'Ban User'}
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error(error);
      searchResultsContainer.innerHTML = `<p style="color: var(--color-danger);">Error loading users.</p>`;
    }
  }

  if (btnSearchPlayer && inputSearchPlayer) {
    btnSearchPlayer.addEventListener('click', () => loadUsers(inputSearchPlayer.value.trim()));
    inputSearchPlayer.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') loadUsers(inputSearchPlayer.value.trim());
    });
  }

  // Handle Ban/Unban clicks
  if (searchResultsContainer) {
    searchResultsContainer.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-toggle-ban');
      if (!btn) return;
      
      const userId = btn.dataset.id;
      const actionText = btn.textContent.trim(); // "Ban User" or "Unban User"

      if (window.confirmModal) {
        window.confirmModal.open({
          title: actionText,
          desc: `Are you sure you want to ${actionText.toLowerCase()}?`,
          confirmText: 'Confirm',
          callback: async () => {
            try {
              const res = await fetch(`${window.API_BASE_URL || ''}/api/admin/users/${userId}/ban`, { method: 'PUT', credentials: 'include' });
              if (res.ok) {
                loadUsers(inputSearchPlayer?.value.trim());
              } else {
                if (typeof showToast !== 'undefined') showToast('Failed to toggle user ban status.');
              }
            } catch (error) {
              console.error(error);
            }
          }
        });
      }
    });
  }

  // Load lowest trust score users on initial load
  loadUsers();
});
