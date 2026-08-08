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
    if (!rightPanel.classList.contains('drawer-open')) hideOverlay();
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
    sidebar.classList.remove('drawer-open');
    rightPanel.classList.remove('drawer-open');
    hideOverlay();
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
const friendItems = document.querySelectorAll('.friend-item');

friendsSearchInput?.addEventListener('input', () => {
  const query = friendsSearchInput.value.toLowerCase().trim();
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

/* ── Initialize Data ── */
if (typeof GameCard !== 'undefined' && typeof WARG_GAMES !== 'undefined') {
  GameCard.renderRow('row-recent', WARG_GAMES.recent);
  GameCard.renderRow('row-new', WARG_GAMES.new);
  GameCard.renderRow('row-creators', WARG_GAMES.fromCreators);
}

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
