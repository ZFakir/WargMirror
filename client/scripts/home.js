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
  item.addEventListener('click', e => {
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

friendsSearchInput?.addEventListener('input', () => {
  const query = friendsSearchInput.value.toLowerCase().trim();
  const friendItems = document.querySelectorAll('.friend-item');
  friendItems.forEach(item => {
    const name = item.querySelector('.friend-item__name')?.textContent.toLowerCase() ?? '';
    item.closest('li').style.display = (!query || name.includes(query)) ? '' : 'none';
  });
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

/**
 * Render a skeleton loading state for a card row.
 */
function showRowSkeleton(rowId, count) {
  count = count || 5;
  var container = document.getElementById(rowId);
  if (!container) return;
  var skeletons = '';
  for (var i = 0; i < count; i++) {
    skeletons += '<div class="game-card game-card--skeleton" aria-hidden="true">' +
      '<div class="gc-cover" style="background:var(--color-surface-2)"></div>' +
      '<div class="gc-body">' +
        '<div class="skeleton-line skeleton-line--title"></div>' +
        '<div class="skeleton-line skeleton-line--caption"></div>' +
        '<div class="skeleton-line skeleton-line--caption" style="width:60%"></div>' +
      '</div>' +
    '</div>';
  }
  container.innerHTML = skeletons;
}

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
  showRowSkeleton('row-recent');
  showRowSkeleton('row-new');
  showRowSkeleton('row-creators');

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
    } catch (_) { /* profile stats are non-critical */ }

    // Fetch and render friends
    try {
      var friends = await api.getFriends(currentUser.user_id);
      renderFriends(friends);
    } catch (err) {
      console.error('Failed to fetch friends', err);
    }

    // Fetch active sessions for "Recently Played"
    var sessionArgIds = new Set();
    try {
      var sessions = await api.getActiveSessions(currentUser.user_id);
      sessions.forEach(function (s) {
        if (s.Arg && s.Arg.arg_id) sessionArgIds.add(String(s.Arg.arg_id));
      });
    } catch (_) { /* fallback handled below */ }

    // Recently Played = ARGs with an active session, fall back to newest
    var recentArgs = sessionArgIds.size > 0
      ? args.filter(function (a) { return sessionArgIds.has(a.id); })
      : args.slice().sort(function (a, b) {
          return new Date(b._raw.updated_at) - new Date(a._raw.updated_at);
        }).slice(0, 10);

    if (recentArgs.length === 0) {
      showRowEmpty('row-recent', 'No games played yet.');
    } else {
      GameCard.renderRow('row-recent', recentArgs);
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

    // Guest recently played = newest ARGs
    var newestArgs = args.slice().sort(function (a, b) {
      return new Date(b._raw.created_at) - new Date(a._raw.created_at);
    }).slice(0, 10);

    if (newestArgs.length === 0) {
      showRowEmpty('row-recent', 'No games available yet.');
    } else {
      GameCard.renderRow('row-recent', newestArgs);
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
        <button class="friend-item__action" aria-label="Invite ${friend.username} to a game">Invite</button>
      </div>
    `;

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

/* ── Invite link: clipboard ── */
const inviteBtn = document.getElementById('btn-invite-friends');
inviteBtn?.addEventListener('click', async () => {
  const link = `${location.origin}/invite?ref=player`;
  try {
    await navigator.clipboard.writeText(link);
    const orig = inviteBtn.textContent;
    inviteBtn.textContent = 'Copied!';
    setTimeout(() => { inviteBtn.textContent = orig; }, 2000);
  } catch {
    const orig = inviteBtn.textContent;
    inviteBtn.textContent = 'Copy failed';
    setTimeout(() => { inviteBtn.textContent = orig; }, 2000);
  }
});
