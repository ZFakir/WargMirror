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
  // Assume ARG 1 for now, or get it from URL parameters if available
  const urlParams = new URLSearchParams(window.location.search);
  const argId = urlParams.get('id') || 1; 

  async function loadArgAndInitMap() {
    try {
      const res = await fetch(`http://localhost:3000/api/args/${argId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load ARG');
      const argData = await res.json();
      
      const nodes = [];
      if (argData.Waypoints) {
        argData.Waypoints.forEach((wp, index) => {
          nodes.push({
            id: wp.waypoint_id.toString(),
            name: wp.title || 'Waypoint',
            lat: wp.location.coordinates[1],
            lng: wp.location.coordinates[0],
            desc: wp.description || '',
            type: 'solo',
            status: index === 0 ? 'current' : 'locked', // First waypoint current, rest locked
            progress: 0,
            progLabel: 'Not started'
          });
        });
      }
      
      // Update page title
      document.title = argData.title ? `WARG – ${argData.title}` : 'WARG – Discover Games';

      mapModal.init({ nodes });
    } catch (err) {
      console.error('Failed to load ARG data for map:', err);
      mapModal.init(); // Fallback to hardcoded nodes
    }
  }

  loadArgAndInitMap();

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

  // Comments System Logic
  const commentsList = document.getElementById('comments-list');
  const commentInput = document.getElementById('comment-input');
  const btnPostComment = document.getElementById('btn-post-comment');
  const checkIsSpoiler = document.getElementById('comment-is-spoiler');
  


  async function loadComments() {
    try {
      const response = await fetch(`http://localhost:3000/api/comments/arg/${argId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load comments');
      const comments = await response.json();
      
      commentsList.innerHTML = '';
      if (comments.length === 0) {
        commentsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">No comments yet. Be the first to share your thoughts!</div>';
        return;
      }

      // Organize comments by parent
      const commentMap = new Map();
      const topLevelComments = [];
      
      comments.forEach(comment => {
        comment.replies = [];
        commentMap.set(comment.comment_id, comment);
        if (comment.parent_id === null) {
          topLevelComments.push(comment);
        }
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
        if (comment.is_spoiler) {
          bodyHtml = `<span class="spoiler-text" title="Click to reveal spoiler">${comment.body}</span>`;
        }

        const div = document.createElement('div');
        div.className = `comment-item ${isReply ? 'is-reply' : ''}`;
        div.dataset.commentId = comment.comment_id;
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
            ${!isReply ? `<button class="btn-reply" style="background: none; border: none; color: var(--color-brand); font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px;">Reply</button>` : ''}
          </div>
        `;
        
        if (comment.is_spoiler) {
          const spoilerSpan = div.querySelector('.spoiler-text');
          spoilerSpan.addEventListener('click', () => {
            spoilerSpan.classList.add('is-revealed');
          }, { once: true });
        }

        if (!isReply) {
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
              postComment(replyInput.value, comment.comment_id, false);
            });
          });
        }

        return div;
      }

      topLevelComments.forEach(comment => {
        commentsList.appendChild(renderCommentNode(comment, false));
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.forEach(reply => {
            commentsList.appendChild(renderCommentNode(reply, true));
          });
        }
      });

    } catch (error) {
      console.error(error);
      commentsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--color-text-muted);">Could not load comments.</div>';
    }
  }

  async function postComment(body, parentId = null, isSpoiler = false) {
    if (!body.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:3000/api/comments/arg/${argId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body, parent_id: parentId, is_spoiler: isSpoiler })
      });

      if (!response.ok) {
        if (response.status === 401) {
          alert("You must be logged in to post a comment.");
        } else {
          alert("Failed to post comment");
        }
        return;
      }

      commentInput.value = '';
      if (checkIsSpoiler) checkIsSpoiler.checked = false;
      loadComments();
    } catch (error) {
      console.error(error);
      alert("Error posting comment");
    }
  }

  if (btnPostComment) {
    btnPostComment.addEventListener('click', () => {
      postComment(commentInput.value, null, checkIsSpoiler ? checkIsSpoiler.checked : false);
    });
  }

  loadComments();
});
