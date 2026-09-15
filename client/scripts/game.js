/**
 * WARG Platform — Game Page Script
 * Handles: Progress timeline rendering, game engine integration, and interactions.
 */

import playModal from './components/PlayModal.js';
import { FlagModal } from './components/FlagModal.js';
import mapModal from './components/MapModal.js';
import { getMinigameHandler } from './components/minigame-handlers.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://wargmirror.onrender.com';

  // Initialize the reusable Flag Modal
  const flagModal = new FlagModal();
  const btnFlagGame = document.getElementById('btn-flag-game');
  if (btnFlagGame) {
    btnFlagGame.addEventListener('click', () => {
      flagModal.open('Issue with this WARG');
    });
  }
  // Get the ARG ID from the URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const argId = urlParams.get('id');

  if (!argId) {
    alert('No WARG ID provided. Redirecting to catalogue.');
    window.location.href = 'catalogue.html';
    return;
  }

  let gameState = null;

  async function loadGameStateAndInitMap() {
    try {
      // Start or resume session
      const startRes = await fetch(`${API_BASE}/api/game/${argId}/start`, { method: 'POST', credentials: 'include' });
      if (!startRes.ok) {
        if (startRes.status === 401) {
          // If not logged in, we might just load the arg info and show locked nodes
          // But for now, require login
          alert("You must be logged in to play.");
          window.location.href = 'login.html';
          return;
        }
        throw new Error('Failed to start session');
      }

      // Get full state
      const stateRes = await fetch(`${API_BASE}/api/game/${argId}/state`, { credentials: 'include' });
      if (!stateRes.ok) throw new Error('Failed to load game state');

      gameState = await stateRes.json();

      const nodes = [];
      if (gameState.waypoints) {
        gameState.waypoints.forEach(wp => {
          // Find progress for this waypoint
          const prog = gameState.progress.find(p => p.waypoint_id === wp.waypoint_id);
          const status = prog ? prog.status : 'locked';

          let progLabel = 'Not started';
          let progressPercent = 0;
          if (status === 'unlocked') { progLabel = 'Available'; progressPercent = 10; }
          if (status === 'completed') { progLabel = 'Completed'; progressPercent = 100; }

          nodes.push({
            id: wp.waypoint_id.toString(),
            name: wp.title || 'Waypoint',
            lat: wp.location.coordinates[1],
            lng: wp.location.coordinates[0],
            desc: wp.description || '',
            type: 'solo',
            status: status,
            progress: progressPercent,
            progLabel: progLabel
          });
        });
      }

      // Wait for an ARG fetch just to get title
      let argData = {};
      const argRes = await fetch(`${API_BASE}/api/args/${argId}`, { credentials: 'include' });
      if (argRes.ok) {
        argData = await argRes.json();
        document.title = argData.title ? `WARG – ${argData.title}` : 'WARG – Discover Games';
      }

      const btnLike = document.getElementById('btn-like-game');
      const btnDislike = document.getElementById('btn-dislike-game');
      if (btnLike) btnLike.querySelector('span').textContent = `(${argData.like_count || 0})`;
      if (btnDislike) btnDislike.querySelector('span').textContent = `(${argData.dislike_count || 0})`;

      try {
        const localVotes = JSON.parse(localStorage.getItem('warg_votes') || '{}');
        const userVote = argData.user_vote || localVotes[argId] || null;
        if (userVote === 'like' && btnLike) {
            btnLike.classList.add('is-active');
        } else if (userVote === 'dislike' && btnDislike) {
            btnDislike.classList.add('is-active');
        }
      } catch { /* ignore */ }

      mapModal.init({ nodes, edges: (gameState.edges || []).map(e => ({
        id: (e.edge_id || e.id || '').toString(),
        from: (e.from_waypoint_id || e.from).toString(),
        to: (e.to_waypoint_id || e.to).toString()
      })) });

      // Start watching player location
      if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
          const { latitude, longitude, accuracy } = position.coords;
          window.lastPlayerLocation = { latitude, longitude, accuracy };
          mapModal.updatePlayerLocation(latitude, longitude, accuracy);
        }, (error) => {
          console.warn("Player location not available:", error);
        }, { enableHighAccuracy: true, maximumAge: 10000 });
      }
    } catch (err) {
      console.error('Failed to load ARG data for map:', err);
      mapModal.init(); // Fallback to hardcoded nodes
    }
  }

  const btnLike = document.getElementById('btn-like-game');
  const btnDislike = document.getElementById('btn-dislike-game');

  async function handleVote(action) {
    const activeBtn = action === 'like' ? btnLike : btnDislike;
    
    // Optimistic UI updates
    const parseCount = span => span ? parseInt(span.textContent.replace(/[^0-9-]/g, ''), 10) || 0 : 0;
    
    let currentLikes = parseCount(btnLike ? btnLike.querySelector('span') : null);
    let currentDislikes = parseCount(btnDislike ? btnDislike.querySelector('span') : null);
    
    const isPressed = activeBtn && activeBtn.classList.contains('is-active');
    
    if (activeBtn) activeBtn.classList.toggle('is-active', !isPressed);
    
    if (action === 'like') {
      currentLikes += isPressed ? -1 : 1;
      if (!isPressed && btnDislike && btnDislike.classList.contains('is-active')) {
        btnDislike.classList.remove('is-active');
        currentDislikes--;
      }
    } else {
      currentDislikes += isPressed ? -1 : 1;
      if (!isPressed && btnLike && btnLike.classList.contains('is-active')) {
        btnLike.classList.remove('is-active');
        currentLikes--;
      }
    }
    
    if (btnLike) btnLike.querySelector('span').textContent = `(${currentLikes})`;
    if (btnDislike) btnDislike.querySelector('span').textContent = `(${currentDislikes})`;
    
    try {
      const localVotes = JSON.parse(localStorage.getItem('warg_votes') || '{}');
      let newVote = null;
      if (btnLike && btnLike.classList.contains('is-active')) newVote = 'like';
      else if (btnDislike && btnDislike.classList.contains('is-active')) newVote = 'dislike';
      
      if (newVote) localVotes[argId] = newVote;
      else delete localVotes[argId];
      localStorage.setItem('warg_votes', JSON.stringify(localVotes));
    } catch { /* ignore */ }
    
    try {
      const res = await fetch(`${API_BASE}/api/args/${argId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: action, user_id: 1 }),
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (btnLike) btnLike.querySelector('span').textContent = `(${data.like_count})`;
          if (btnDislike) btnDislike.querySelector('span').textContent = `(${data.dislike_count})`;
          
          if (action === 'like') {
            if (btnLike) btnLike.classList.toggle('is-active', data.action === 'voted');
            if (btnDislike) btnDislike.classList.remove('is-active');
          } else {
            if (btnDislike) btnDislike.classList.toggle('is-active', data.action === 'voted');
            if (btnLike) btnLike.classList.remove('is-active');
          }
        }
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  }

  if (btnLike) btnLike.addEventListener('click', () => handleVote('like'));
  if (btnDislike) btnDislike.addEventListener('click', () => handleVote('dislike'));



  loadGameStateAndInitMap();

  // Listen for the 'Play' event from the Map Modal
  document.addEventListener('warg:play-node', async (e) => {
    const node = e.detail;

    if (node.status === 'locked') {
      alert("This waypoint is locked. Complete earlier waypoints to unlock it.");
      return;
    }

    if (node.status === 'completed') {
      alert("You have already completed this waypoint.");
      return;
    }

    // Open play modal immediately to show loading state
    playModal.open(node.name, "Checking your location...");
    playModal.clearControls();

    const loadingState = document.createElement('div');
    loadingState.style.textAlign = 'center';
    loadingState.style.padding = '2rem';
    loadingState.style.color = 'var(--color-text-muted)';
    loadingState.innerHTML = '<p>Verifying geofence...</p>';
    playModal.controlsContainer.appendChild(loadingState);

    // Try to get geolocation
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      playModal.close();
      return;
    }

    const processLocation = async (latitude, longitude, accuracy) => {
      try {
        const arriveRes = await fetch(`${API_BASE}/api/game/${argId}/waypoint/${node.id}/arrive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ lat: latitude, lng: longitude, accuracy_m: accuracy })
        });

        if (!arriveRes.ok) throw new Error('Arrive check failed');
        const arriveData = await arriveRes.json();

        if (!arriveData.within_radius) {
          const override = confirm(`You are outside of the geofence (Distance: ${Math.round(arriveData.distance)}m, Radius: ${arriveData.radius}m).\n\nProceed anyway (Dev Override)?`);
          if (!override) {
            playModal.close();
            return;
          }
        }

        // Restore actual description
        playModal.open(node.name, node.desc);

        // Find minigame config
        const wpData = gameState.waypoints.find(w => w.waypoint_id.toString() === node.id);
        const minigames = wpData.Minigames && wpData.Minigames.length > 0 ? wpData.Minigames : [{ game_type: 'gps_proximity' }];

        playModal.clearControls();

        const renderMinigame = (index) => {
          if (index >= minigames.length) {
            mapModal.updateNodeStatus(node.id, 'completed');
            playModal.close();
            return;
          }

          playModal.clearControls();

          const minigame = minigames[index];
          const handler = getMinigameHandler(minigame.game_type);

          const gameWrapper = document.createElement('div');
          gameWrapper.className = 'minigame-wrapper';
          gameWrapper.style.marginBottom = '20px';

          if (minigames.length > 1) {
            const gameTitle = document.createElement('h4');
            gameTitle.style.marginBottom = '10px';
            gameTitle.style.color = 'var(--color-brand)';
            gameTitle.textContent = `Task ${index + 1} of ${minigames.length}: ${minigame.game_type.replace('_', ' ').toUpperCase()}`;
            gameWrapper.appendChild(gameTitle);
          }

          playModal.controlsContainer.appendChild(gameWrapper);

          handler.render(gameWrapper, minigame.config_json || {}, async (submission) => {
            // Show loading spinner
            const originalContent = gameWrapper.innerHTML;
            gameWrapper.innerHTML = `
              <div style="text-align: center; padding: 2rem;">
                <div class="spinner" style="margin: 0 auto 1rem; width: 40px; height: 40px; border: 4px solid var(--color-bg-elevated); border-top: 4px solid var(--color-brand); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p>Verifying...</p>
              </div>
            `;

            // On Submit
            try {
              const submitRes = await fetch(`${API_BASE}/api/game/${argId}/waypoint/${node.id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  game_id: minigame.game_id,
                  game_type: minigame.game_type,
                  submission
                })
              });
              if (!submitRes.ok) throw new Error('Submission failed');
              const result = await submitRes.json();

              const isLastGame = index === minigames.length - 1;
              playModal.showFeedback(result.outcome, isLastGame);

              if (result.outcome === 'pass' || result.outcome === 'fail') {
                if (result.unlockedNodes) {
                  result.unlockedNodes.forEach(unlockedId => {
                    mapModal.updateNodeStatus(unlockedId.toString(), 'unlocked');
                  });
                }

                if (!isLastGame) {
                  setTimeout(() => {
                    renderMinigame(index + 1);
                  }, 2000);
                } else {
                  mapModal.updateNodeStatus(node.id, 'completed');
                }
              }
            } catch (err) {
              console.error(err);
              alert("Error submitting minigame.");
              gameWrapper.innerHTML = originalContent;
              renderMinigame(index);
            }
          });
        };

        renderMinigame(0);

      } catch (err) {
        console.error(err);
        alert("Error during geofence check.");
        playModal.close();
      }
    };

    if (window.lastPlayerLocation) {
      processLocation(window.lastPlayerLocation.latitude, window.lastPlayerLocation.longitude, window.lastPlayerLocation.accuracy);
    } else {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude, accuracy } = position.coords;
        window.lastPlayerLocation = { latitude, longitude, accuracy };
        processLocation(latitude, longitude, accuracy);
      }, (error) => {
        alert("Unable to retrieve your location for geofencing.");
        console.error(error);
        playModal.close();
      }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    }
  });

  // Comments System Logic (Copied from original)
  const commentsList = document.getElementById('comments-list');
  const commentInput = document.getElementById('comment-input');
  const btnPostComment = document.getElementById('btn-post-comment');
  const checkIsSpoiler = document.getElementById('comment-is-spoiler');

  async function loadComments() {
    try {
      const response = await fetch(`${API_BASE}/api/comments/arg/${argId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load comments');
      const comments = await response.json();

      commentsList.innerHTML = '';
      if (comments.length === 0) {
        commentsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">No comments yet. Be the first to share your thoughts!</div>';
        return;
      }

      const commentMap = new Map();
      const topLevelComments = [];

      comments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.comment_id, comment);
        if (comment.parent_id === null) topLevelComments.push(comment);
      });

      comments.forEach(comment => {
        if (comment.parent_id !== null && commentMap.has(comment.parent_id)) {
          commentMap.get(comment.parent_id).replies.push(comment);
        }
      });

      function renderCommentNode(comment, isReply = false) {
        const timeString = new Date(comment.created_at).toLocaleString();
        const avatarSeed = comment.User ? comment.User.username : 'default';
        const username = comment.User ? comment.User.username : 'Unknown User';

        let bodyHtml = comment.body;
        if (comment.is_spoiler) bodyHtml = `<span class="spoiler-text" title="Click to reveal spoiler">${comment.body}</span>`;

        const div = document.createElement('div');
        div.className = `comment-item ${isReply ? 'is-reply' : ''}`;
        div.innerHTML = `
          <div class="comment-item__avatar">
            <img src="https://api.dicebear.com/9.x/identicon/svg?seed=${avatarSeed}&backgroundColor=1a1816" alt="${username}" />
          </div>
          <div class="comment-item__content">
            <div class="comment-item__header">
              <strong>${username}</strong>
              <span class="comment-item__time">${timeString}</span>
            </div>
            <p>${bodyHtml}</p>
            <button class="btn-reply" style="background: none; border: none; color: var(--color-brand); font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px;">Reply</button>
          </div>
        `;

        if (comment.is_spoiler) {
          const spoilerSpan = div.querySelector('.spoiler-text');
          spoilerSpan.addEventListener('click', () => spoilerSpan.classList.add('is-revealed'), { once: true });
        }

        const replyBtn = div.querySelector('.btn-reply');
        replyBtn.addEventListener('click', () => {
          const currentReply = document.querySelector('.reply-input-wrapper');
          if (currentReply) currentReply.remove();

          const replyWrapper = document.createElement('div');
          replyWrapper.className = 'compose-input-wrapper reply-input-wrapper';
          replyWrapper.style.marginTop = '8px';
          replyWrapper.innerHTML = `
            <input type="text" class="input-field reply-input" placeholder="Write a reply..." />
            <button class="btn btn--primary btn--sm btn-post-reply">Post</button>
          `;
          div.querySelector('.comment-item__content').appendChild(replyWrapper);

          const btnPostReply = replyWrapper.querySelector('.btn-post-reply');
          const replyInput = replyWrapper.querySelector('.reply-input');
          replyInput.focus();

          btnPostReply.addEventListener('click', () => {
            postComment(replyInput.value, comment.comment_id, false, btnPostReply);
          });
        });

        return div;
      }

      function appendCommentTree(comment, parentElement, isReply = false) {
        const node = renderCommentNode(comment, isReply);
        parentElement.appendChild(node);
        
        if (comment.replies && comment.replies.length > 0) {
          const repliesContainer = document.createElement('div');
          repliesContainer.className = 'comment-replies';
          node.querySelector('.comment-item__content').appendChild(repliesContainer);
          
          comment.replies.forEach(reply => {
            appendCommentTree(reply, repliesContainer, true);
          });
        }
      }

      topLevelComments.forEach(comment => {
        appendCommentTree(comment, commentsList, false);
      });
    } catch (error) {
      console.error(error);
      commentsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">Could not load comments.</div>';
    }
  }

  async function postComment(body, parentId = null, isSpoiler = false, btnElement = null) {
    if (!body.trim()) return;
    
    let originalBtnHTML = '';
    if (btnElement) {
      originalBtnHTML = btnElement.innerHTML;
      btnElement.disabled = true;
      btnElement.innerHTML = '<div style="display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;vertical-align:middle;"></div>';
    }
    
    try {
      const response = await fetch(`${API_BASE}/api/comments/arg/${argId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body, parent_id: parentId, is_spoiler: isSpoiler })
      });

      if (!response.ok) {
        if (btnElement) {
          btnElement.disabled = false;
          btnElement.innerHTML = originalBtnHTML;
        }
        if (response.status === 401) {
          alert("You must be logged in to post a comment.");
        } else {
          alert("Failed to post comment");
        }
        return;
      }

      commentInput.value = '';
      if (checkIsSpoiler) checkIsSpoiler.checked = false;
      
      // Wait for comments to reload before removing the spinner
      await loadComments();
      
      if (btnElement && document.body.contains(btnElement)) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalBtnHTML;
      }
    } catch (error) {
      console.error(error);
      if (btnElement && document.body.contains(btnElement)) {
        btnElement.disabled = false;
        btnElement.innerHTML = originalBtnHTML;
      }
      alert("Error posting comment");
    }
  }

  if (btnPostComment) {
    btnPostComment.addEventListener('click', () => {
      postComment(commentInput.value, null, checkIsSpoiler ? checkIsSpoiler.checked : false, btnPostComment);
    });
  }

  loadComments();
});
