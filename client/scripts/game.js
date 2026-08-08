/**
 * WARG Platform — Game Page Script
 * Handles: Progress timeline rendering and interactions.
 */

import playModal from './components/PlayModal.js';

document.addEventListener('DOMContentLoaded', () => {

  // Mock data representing a linear ARG timeline
  const GAME_TIMELINE = [
    {
      id: 'node-1',
      name: 'The Wits Great Hall',
      summary: 'You successfully decoded the cipher hidden in the architecture of the Great Hall.',
      status: 'completed'
    },
    {
      id: 'node-2',
      name: 'Origin Centre Museum',
      summary: 'Found the ancient artifact replica and answered the trivia question.',
      status: 'completed'
    },
    {
      id: 'node-3',
      name: 'Chamber of Mines Building',
      summary: 'Navigate to the Chamber of Mines and locate the next clue.',
      status: 'current'
    },
    {
      id: 'node-4',
      name: 'FNB Building',
      summary: 'Locked.',
      status: 'locked'
    },
    {
      id: 'node-5',
      name: 'The Matrix',
      summary: 'Final destination. Locked.',
      status: 'locked'
    }
  ];

  const timelineContainer = document.getElementById('progress-timeline');
  if (!timelineContainer) return;

  // Create the popover element dynamically
  const popover = document.createElement('div');
  popover.className = 'timeline-popover';
  popover.setAttribute('role', 'tooltip');
  popover.innerHTML = `
    <div class="timeline-popover__title"></div>
    <div class="timeline-popover__summary"></div>
  `;
  // Append popover to the wrapper so it can be positioned absolutely relative to it
  document.querySelector('.game-progress-wrapper').appendChild(popover);

  const popoverTitle = popover.querySelector('.timeline-popover__title');
  const popoverSummary = popover.querySelector('.timeline-popover__summary');

  let completedCount = 0;

  // Render nodes
  GAME_TIMELINE.forEach((node, index) => {
    const nodeEl = document.createElement('button');
    nodeEl.className = 'timeline-node';
    nodeEl.setAttribute('aria-label', `${node.name} (${node.status})`);
    
    if (node.status === 'completed') {
      nodeEl.classList.add('is-completed');
      completedCount++;
    } else if (node.status === 'current') {
      nodeEl.classList.add('is-current');
    }

    // Hover interactions for the popover
    const showPopover = () => {
      // Only show popover for completed or current nodes if desired, but user said:
      // "Clicking/hovering over a completed node should give a summary"
      if (node.status === 'completed' || node.status === 'current') {
        popoverTitle.textContent = node.name;
        popoverSummary.textContent = node.summary;
        
        // Position popover
        const nodeRect = nodeEl.getBoundingClientRect();
        const wrapperRect = document.querySelector('.game-progress-wrapper').getBoundingClientRect();
        
        const top = nodeRect.top - wrapperRect.top - 10; // 10px spacing
        const popoverWidth = 240; // width from css
        
        let left = nodeRect.left - wrapperRect.left + (nodeRect.width / 2);
        let transformX = '-50%';
        
        // Prevent clipping on the left
        if (left < (popoverWidth / 2)) {
          left = nodeRect.left - wrapperRect.left;
          transformX = '0%';
        } 
        // Prevent clipping on the right
        else if (left + (popoverWidth / 2) > wrapperRect.width) {
          left = nodeRect.left - wrapperRect.left + nodeRect.width;
          transformX = '-100%';
        }
        
        popover.style.top = `${top}px`;
        popover.style.left = `${left}px`;
        popover.style.transform = `translate(${transformX}, -100%)`; // Position above the node
        popover.classList.add('is-visible');
      }
    };

    const hidePopover = () => {
      popover.classList.remove('is-visible');
    };

    nodeEl.addEventListener('mouseenter', showPopover);
    nodeEl.addEventListener('focus', showPopover);
    nodeEl.addEventListener('mouseleave', hidePopover);
    nodeEl.addEventListener('blur', hidePopover);
    
    // For mobile tapping
    nodeEl.addEventListener('click', (e) => {
      e.preventDefault();
      showPopover();
    });

    timelineContainer.appendChild(nodeEl);
  });

  // Calculate and render the green active edge
  let activeSegments = Math.max(0, completedCount - 1);
  const currentNode = GAME_TIMELINE.find(node => node.status === 'current');
  
  if (currentNode && completedCount > 0) {
    activeSegments += 0.5;
  }
  
  if (activeSegments > 0) {
    const edgePercentage = (activeSegments / (GAME_TIMELINE.length - 1)) * 100;
    const activeEdge = document.createElement('div');
    activeEdge.className = 'timeline-edge';
    activeEdge.style.width = `${edgePercentage}%`;
    activeEdge.style.left = '0'; 
    timelineContainer.appendChild(activeEdge);
  }

  // Populate Current Node Brief
  if (currentNode) {
    const briefTitle = document.getElementById('brief-title');
    const briefSummary = document.getElementById('brief-summary');
    if (briefTitle) briefTitle.textContent = currentNode.name;
    if (briefSummary) briefSummary.textContent = currentNode.summary;

    const playBtn = document.getElementById('btn-play-node');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        playModal.open(currentNode.name, currentNode.summary);
        
        // Example modular control injected for demonstration
        const actionBtn = document.createElement('button');
        actionBtn.className = 'btn btn--primary';
        actionBtn.textContent = 'Scan Barcode';
        playModal.setControls(actionBtn);
      });
    }
  }
});
