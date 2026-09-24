/**
 * WARG Platform — Home Page Script
 * Handles: sidebar/right-panel toggle (desktop collapse + mobile drawer),
 * overlay backdrop, search interactions, friends filtering, notifications.
 */

/* ── Elements ── */
const appShell        = document.getElementById('app-shell');
const sidebar         = document.getElementById('sidebar');
const rightPanel      = document.getElementById('right-panel');
const overlay         = document.getElementById('drawer-overlay');

const btnSidebarToggle    = document.getElementById('btn-sidebar-toggle');
const btnSidebarClose     = document.getElementById('btn-sidebar-close');
const btnRightPanelToggle = document.getElementById('btn-right-panel-toggle');
const btnRightPanelClose  = document.getElementById('btn-right-panel-close');

/* ── Breakpoint: is this a mobile/tablet viewport? ── */
const isMobile = () => window.matchMedia('(max-width: 1023px)').matches;

/* ── Overlay helpers ── */
function showOverlay() {
  overlay.classList.add('is-visible');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // prevent body scroll while drawer open
}

function hideOverlay() {
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ── Left Sidebar ── */
function openSidebar() {
  if (isMobile()) {
    sidebar.classList.add('drawer-open');
    showOverlay();
    btnSidebarToggle.setAttribute('aria-expanded', 'true');
  } else {
    appShell.classList.remove('sidebar-collapsed');
    btnSidebarToggle.setAttribute('aria-expanded', 'true');
  }
}

function closeSidebar() {
  if (isMobile()) {
    sidebar.classList.remove('drawer-open');
    if (!rightPanel || !rightPanel.classList.contains('drawer-open')) hideOverlay();
    btnSidebarToggle.setAttribute('aria-expanded', 'false');
  } else {
    appShell.classList.add('sidebar-collapsed');
    btnSidebarToggle.setAttribute('aria-expanded', 'false');
  }
}

function toggleSidebar() {
  if (isMobile()) {
    sidebar.classList.contains('drawer-open') ? closeSidebar() : openSidebar();
  } else {
    appShell.classList.contains('sidebar-collapsed') ? openSidebar() : closeSidebar();
  }
}

/* ── Right Panel ── */
function openRightPanel() {
  if (isMobile()) {
    rightPanel.classList.add('drawer-open');
    showOverlay();
    btnRightPanelToggle.setAttribute('aria-expanded', 'true');
  } else {
    appShell.classList.remove('right-collapsed');
    btnRightPanelToggle.setAttribute('aria-expanded', 'true');
  }
}

function closeRightPanel() {
  if (isMobile()) {
    rightPanel.classList.remove('drawer-open');
    if (!sidebar.classList.contains('drawer-open')) hideOverlay();
    btnRightPanelToggle.setAttribute('aria-expanded', 'false');
  } else {
    appShell.classList.add('right-collapsed');
    btnRightPanelToggle.setAttribute('aria-expanded', 'false');
  }
}

function toggleRightPanel() {
  if (isMobile()) {
    rightPanel.classList.contains('drawer-open') ? closeRightPanel() : openRightPanel();
  } else {
    appShell.classList.contains('right-collapsed') ? openRightPanel() : closeRightPanel();
  }
}

/* ── Wire up buttons ── */
btnSidebarToggle?.addEventListener('click', toggleSidebar);
btnSidebarClose?.addEventListener('click', closeSidebar);
btnRightPanelToggle?.addEventListener('click', toggleRightPanel);
btnRightPanelClose?.addEventListener('click', closeRightPanel);

/* Dismiss drawers when tapping overlay */
overlay?.addEventListener('click', () => {
  closeSidebar();
  closeRightPanel();
});

/* Dismiss with Escape key */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSidebar();
    closeRightPanel();
  }
});

/* ── Adapt state on viewport resize ── */
// When going from mobile → desktop, clean up drawer classes
window.addEventListener('resize', () => {
  if (!isMobile()) {
    if (sidebar) sidebar.classList.remove('drawer-open');
    if (rightPanel) rightPanel.classList.remove('drawer-open');
    if (overlay) hideOverlay();
  }
});

/* ── Navigation: active state ── */
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    // Close sidebar drawer after nav on mobile
    if (isMobile()) closeSidebar();

    navItems.forEach(n => {
      n.classList.remove('active');
      n.removeAttribute('aria-current');
    });
    item.classList.add('active');
    item.setAttribute('aria-current', 'page');
  });
});

/* ── Search: focus expansion ── */
const searchInput = document.getElementById('search-input');

searchInput?.addEventListener('focus', () => {
  searchInput.closest('.topbar__search')?.style.setProperty('max-inline-size', '560px');
});
searchInput?.addEventListener('blur', () => {
  searchInput.closest('.topbar__search')?.style.removeProperty('max-inline-size');
});

/* '/' shortcut to focus search */
document.addEventListener('keydown', e => {
  const tag = document.activeElement.tagName.toLowerCase();
  if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
    e.preventDefault();
    searchInput?.focus();
  }
});

/* ── Friends search: live filter ── */
const friendsSearchInput = document.getElementById('friends-search-input');
const friendsDefaultView = document.getElementById('friends-default-view');
const searchResultsContainer = document.getElementById('friend-search-results-container');
const searchResultsList = document.getElementById('friend-search-results-list');

let searchTimeout;
friendsSearchInput?.addEventListener('input', () => {
  const query = friendsSearchInput.value.trim();
  
  clearTimeout(searchTimeout);
  if (!query) {
    friendsDefaultView.style.display = 'block';
    searchResultsContainer.style.display = 'none';
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const users = await api.searchUsers(query);
      renderUserSearchResults(users);
      friendsDefaultView.style.display = 'none';
      searchResultsContainer.style.display = 'block';
    } catch (err) {
      console.error('Search failed', err);
    }
  }, 300);
});

/* ── Notification badge clear ── */
const notifBtn = document.getElementById('btn-notifications');
notifBtn?.addEventListener('click', () => {
  if (notifBtn.dataset.count) {
    notifBtn.removeAttribute('data-count');
    notifBtn.setAttribute('aria-label', 'Notifications');
  }
});

/* ── Initialize Data from API ── */



function showRowEmpty(rowId, message) {
  var container = document.getElementById(rowId);
  if (!container) return;
  container.innerHTML = '<p class="row-empty-msg">' + (message || 'No games found.') + '</p>';
}

async function initHomeData() {
  // If we are not on the home page, exit early to prevent container null errors
  if (!document.getElementById('row-recent')) return;

  if (typeof api === 'undefined') {
    console.error('API not loaded'); return;
  }

  // Show skeletons immediately
  GameCard.renderSkeletons('row-recent', 4);
  GameCard.renderSkeletons('row-new', 4);
  GameCard.renderSkeletons('row-creators', 4);

  // Fetch ARGs (public) and current user (optional) in parallel
  var results = await Promise.allSettled([
    api.getArgs(),
    api.getCurrentUser()
  ]);

  var args = results[0].status === 'fulfilled' ? results[0].value : [];
  var currentUser = results[1].status === 'fulfilled' ? results[1].value : null;

  // ── Update topbar avatar & user-gated UI ──
  if (currentUser) {
    var avatarBtn = document.getElementById('btn-profile');
    if (avatarBtn) {
      var img = avatarBtn.querySelector('img');
      if (img) {
        img.src = 'https://api.dicebear.com/9.x/identicon/svg?seed=' +
          encodeURIComponent(currentUser.username) + '&backgroundColor=1a1816';
        img.alt = currentUser.username + ' avatar';
      }
    }

    // Fetch user profile for stats
    try {
      var profile = await api.getUserProfile(currentUser.user_id);
      var statPoints = document.querySelector('.stat-block__value--green');
      if (statPoints) statPoints.textContent = (profile.total_points || 0).toLocaleString();
      var statDist = document.querySelector('[data-stat="distance"]');
      if (statDist) statDist.textContent = Math.round((profile.distance_walked_m || 0) / 1000) + ' km';
    } catch { /* profile stats are non-critical */ }

    // Fetch and render friends & requests
    try {
      var friends = await api.getFriends(currentUser.user_id);
      renderFriends(friends);
      
      var requests = await api.getFriendRequests(currentUser.user_id);
      renderPendingRequests(requests);
    } catch (err) {
      console.error('Failed to fetch friends/requests', err);
    }

    // Fetch active sessions for "Recently Played"
    var sessionArgIds = new Set();
    try {
      var sessions = await api.getActiveSessions(currentUser.user_id);
      sessions.forEach(function (s) {
        if (s.Arg && s.Arg.arg_id) sessionArgIds.add(String(s.Arg.arg_id));
      });
    } catch { /* fallback handled below */ }

    // Recently Played = ARGs with an active session, no fallback
    var recentArgs = sessionArgIds.size > 0
      ? args.filter(function (a) { return sessionArgIds.has(a.id); })
      : [];

    // Filter out locally dismissed ARGs
    var dismissed = [];
    try { dismissed = JSON.parse(localStorage.getItem('warg_dismissed_recent') || '[]'); } catch { /* ignore */ }
    recentArgs = recentArgs.filter(function (a) { return dismissed.indexOf(a.id) === -1; });

    if (recentArgs.length === 0) {
      showRowEmpty('row-recent', 'No games played yet.');
    } else {
      GameCard.renderRow('row-recent', recentArgs, { showRemove: true });
    }
  } else {
    // Guest: show "My Progress" prompt
    var activityCard = document.querySelector('.activity-card__stats');
    if (activityCard) {
      activityCard.innerHTML =
        '<p style="color:var(--color-text-muted);font-size:var(--font-size-caption);text-align:center;padding:var(--space-3) 0">' +
        '<a href="login.html" style="color:var(--color-accent)">Log in</a> to track your progress and recent games.</p>';
    }

    // Guest: show login prompt for friends list
    var onlineList = document.getElementById('online-friends-list');
    var offlineList = document.getElementById('offline-friends-list');
    if (onlineList) onlineList.innerHTML = '<li style="padding:1rem;color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;">Log in to see friends</li>';
    if (offlineList) offlineList.innerHTML = '';

    // Guest recently played: none
    var newestArgs = [];

    // Filter out locally dismissed ARGs
    var guestDismissed = [];
    try { guestDismissed = JSON.parse(localStorage.getItem('warg_dismissed_recent') || '[]'); } catch { /* ignore */ }
    newestArgs = newestArgs.filter(function (a) { return guestDismissed.indexOf(a.id) === -1; });

    if (newestArgs.length === 0) {
      showRowEmpty('row-recent', 'Log in to track your recent games.');
    } else {
      GameCard.renderRow('row-recent', newestArgs, { showRemove: true });
    }
  }

  // ── New & Trending — sorted by created_at desc ──
  var trendingArgs = args.slice().sort(function (a, b) {
    return new Date(b._raw.created_at) - new Date(a._raw.created_at);
  }).slice(0, 10);
  if (trendingArgs.length === 0) {
    showRowEmpty('row-new', 'No new games yet.');
  } else {
    GameCard.renderRow('row-new', trendingArgs);
  }

  // ── From Creators — sorted by play_count desc ──
  var creatorsArgs = args.slice().sort(function (a, b) {
    return (b._raw.play_count || 0) - (a._raw.play_count || 0);
  }).slice(0, 10);
  if (creatorsArgs.length === 0) {
    showRowEmpty('row-creators', 'No games available yet.');
  } else {
    GameCard.renderRow('row-creators', creatorsArgs);
  }
  // Init horizontal scroll for cards
  initCardScrolls();
}

/* ── Drag-to-scroll for card rows ── */
function initCardScrolls() {
  document.querySelectorAll('.card-row').forEach(row => {
    let isDown = false;
    let startX;
    let scrollLeft;

    row.addEventListener('mousedown', e => {
      isDown = true;
      row.classList.add('is-dragging');
      startX = e.pageX - row.offsetLeft;
      scrollLeft = row.scrollLeft;
    });
    row.addEventListener('mouseleave', () => {
      isDown = false;
      row.classList.remove('is-dragging');
    });
    row.addEventListener('mouseup', () => {
      isDown = false;
      row.classList.remove('is-dragging');
    });
    row.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - row.offsetLeft;
      const walk = (x - startX) * 1.5;
      row.scrollLeft = scrollLeft - walk;
    });
  });
}

function renderFriends(friends) {
  const onlineList = document.getElementById('online-friends-list');
  const offlineList = document.getElementById('offline-friends-list');
  const onlineCount = document.getElementById('online-friends-count');
  
  if (!onlineList || !offlineList) return;

  onlineList.innerHTML = '';
  offlineList.innerHTML = '';

  let onlineFriends = 0;

  friends.forEach(friend => {
    const isOnline = friend.GameSessions && friend.GameSessions.length > 0;
    const session = isOnline ? friend.GameSessions[0] : null;
    const gameTitle = session && session.Arg ? session.Arg.title : 'an unknown game';
    
    const activityText = isOnline ? `Playing: ${gameTitle}` : 'Offline';
    const statusClass = isOnline ? 'status--online' : 'status--offline';
    
    const initials = (friend.username || '??').substring(0, 2).toUpperCase();
    
    let avatarImg;
    if (friend.avatar) {
      // Assuming avatar is returned as base64 or buffer. If buffer, we might need different handling. 
      // Dicebear is used natively as fallback.
      avatarImg = `<div class="friend-item__avatar-img" aria-hidden="true">${initials}</div>`;
    } else {
      avatarImg = `<div class="friend-item__avatar-img" aria-hidden="true">${initials}</div>`;
    }

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="friend-item" role="button" tabindex="0" aria-label="${friend.username} is ${activityText}">
        <div class="friend-item__avatar">
          ${avatarImg}
          <span class="friend-item__status-dot ${statusClass}" aria-label="${isOnline ? 'Online' : 'Offline'}"></span>
        </div>
        <div class="friend-item__info">
          <div class="friend-item__name">${friend.username}</div>
          <div class="friend-item__activity">${activityText}</div>
        </div>
      </div>
    `;

    li.querySelector('.friend-item').addEventListener('click', () => {
      openFriendProfileModal(friend.user_id);
    });

    if (isOnline) {
      onlineList.appendChild(li);
      onlineFriends++;
    } else {
      offlineList.appendChild(li);
    }
  });

  if (onlineCount) onlineCount.textContent = onlineFriends;

  if (onlineFriends === 0) {
    onlineList.innerHTML = '<li style="padding:1rem;color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;">No friends online</li>';
  }
  if (friends.length - onlineFriends === 0) {
    offlineList.innerHTML = '<li style="padding:1rem;color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;">No offline friends</li>';
  }
}

async function renderUserSearchResults(users) {
  if (!searchResultsList) return;
  searchResultsList.innerHTML = '';
  
  if (users.length === 0) {
    searchResultsList.innerHTML = '<li style="padding:1rem;color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;">No users found</li>';
    return;
  }
  
  const currentUser = await api.getCurrentUser();

  users.forEach(user => {
    // Basic prevent self-add
    if (currentUser && user.user_id === currentUser.user_id) return;
    
    const initials = (user.username || '??').substring(0, 2).toUpperCase();
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="friend-item" role="listitem">
        <div class="friend-item__avatar">
          <div class="friend-item__avatar-img" aria-hidden="true">${initials}</div>
        </div>
        <div class="friend-item__info">
          <div class="friend-item__name">${user.username}</div>
        </div>
        <button class="friend-item__action btn-add-friend" data-id="${user.user_id}" aria-label="Add ${user.username}">Add</button>
      </div>
    `;
    
    li.querySelector('.btn-add-friend').addEventListener('click', async (e) => {
      const btn = e.target;
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.textContent = '...';
      try {
        await api.sendFriendRequest(currentUser.user_id, user.user_id);
        btn.textContent = 'Sent';
      } catch (err) {
        console.error('Failed to send friend request:', err);
        btn.disabled = false;
        btn.textContent = originalText;
        showToast('Failed to send request');
      }
    });
    
    searchResultsList.appendChild(li);
  });
}

function renderPendingRequests(requests) {
  const list = document.getElementById('pending-requests-list');
  const title = document.getElementById('pending-requests-title');
  const count = document.getElementById('pending-requests-count');
  
  if (!list || !title) return;
  
  list.innerHTML = '';
  
  if (requests.length === 0) {
    title.style.display = 'none';
    return;
  }
  
  title.style.display = '';
  if (count) count.textContent = requests.length;
  
  requests.forEach(req => {
    const initials = (req.sender?.username || '??').substring(0, 2).toUpperCase();
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="friend-item" role="listitem">
        <div class="friend-item__avatar">
          <div class="friend-item__avatar-img" aria-hidden="true">${initials}</div>
        </div>
        <div class="friend-item__info">
          <div class="friend-item__name">${req.sender?.username || 'Unknown'}</div>
          <div class="friend-item__activity" style="font-size:0.75rem;">Sent you a request</div>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button class="friend-item__action btn-accept" data-id="${req.request_id}">✓</button>
          <button class="friend-item__action btn-decline" data-id="${req.request_id}">✕</button>
        </div>
      </div>
    `;
    
    li.querySelector('.btn-accept').addEventListener('click', async (e) => {
      const btn = e.target;
      const declineBtn = li.querySelector('.btn-decline');
      btn.disabled = true;
      declineBtn.disabled = true;
      btn.textContent = '...';
      try {
        await api.respondToFriendRequest(req.request_id, 'accepted');
        // Refresh everything
        initHomeData();
      } catch (err) {
        console.error('Failed to accept friend request:', err);
        btn.disabled = false;
        declineBtn.disabled = false;
        btn.textContent = '✓';
        showToast('Failed to accept');
      }
    });
    
    li.querySelector('.btn-decline').addEventListener('click', async (e) => {
      const btn = e.target;
      const acceptBtn = li.querySelector('.btn-accept');
      btn.disabled = true;
      acceptBtn.disabled = true;
      btn.textContent = '...';
      try {
        await api.respondToFriendRequest(req.request_id, 'declined');
        initHomeData();
      } catch (err) {
        console.error('Failed to decline friend request:', err);
        btn.disabled = false;
        acceptBtn.disabled = false;
        btn.textContent = '✕';
        showToast('Failed to decline');
      }
    });
    
    list.appendChild(li);
  });
}

// Kick off
document.addEventListener('DOMContentLoaded', initHomeData);

/* ── Friend item keyboard activation ── */
document.querySelectorAll('.friend-item[role="button"]').forEach(item => {
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      item.click();
    }
  });
});

/* ── Handle removing from recent ── */
document.addEventListener('warg:removed-recent', function(e) {
  var argId = e.detail.argId;

  // Persist to localStorage so the card stays hidden across reloads
  try {
    var dismissed = JSON.parse(localStorage.getItem('warg_dismissed_recent') || '[]');
    if (dismissed.indexOf(argId) === -1) {
      dismissed.push(argId);
      localStorage.setItem('warg_dismissed_recent', JSON.stringify(dismissed));
    }
  } catch { /* ignore */ }

  var card = document.querySelector('#row-recent .game-card[data-game-id="' + argId + '"]');
  if (card) {
    card.remove();
    var row = document.getElementById('row-recent');
    if (row && row.children.length === 0) {
      showRowEmpty('row-recent', 'No games played yet.');
    }
  }
});

/* ── Feedback Modal ── */
const feedbackModal = document.getElementById('feedback-modal');
const btnFeedback = document.getElementById('btn-feedback');
const btnCloseFeedback = document.getElementById('btn-close-feedback');
const btnCancelFeedback = document.getElementById('btn-cancel-feedback');
const feedbackForm = document.getElementById('feedback-form');

function openFeedbackModal() {
  if (feedbackModal) {
    feedbackModal.classList.add('is-open');
    feedbackModal.setAttribute('aria-hidden', 'false');
  }
}

function closeFeedbackModal() {
  if (feedbackModal) {
    feedbackModal.classList.remove('is-open');
    feedbackModal.setAttribute('aria-hidden', 'true');
    if (feedbackForm) feedbackForm.reset();
  }
}

btnFeedback?.addEventListener('click', openFeedbackModal);
btnCloseFeedback?.addEventListener('click', closeFeedbackModal);
btnCancelFeedback?.addEventListener('click', closeFeedbackModal);

feedbackModal?.addEventListener('click', e => {
  if (e.target === feedbackModal) closeFeedbackModal();
});

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

feedbackForm?.addEventListener('submit', async e => {
  e.preventDefault();
  
  const submitBtn = feedbackForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const formData = new FormData(feedbackForm);
    const data = Object.fromEntries(formData);
    
    await api.submitFeedback(data);
    
    closeFeedbackModal();
    showToast('Thank you for your feedback!');
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    showToast('Failed to submit feedback. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

/* ── Friend Profile Modal ── */
const friendProfileModal = document.getElementById('friend-profile-modal');
const btnCloseFriendProfile = document.getElementById('btn-close-friend-profile');
const btnRemoveFriend = document.getElementById('btn-remove-friend');

let currentProfileFriendId = null;

async function openFriendProfileModal(friendId) {
  currentProfileFriendId = friendId;
  
  // Reset UI
  document.getElementById('friend-profile-username').textContent = 'Loading...';
  document.getElementById('friend-profile-avatar').textContent = '';
  document.getElementById('friend-profile-points').textContent = '0';
  document.getElementById('friend-profile-distance').textContent = '0 km';
  document.getElementById('friend-profile-badges-count').textContent = '0';
  document.getElementById('friend-profile-level').textContent = 'Level 1';
  btnRemoveFriend.disabled = false;
  btnRemoveFriend.textContent = 'Remove Friend';
  
  if (friendProfileModal) {
    friendProfileModal.classList.add('is-open');
    friendProfileModal.setAttribute('aria-hidden', 'false');
  }

  try {
    const profile = await api.getUserProfile(friendId);
    document.getElementById('friend-profile-username').textContent = profile.username;
    document.getElementById('friend-profile-avatar').textContent = profile.username.substring(0, 2).toUpperCase();
    document.getElementById('friend-profile-points').textContent = (profile.total_points || 0).toLocaleString();
    document.getElementById('friend-profile-distance').textContent = Math.round((profile.distance_walked_m || 0) / 1000) + ' km';
    document.getElementById('friend-profile-badges-count').textContent = (profile.Badges || []).length;
    // Mock level based on points
    const level = Math.max(1, Math.floor((profile.total_points || 0) / 100) + 1);
    document.getElementById('friend-profile-level').textContent = 'Level ' + level;
  } catch (error) {
    console.error('Failed to load profile:', error);
    showToast('Failed to load friend profile');
    closeFriendProfileModal();
  }
}

function closeFriendProfileModal() {
  if (friendProfileModal) {
    friendProfileModal.classList.remove('is-open');
    friendProfileModal.setAttribute('aria-hidden', 'true');
  }
  currentProfileFriendId = null;
}

btnCloseFriendProfile?.addEventListener('click', closeFriendProfileModal);

friendProfileModal?.addEventListener('click', e => {
  if (e.target === friendProfileModal) closeFriendProfileModal();
});

btnRemoveFriend?.addEventListener('click', async () => {
  if (!currentProfileFriendId) return;
  
  const originalText = btnRemoveFriend.textContent;
  btnRemoveFriend.disabled = true;
  btnRemoveFriend.textContent = 'Removing...';
  
  try {
    const currentUser = await api.getCurrentUser();
    await api.removeFriend(currentUser.user_id, currentProfileFriendId);
    showToast('Friend removed');
    closeFriendProfileModal();
    initHomeData(); // Refresh friends list
  } catch (error) {
    console.error('Failed to remove friend:', error);
    showToast('Failed to remove friend');
    btnRemoveFriend.disabled = false;
    btnRemoveFriend.textContent = originalText;
  }
});
