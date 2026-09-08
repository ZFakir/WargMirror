/**
 * WARG Platform — Game Page Script
 * Handles: Progress timeline rendering and interactions.
 */

import playModal from './components/PlayModal.js';
import { FlagModal } from './components/FlagModal.js';
import mapModal from './components/MapModal.js';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = window.API_BASE_URL || 'https://wargmirror.onrender.com';
  
  // Initialize the reusable Flag Modal
  const flagModal = new FlagModal();
  const btnFlagGame = document.getElementById('btn-flag-game');
  if (btnFlagGame) {
    btnFlagGame.addEventListener('click', () => {
      // Open the flag modal with a context (e.g., the current game title)
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

  async function loadArgAndInitMap() {
    try {
      const res = await fetch(`${API_BASE}/api/args/${argId}`, { credentials: 'include' });
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
      } catch(e) {}

      mapModal.init({ nodes });
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
    } catch(e) {}
    
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
      const response = await fetch(`${API_BASE}/api/comments/arg/${argId}`, {
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
            <button class="btn-reply" style="background: none; border: none; color: var(--color-brand); font-size: 12px; cursor: pointer; padding: 0; margin-top: 4px;">Reply</button>
          </div>
        `;
        
        if (comment.is_spoiler) {
          const spoilerSpan = div.querySelector('.spoiler-text');
          spoilerSpan.addEventListener('click', () => {
            spoilerSpan.classList.add('is-revealed');
          }, { once: true });
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
