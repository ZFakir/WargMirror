/**
 * WARG Platform — Catalogue Script
 * Handles rendering the game catalogue grid, pagination, and filters.
 */

document.addEventListener('DOMContentLoaded', () => {
  const catalogueGrid = document.getElementById('catalogue-grid');
  
  if (!catalogueGrid || typeof WARG_GAMES === 'undefined' || typeof GameCard === 'undefined') {
    return;
  }

  // Combine all mock games into a single list for the catalogue
  const allGames = [
    ...(WARG_GAMES.recent || []),
    ...(WARG_GAMES.new || []),
    ...(WARG_GAMES.fromCreators || [])
  ];

  // Optional: Shuffle or sort them for a more realistic catalogue feel
  // We'll just render them straight
  allGames.forEach(game => {
    const card = GameCard.create(game);
    catalogueGrid.appendChild(card);
  });

  // Mock Pagination logic
  const paginationPages = document.querySelectorAll('.pagination-page');
  paginationPages.forEach(pageBtn => {
    pageBtn.addEventListener('click', () => {
      // Remove active class from all
      document.querySelectorAll('.pagination-page.active').forEach(el => el.classList.remove('active'));
      // Set clicked to active
      pageBtn.classList.add('active');
      
      // Simulate loading new content by shuffling the grid items visually
      catalogueGrid.style.opacity = '0.5';
      setTimeout(() => {
        catalogueGrid.style.opacity = '1';
        // In a real app, this would fetch and render a new page of games
      }, 300);
    });
  });

  // Mock Filter logic
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip.active').forEach(el => el.classList.remove('active'));
      chip.classList.add('active');
    });
  });

});
