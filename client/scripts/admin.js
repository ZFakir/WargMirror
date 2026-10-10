/* global showToast */
/**
 * WARG Platform — Admin Dashboard Script
 * Handles fetching real data for flagged games, recent flags, and player search.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ── Admin guard: only admins belong here ──
  if (typeof api !== 'undefined') {
    const user = await api.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    if (user.role !== 'admin') {
      window.location.href = 'home.html';
      return;
    }
  }

  // ── Platform Metrics ──
  async function loadMetrics() {
    const metricsEl = document.getElementById('admin-metrics');
    if (!metricsEl) return;
    try {
      const res = await fetch(`${window.API_BASE_URL || ''}/api/admin/metrics`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const m = await res.json();

      const items = [
        ['Total Users', m.total_users],
        ['Published WARGs', m.published_args],
        ['Open Flags', m.open_flags],
        ['Active Sessions', m.active_sessions],
        ['Completed Sessions', m.completed_sessions]
      ];

      metricsEl.innerHTML = '';
      items.forEach(([label, value]) => {
        const cell = document.createElement('div');
        cell.style.cssText = 'background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-3);text-align:center;';
        const v = document.createElement('div');
        v.style.cssText = 'font-size:1.5rem;font-weight:700;';
        v.textContent = value !== undefined ? value : '—';
        const l = document.createElement('div');
        l.style.cssText = 'font-size:var(--font-size-caption);color:var(--color-text-muted);margin-top:2px;';
        l.textContent = label;
        cell.append(v, l);
        metricsEl.appendChild(cell);
      });
    } catch (error) {
      console.error(error);
    }
  }

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
      const response = await fetch(`${window.API_BASE_URL || ''}/api/admin/flags`, { 
        credentials: 'include',
        cache: 'no-store' 
      });
      if (!response.ok) throw new Error('Failed to fetch flags');
      const flags = await response.json();

      if (flags.length === 0) {
        flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-text-muted);">No recent flags.</div>`;
        if (flaggedGamesRow) flaggedGamesRow.innerHTML = '';
        return;
      }

      // Built with DOM APIs + textContent so user-typed content (flag
      // descriptions, game titles, usernames) is never rendered as HTML.
      flagsList.innerHTML = '';
      flags.forEach(flag => {
        const isHigh = flag.reason === 'inappropriate_content' || flag.reason === 'safety_concern';
        const icon = isHigh
          ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
          : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

        const item = document.createElement('div');
        item.className = 'flag-item' + (isHigh ? ' flag-item--high' : '');
        item.dataset.id = flag.flag_id;

        const iconBox = document.createElement('div');
        iconBox.className = 'flag-item__icon';
        iconBox.innerHTML = icon;

        const content = document.createElement('div');
        content.className = 'flag-item__content';

        const title = document.createElement('div');
        title.className = 'flag-item__title';
        title.textContent = (flag.reason || '').replace('_', ' ').toUpperCase();

        const desc = document.createElement('div');
        desc.className = 'flag-item__desc';
        desc.textContent = flag.description || 'No description provided.';

        const meta = document.createElement('div');
        meta.className = 'flag-item__meta';
        meta.textContent = `Game: ${flag.Arg?.title || 'Unknown'} · Reported by @${flag.Reporter?.username || 'unknown'}`;

        content.append(title, desc, meta);

        const btn = document.createElement('button');
        btn.className = 'btn btn--outline btn--small btn-review-flag';
        btn.textContent = 'Review';
        btn.dataset.id = flag.flag_id;
        btn.dataset.title = title.textContent;
        btn.dataset.desc = flag.description || 'N/A';
        btn.dataset.meta = meta.textContent;
        if (flag.Arg?.arg_id) btn.dataset.gameid = flag.Arg.arg_id;

        item.append(iconBox, content, btn);
        flagsList.appendChild(item);
      });

      // Render the unique flagged games in the row from real data
      if (flaggedGamesRow && typeof GameCard !== 'undefined' && typeof api !== 'undefined') {
        flaggedGamesRow.innerHTML = '';
        const uniqueGameIds = [...new Set(flags.map(f => f.Arg?.arg_id).filter(id => id))];
        if (uniqueGameIds.length > 0) {
          const cards = await Promise.all(uniqueGameIds.slice(0, 6).map(id =>
            api.getArgById(id).catch(() => null)
          ));
          const valid = cards.filter(Boolean);
          if (valid.length > 0) {
            GameCard.renderRow('flagged-games-row', valid, { hideProgress: true });
          } else {
            flaggedGamesRow.innerHTML = '<p style="color:var(--color-text-muted);padding:var(--space-3) 0;">Flagged games could not be loaded.</p>';
          }
        }
      }

    } catch (error) {
      console.error(error);
      flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-danger);">Error loading flags.</div>`;
    }
  }

  loadFlags();
  loadMetrics();

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

      searchResultsContainer.innerHTML = '';
      users.forEach(user => {
        // Built with DOM APIs + textContent — usernames/emails are user data.
        const row = document.createElement('div');
        row.className = 'user-search-result';
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); border-bottom: 1px solid var(--color-border); background: var(--color-surface);';

        const left = document.createElement('div');
        const nameEl = document.createElement('div');
        nameEl.style.fontWeight = '500';
        nameEl.textContent = user.username;
        const emailEl = document.createElement('div');
        emailEl.style.cssText = 'font-size: var(--font-size-sm); color: var(--color-text-secondary);';
        emailEl.textContent = user.email;
        left.append(nameEl, emailEl);

        const right = document.createElement('div');
        right.style.textAlign = 'right';

        const trustEl = document.createElement('div');
        trustEl.style.cssText = 'font-size: var(--font-size-sm); margin-bottom: 4px; ' + (user.trust_score < 50 ? 'color: var(--color-danger); font-weight: bold;' : 'color: var(--color-text-muted);');
        trustEl.textContent = `Trust: ${user.trust_score}`;

        const banned = user.is_suspended === true;
        const banBtn = document.createElement('button');
        banBtn.className = 'btn btn--small btn--outline btn-toggle-ban';
        banBtn.dataset.id = user.user_id;
        banBtn.dataset.banned = banned ? '1' : '0';
        banBtn.style.borderColor = banned ? 'var(--color-primary)' : 'var(--color-danger)';
        banBtn.style.color = banned ? 'var(--color-primary)' : 'var(--color-danger)';
        banBtn.textContent = banned ? 'Unban User' : 'Ban User';

        right.append(trustEl, banBtn);

        if (user.is_flagged) {
          const flagNote = document.createElement('div');
          flagNote.style.cssText = 'font-size: 11px; margin-top: 4px; color: var(--color-warning, #f59e0b);';
          flagNote.textContent = 'Trust flag (anti-spoofing)';
          right.appendChild(flagNote);
        }

        row.append(left, right);
        searchResultsContainer.appendChild(row);
      });
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
      const isBanned = btn.dataset.banned === '1';
      const actionText = isBanned ? 'Unban User' : 'Ban User';

      if (window.confirmModal) {
        window.confirmModal.open({
          title: actionText,
          desc: isBanned
            ? 'Restore this user\'s access to the platform?'
            : 'Suspend this user and block them from logging in? Their game history stays intact.',
          confirmText: isBanned ? 'Unban' : 'Ban',
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
