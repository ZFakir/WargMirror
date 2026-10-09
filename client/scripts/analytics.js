/**
 * WARG Platform — Analytics Script
 * Live creator analytics: per-WARG play stats, per-waypoint attempt counts,
 * and flag management. Requires authentication.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ── Auth guard — analytics are meaningless for guests ──
  const user = await api.requireAuthPage();
  if (!user) return;

  // ── Elements ──
  const argTitle = document.getElementById('arg-title');
  const argDesc = document.getElementById('arg-desc');
  const statCurrentPlayers = document.getElementById('stat-current-players');
  const statCompleted = document.getElementById('stat-completed');
  const statAttempts = document.getElementById('stat-attempts');
  const statLikes = document.getElementById('stat-likes');
  const statDislikes = document.getElementById('stat-dislikes');
  const flagsList = document.getElementById('flags-list');
  const flagBadge = document.getElementById('flag-badge');
  const selectorContainer = document.getElementById('analytics-arg-select-container');
  const argSelect = document.getElementById('analytics-arg-select');
  const modalOverlay = document.getElementById('flag-modal-overlay');
  const modalTitle = document.getElementById('flag-modal-title');
  const modalDesc = document.getElementById('flag-modal-desc');
  const modalMeta = document.getElementById('flag-modal-meta');
  const btnCloseModal = document.getElementById('btn-close-flag-modal');
  const btnCancelFlag = document.getElementById('btn-cancel-flag');
  const btnResolveFlag = document.getElementById('btn-resolve-flag');
  const btnViewResolved = document.getElementById('btn-view-resolved');
  const btnEdit = document.getElementById('btn-edit-warg');
  const btnRemove = document.getElementById('btn-remove-warg');

  const ICON_HIGH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
  const ICON_WARN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';

  // ── State ──
  let analyticsArgs = [];
  let selectedArg = null;
  let showResolved = false;
  let activeFlagId = null;

  // ── Fetch the creator's analytics ──
  try {
    const res = await fetch(`${window.API_BASE_URL}/api/args/analytics/mine`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch analytics');
    const data = await res.json();
    analyticsArgs = data.args || [];
  } catch (err) {
    console.error('[Analytics] Failed to load:', err);
    if (argTitle) argTitle.textContent = 'Analytics unavailable';
    if (argDesc) argDesc.textContent = 'Could not load your WARG analytics. Please try again later.';
    hideSections();
    return;
  }

  // ── Empty state ──
  if (analyticsArgs.length === 0) {
    if (argTitle) argTitle.textContent = 'No WARGs yet';
    if (argDesc) argDesc.textContent = 'Create your first WARG in the Creator Studio to see analytics here.';
    hideSections();
    if (argDesc) {
      argDesc.insertAdjacentHTML('afterend',
        '<p style="margin-top:var(--space-3);"><a href="studio.html" style="color:var(--color-accent);font-weight:600;">Go to Creator Studio</a></p>');
    }
    return;
  }

  function hideSections() {
    const dashboard = document.querySelector('.analytics-dashboard');
    const actions = document.querySelector('.analytics-actions');
    if (dashboard) dashboard.style.display = 'none';
    if (actions) actions.style.display = 'none';
  }

  // ── ARG selector (shown when the creator has more than one WARG) ──
  const urlArgId = new URLSearchParams(window.location.search).get('arg');
  if (argSelect && selectorContainer) {
    analyticsArgs.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.arg_id;
      opt.textContent = a.title || 'Untitled WARG';
      argSelect.appendChild(opt);
    });
    if (analyticsArgs.length > 1) selectorContainer.style.display = 'block';
    argSelect.addEventListener('change', () => selectArg(argSelect.value));
  }

  function selectArg(argId) {
    selectedArg = analyticsArgs.find(a => String(a.arg_id) === String(argId)) || analyticsArgs[0];
    showResolved = false;
    if (btnViewResolved) btnViewResolved.textContent = 'View Resolved Flags';
    renderSelectedArg();
  }

  // ── Stats ──
  function renderSelectedArg() {
    if (!selectedArg) return;
    if (argTitle) argTitle.textContent = selectedArg.title || 'Untitled WARG';
    if (argDesc) argDesc.textContent = selectedArg.description || 'No description yet.';
    if (statCurrentPlayers) statCurrentPlayers.textContent = selectedArg.active_sessions || 0;
    if (statCompleted) statCompleted.textContent = (selectedArg.completed_sessions || 0).toLocaleString();
    const attempts = (selectedArg.waypoints || []).reduce((sum, wp) => sum + (wp.passes || 0) + (wp.fails || 0), 0);
    if (statAttempts) statAttempts.textContent = attempts.toLocaleString();
    if (statLikes) statLikes.textContent = `${(selectedArg.likes || 0).toLocaleString()} Likes`;
    if (statDislikes) statDislikes.textContent = `${(selectedArg.dislikes || 0).toLocaleString()} Dislikes`;
    renderFlags();
  }

  // ── Flags ──
  function renderFlags() {
    if (!flagsList || !selectedArg) return;
    const allFlags = selectedArg.flags || [];
    const visible = showResolved
      ? allFlags.filter(f => f.status === 'resolved')
      : allFlags.filter(f => f.status !== 'resolved');

    if (flagBadge) {
      const open = allFlags.filter(f => f.status !== 'resolved').length;
      if (open > 0) {
        flagBadge.style.display = 'inline-block';
        flagBadge.textContent = `${open} New`;
      } else {
        flagBadge.style.display = 'none';
      }
    }

    if (visible.length === 0) {
      flagsList.innerHTML = `<div class="flag-item" style="justify-content:center;color:var(--color-text-muted);">${showResolved ? 'No resolved flags.' : 'No active flags.'}</div>`;
      return;
    }

    // Built with DOM APIs + textContent — flag content is user-typed.
    flagsList.innerHTML = '';
    visible.forEach(flag => {
      const isHigh = flag.reason === 'inappropriate_content' || flag.reason === 'safety_concern';
      const item = document.createElement('div');
      item.className = 'flag-item' + (isHigh ? ' flag-item--high' : '');
      item.dataset.id = flag.flag_id;
      item.style.cursor = 'pointer';

      const iconBox = document.createElement('div');
      iconBox.className = 'flag-item__icon';
      iconBox.innerHTML = isHigh ? ICON_HIGH : ICON_WARN;

      const content = document.createElement('div');
      content.className = 'flag-item__content';

      const title = document.createElement('div');
      title.className = 'flag-item__title';
      title.textContent = (flag.reason || 'Flag').replace('_', ' ').toUpperCase();

      const desc = document.createElement('div');
      desc.className = 'flag-item__desc';
      desc.textContent = flag.description || 'No description provided.';

      const meta = document.createElement('div');
      meta.className = 'flag-item__meta';
      const when = flag.created_at ? new Date(flag.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      meta.textContent = `Reported by @${flag.reporter || 'unknown'}${when ? ' · ' + when : ''}`;

      content.append(title, desc, meta);
      item.append(iconBox, content);
      flagsList.appendChild(item);
    });
  }

  // ── Flag Modal ──
  if (flagsList) {
    flagsList.addEventListener('click', e => {
      const item = e.target.closest('.flag-item');
      if (!item || !item.dataset.id || !selectedArg) return;
      const flag = (selectedArg.flags || []).find(f => String(f.flag_id) === item.dataset.id);
      if (!flag) return;

      activeFlagId = flag.flag_id;
      const when = flag.created_at ? new Date(flag.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
      if (modalTitle) modalTitle.textContent = (flag.reason || 'Flag').replace('_', ' ').toUpperCase();
      if (modalDesc) modalDesc.textContent = flag.description || 'No description provided.';
      if (modalMeta) modalMeta.textContent = `Reported by @${flag.reporter || 'unknown'}${when ? ' · ' + when : ''}`;
      if (btnResolveFlag) btnResolveFlag.style.display = flag.status === 'resolved' ? 'none' : '';
      if (modalOverlay) modalOverlay.setAttribute('aria-hidden', 'false');
    });
  }

  function closeModal() {
    activeFlagId = null;
    if (modalOverlay) modalOverlay.setAttribute('aria-hidden', 'true');
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelFlag) btnCancelFlag.addEventListener('click', closeModal);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  if (btnResolveFlag) {
    btnResolveFlag.addEventListener('click', async () => {
      if (!activeFlagId || !selectedArg) return;
      const origText = btnResolveFlag.textContent;
      btnResolveFlag.disabled = true;
      btnResolveFlag.textContent = 'Resolving...';
      try {
        const res = await fetch(`${window.API_BASE_URL}/api/args/${selectedArg.arg_id}/flags/${activeFlagId}/resolve`, {
          method: 'POST',
          credentials: 'include'
        });
        if (res.ok) {
          const flag = (selectedArg.flags || []).find(f => f.flag_id === activeFlagId);
          if (flag) flag.status = 'resolved';
          closeModal();
          renderFlags();
        }
      } catch (err) {
        console.error(err);
      } finally {
        btnResolveFlag.disabled = false;
        btnResolveFlag.textContent = origText;
      }
    });
  }

  if (btnViewResolved) {
    btnViewResolved.addEventListener('click', () => {
      showResolved = !showResolved;
      btnViewResolved.textContent = showResolved ? 'View Active Flags' : 'View Resolved Flags';
      renderFlags();
    });
  }

  // ── Action Buttons ──
  if (btnEdit) {
    btnEdit.addEventListener('click', () => {
      if (selectedArg) window.location.href = `edit_warg.html?id=${selectedArg.arg_id}`;
    });
  }

  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      if (!selectedArg) return;
      if (window.confirmModal) {
        window.confirmModal.open({
          title: 'Remove WARG',
          desc: `Are you sure you want to permanently delete "${selectedArg.title}"? This cannot be undone and will erase all player progress.`,
          confirmText: 'Delete',
          callback: async () => {
            const res = await fetch(`${window.API_BASE_URL}/api/args/${selectedArg.arg_id}`, {
              method: 'DELETE',
              credentials: 'include'
            });
            if (res.ok) {
              window.location.href = 'studio.html';
            }
          }
        });
      }
    });
  }

  // ── Initial render ──
  selectArg(urlArgId || analyticsArgs[0].arg_id);
});
