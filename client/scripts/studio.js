/**
 * WARG Platform — Creator Studio Script
 * Fetches the current user's ARG library and splits into published/unpublished rows.
 * Requires authentication — shows a prompt for guests.
 */

import { PublishModal } from './components/PublishModal.js';

document.addEventListener('DOMContentLoaded', async () => {
  const publishModal = new PublishModal();

  if (typeof GameCard === 'undefined' || typeof api === 'undefined') return;

  // ── Check auth ──
  const currentUser = await api.getCurrentUser();

  if (!currentUser) {
    // Guest: show a login prompt in both rows
    const loginMsg =
      '<p style="color:var(--color-text-muted);font-size:var(--font-size-caption);padding:var(--space-4) 0">' +
      '<a href="login.html" style="color:var(--color-accent)">Log in</a> to see your created WARGs.</p>';
    const publishedRow = document.getElementById('row-published');
    const unpublishedRow = document.getElementById('row-unpublished');
    if (publishedRow) publishedRow.innerHTML = loginMsg;
    if (unpublishedRow) unpublishedRow.innerHTML = loginMsg;
    return;
  }

  // ── Fetch creator's library ──
  let library = [];
  try {
    library = await api.getUserLibrary(currentUser.user_id);
  } catch (err) {
    console.error('[Studio] Failed to load library:', err);
    const errMsg = '<p style="color:var(--color-error);padding:var(--space-4) 0">Failed to load your WARGs.</p>';
    const publishedRow = document.getElementById('row-published');
    const unpublishedRow = document.getElementById('row-unpublished');
    if (publishedRow) publishedRow.innerHTML = errMsg;
    if (unpublishedRow) unpublishedRow.innerHTML = errMsg;
    return;
  }

  // Split by status (raw field preserved in _raw)
  const published   = library.filter(a => a._raw.status === 'published');
  const unpublished = library.filter(a => a._raw.status !== 'published');

  // ── Render rows ──
  if (published.length === 0) {
    const el = document.getElementById('row-published');
    if (el) el.innerHTML =
      '<p style="color:var(--color-text-muted);font-size:var(--font-size-caption);padding:var(--space-4) 0">No published WARGs yet.</p>';
  } else {
    GameCard.renderRow('row-published', published, { hideProgress: true, showUnpublish: true });
  }

  if (unpublished.length === 0) {
    const el = document.getElementById('row-unpublished');
    if (el) el.innerHTML =
      '<p style="color:var(--color-text-muted);font-size:var(--font-size-caption);padding:var(--space-4) 0">No drafts yet. Start building!</p>';
  } else {
    GameCard.renderRow('row-unpublished', unpublished, { hideProgress: true, showPublish: true });
  }

  // ── Hero card: navigate to builder ──
  const heroCard = document.querySelector('.studio-hero');
  if (heroCard) {
    heroCard.addEventListener('click', () => {
      window.location.href = 'edit_warg.html';
    });
  }

  // ── Listen for publish/unpublish events from GameCards ──
  document.addEventListener('warg:publish', (e) => {
    publishModal.open(e.detail.gameTitle, 'publish');
  });

  document.addEventListener('warg:unpublish', (e) => {
    publishModal.open(e.detail.gameTitle, 'unpublish');
  });
});

