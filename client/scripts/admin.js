/**
 * WARG Platform — Admin Dashboard Script
 * Handles rendering mock data for flagged games and recent flags.
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Render Flagged Games Row ──
  const flaggedGamesRow = document.getElementById('row-flagged-games');
  if (flaggedGamesRow && typeof GameCard !== 'undefined' && typeof GAMES !== 'undefined') {
    // We'll mock that the first 4 games are flagged
    const flaggedGames = GAMES.slice(0, 4);
    GameCard.renderRow(flaggedGames, flaggedGamesRow);
  }

  // ── Render Recent Flags List ──
  const flagsList = document.getElementById('admin-flags-list');
  const mockAdminFlags = [
    {
      id: 'f1',
      type: 'high',
      title: 'Inappropriate Content in Waypoint',
      description: 'The description for Waypoint 3 contains offensive language.',
      meta: 'Game: Operation Midnight Sun · Reported by @concerned_citizen'
    },
    {
      id: 'f2',
      type: 'medium',
      title: 'Broken Location Coordinates',
      description: 'The final destination directs players into private property.',
      meta: 'Game: Campus Ghost Hunt · Reported by @security_guard'
    },
    {
      id: 'f3',
      type: 'low',
      title: 'Game is impossible to complete',
      description: 'Clue 4 requires a physical object that was removed last week.',
      meta: 'Game: Neon Nights · Reported by @frustrated_player'
    }
  ];

  if (flagsList) {
    if (mockAdminFlags.length === 0) {
      flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-text-muted);">No recent flags.</div>`;
    } else {
      flagsList.innerHTML = mockAdminFlags.map(flag => {
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
            <button class="btn btn--outline btn--small" style="margin-left: auto;">Review</button>
          </div>
        `;
      }).join('');
    }
  }

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
  if (btnSearchPlayer && inputSearchPlayer) {
    btnSearchPlayer.addEventListener('click', () => {
      const q = inputSearchPlayer.value.trim();
      if (q) {
        alert(`Searching for player: ${q}`);
      }
    });
  }
});
