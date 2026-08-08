/**
 * WARG Platform — Creator Studio Script
 * Handles rendering the published and unpublished WARG rows.
 */

import { PublishModal } from './components/PublishModal.js';

document.addEventListener('DOMContentLoaded', () => {
  const publishModal = new PublishModal();

  if (typeof GameCard !== 'undefined' && typeof WARG_GAMES !== 'undefined') {
    // We are reusing the existing WARG_GAMES data for demonstration
    // Published games mock
    GameCard.renderRow('row-published', WARG_GAMES.new, { hideProgress: true, showUnpublish: true });
    
    // Unpublished games mock
    GameCard.renderRow('row-unpublished', WARG_GAMES.recent, { hideProgress: true, showPublish: true });
  }

  // Hero card action (mock)
  const heroCard = document.querySelector('.studio-hero');
  if (heroCard) {
    heroCard.addEventListener('click', () => {
      alert('Opening the WARG Builder...');
    });
  }

  // Listen for publish events from GameCards
  document.addEventListener('warg:publish', (e) => {
    publishModal.open(e.detail.gameTitle, 'publish');
  });

  // Listen for unpublish events from GameCards
  document.addEventListener('warg:unpublish', (e) => {
    publishModal.open(e.detail.gameTitle, 'unpublish');
  });
});
