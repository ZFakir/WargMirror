/**
 * WARG Platform — User Profile Script
 * Populates the profile page with live data from the API.
 * Guests see the page with placeholder content and a login prompt.
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof api === 'undefined') return;

  const currentUser = await api.getCurrentUser();

  if (!currentUser) {
    // ── Guest state ──
    const profileName = document.getElementById('profile-name');
    if (profileName) profileName.textContent = 'Guest';

    const profileTitle = document.getElementById('profile-title');
    if (profileTitle) profileTitle.textContent = 'Not logged in';

    const statsContainer = document.getElementById('profile-stats-grid');
    if (statsContainer) {
      statsContainer.innerHTML =
        '<div style="grid-column:1/-1;text-align:center;padding:var(--space-6) 0;color:var(--color-text-muted)">' +
        '<a href="login.html" style="color:var(--color-accent);font-weight:600">Log in with Google</a>' +
        ' to view your stats and profile.' +
        '</div>';
    }
    return;
  }

  // ── Update avatar ──
  const avatarImg = document.getElementById('profile-avatar');
  if (avatarImg) {
    avatarImg.src = 'https://api.dicebear.com/9.x/identicon/svg?seed=' +
      encodeURIComponent(currentUser.username) + '&backgroundColor=1a1816';
    avatarImg.alt = currentUser.username + ' avatar';
  }

  // ── Update topbar avatar ──
  const topbarAvatar = document.querySelector('#btn-profile img');
  if (topbarAvatar) {
    topbarAvatar.src = 'https://api.dicebear.com/9.x/identicon/svg?seed=' +
      encodeURIComponent(currentUser.username) + '&backgroundColor=1a1816';
    topbarAvatar.alt = currentUser.username + ' avatar';
  }

  // ── Fetch full profile for stats ──
  let profile = null;
  try {
    profile = await api.getUserProfile(currentUser.user_id);
  } catch (err) {
    console.error('[Profile] Failed to fetch profile:', err);
  }

  // ── Name & title ──
  const profileName = document.getElementById('profile-name');
  if (profileName) profileName.textContent = currentUser.username;

  const profileTitle = document.getElementById('profile-title');
  if (profileTitle) {
    const role = currentUser.role || 'player';
    profileTitle.textContent = role.charAt(0).toUpperCase() + role.slice(1);
  }

  if (!profile) return;

  // ── Stats ──
  const statPoints = document.getElementById('stat-total-points');
  if (statPoints) statPoints.textContent = (profile.total_points || 0).toLocaleString();

  const statDistance = document.getElementById('stat-distance-walked');
  if (statDistance) {
    const km = ((profile.distance_walked_m || 0) / 1000).toFixed(1);
    statDistance.textContent = km + ' km';
  }
});
