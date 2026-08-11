/**
 * WARG Platform — Game Page Script
 * Handles: Progress timeline rendering and interactions.
 */

import playModal from './components/PlayModal.js';
import { FlagModal } from './components/FlagModal.js';
import mapModal from './components/MapModal.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize the reusable Flag Modal
  const flagModal = new FlagModal();
  const btnFlagGame = document.getElementById('btn-flag-game');
  if (btnFlagGame) {
    btnFlagGame.addEventListener('click', () => {
      // Open the flag modal with a context (e.g., the current game title)
      flagModal.open('Issue with this WARG');
    });
  }
  
  // Initialize the embedded Map
  mapModal.init();

  // Listen for the 'Play' event from the Map Modal
  document.addEventListener('warg:play-node', (e) => {
    const node = e.detail;
    // Launch the game's actual Play Modal using the node's data
    playModal.open(node.name, node.desc);
    
    const actionBtn = document.createElement('button');
    actionBtn.className = 'btn btn--primary';
    actionBtn.textContent = 'Scan Barcode';
    playModal.setControls(actionBtn);
  });

});
