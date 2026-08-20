/**
 * WARG Platform — Catalogue Script
 * Handles rendering the game catalogue grid, filter chips, and pagination.
 * Data is fetched from the live API; works for guests and logged-in users.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const catalogueGrid = document.getElementById('catalogue-grid');
  if (!catalogueGrid || typeof GameCard === 'undefined' || typeof api === 'undefined') return;

  // ── Loading skeleton ──
  let skeletonHtml = '';
  for (let i = 0; i < 12; i++) {
    skeletonHtml +=
      '<div class="game-card game-card--skeleton" aria-hidden="true">' +
        '<div class="gc-cover" style="background:var(--color-surface-2)"></div>' +
        '<div class="gc-body">' +
          '<div class="skeleton-line skeleton-line--title"></div>' +
          '<div class="skeleton-line skeleton-line--caption"></div>' +
          '<div class="skeleton-line skeleton-line--caption" style="width:60%"></div>' +
        '</div>' +
      '</div>';
  }
  catalogueGrid.innerHTML = skeletonHtml;

  // ── Fetch all published ARGs ──
  let allArgs = [];
  try {
    allArgs = await api.getArgs();
  } catch (err) {
    console.error('[Catalogue] Failed to load ARGs:', err);
    catalogueGrid.innerHTML =
      '<p style="color:var(--color-text-muted);grid-column:1/-1;text-align:center;padding:2rem">' +
      'Unable to load games. Please check your connection and try again.</p>';
    return;
  }

  let activeFilter = 'all'; // track active filter chip

  // ── Render helpers ──
  function getFilteredArgs() {
    if (activeFilter === 'all') return allArgs;
    return allArgs.filter(a => a.mode === activeFilter);
  }

  function renderGrid() {
    const filtered = getFilteredArgs();
    catalogueGrid.innerHTML = '';

    if (filtered.length === 0) {
      catalogueGrid.innerHTML =
        '<p style="color:var(--color-text-muted);grid-column:1/-1;text-align:center;padding:2rem">' +
        'No games match this filter.</p>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(game => frag.appendChild(GameCard.create(game)));
    catalogueGrid.appendChild(frag);
  }

  // Initial render
  renderGrid();

  // ── Filter chips ──
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter || 'all';
      renderGrid();
    });
  });

  // ── Pagination (cosmetic fade — real pagination would need server-side offset) ──
  const paginationPages = document.querySelectorAll('.pagination-page');
  paginationPages.forEach(pageBtn => {
    pageBtn.addEventListener('click', () => {
      document.querySelectorAll('.pagination-page.active').forEach(el => el.classList.remove('active'));
      pageBtn.classList.add('active');
      catalogueGrid.style.opacity = '0.5';
      setTimeout(() => { catalogueGrid.style.opacity = '1'; }, 300);
    });
  });
});

