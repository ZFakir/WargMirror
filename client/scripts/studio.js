/**
 * WARG Platform — Creator Studio Script
 * Handles rendering the published and unpublished WARG rows.
 */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof GameCard !== 'undefined' && typeof WARG_GAMES !== 'undefined') {
    // We are reusing the existing WARG_GAMES data for demonstration
    // Published games mock
    GameCard.renderRow('row-published', WARG_GAMES.new, { hideProgress: true });
    
    // Unpublished games mock
    GameCard.renderRow('row-unpublished', WARG_GAMES.recent, { hideProgress: true });
  }

  // Hero card action (mock)
  const heroCard = document.querySelector('.studio-hero');
  if (heroCard) {
    heroCard.addEventListener('click', () => {
      alert('Opening the WARG Builder...');
    });
  }
});
