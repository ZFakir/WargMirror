/**
 * WARG Platform — GameCard Component
 * ===================================
 * Factory that creates a fully-featured game card DOM element.
 * Usage:
 *   const card = GameCard.create(gameObject);
 *   container.appendChild(card);
 *
 *   // Or fill an entire row at once:
 *   GameCard.renderRow('row-recent', WARG_GAMES.recent);
 */

/* eslint-disable no-var */
var GameCard = (function () {

  /* ── Mode configuration ─────────────────────────────── */
  var MODE = {
    solo: {
      label:     'Solo',
      badgeClass:'badge--solo',
      bg:        'linear-gradient(145deg,#141028 0%,#1e1840 100%)',
      glowColor: 'rgba(153,172,255,0.18)',
    },
    coop: {
      label:     'Co-op',
      badgeClass:'badge--coop',
      bg:        'linear-gradient(145deg,#081408 0%,#0e2810 100%)',
      glowColor: 'rgba(51,255,51,0.14)',
    },
    pvp: {
      label:     'PvP',
      badgeClass:'badge--pvp',
      bg:        'linear-gradient(145deg,#180808 0%,#2a0e0e 100%)',
      glowColor: 'rgba(255,107,107,0.18)',
    },
    live: {
      label:     'Live',
      badgeClass:'badge--live',
      bg:        'linear-gradient(145deg,#141000 0%,#241e00 100%)',
      glowColor: 'rgba(255,209,102,0.18)',
    },
  };

  /* ── SVG icon strings ───────────────────────────────── */
  var ICONS = {
    thumbUp: [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"',
      ' stroke-linejoin="round" aria-hidden="true">',
      '<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2',
      ' 2 0 0 0-2-2.3H14z"/>',
      '<path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
      '</svg>',
    ].join(''),

    thumbDown: [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"',
      ' stroke-linejoin="round" aria-hidden="true">',
      '<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2',
      ' 2 0 0 0 2 2.3H10z"/>',
      '<path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>',
      '</svg>',
    ].join(''),

    flag: [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"',
      ' stroke-linejoin="round" aria-hidden="true">',
      '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>',
      '<line x1="4" y1="22" x2="4" y2="15"/>',
      '</svg>',
    ].join(''),

    star: [
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"',
      ' aria-hidden="true">',
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02',
      ' 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
      '</svg>',
    ].join(''),

    location: [
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"',
      ' stroke-linejoin="round" aria-hidden="true">',
      '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>',
      '<circle cx="12" cy="10" r="3"/>',
      '</svg>',
    ].join(''),

    publish: [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"',
      ' stroke-linejoin="round" aria-hidden="true">',
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
      '<polyline points="17 8 12 3 7 8"/>',
      '<line x1="12" y1="3" x2="12" y2="15"/>',
      '</svg>',
    ].join(''),

    unpublish: [
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"',
      ' stroke="currentColor" stroke-width="2" stroke-linecap="round"',
      ' stroke-linejoin="round" aria-hidden="true">',
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>',
      '<polyline points="7 16 12 21 17 16"/>',
      '<line x1="12" y1="21" x2="12" y2="9"/>',
      '</svg>',
    ].join(''),
  };

  /* ── Helpers ────────────────────────────────────────── */
  function formatCount(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function buildProgressHTML(game) {
    if (game.progress == null) {
      return '<span class="gc-progress__label gc-progress__label--idle">Not started</span>';
    }
    if (game.progress >= 100) {
      return '<span class="gc-progress__label gc-progress__label--done">✓ Completed</span>';
    }
    return [
      '<div class="gc-progress__track"',
      ' role="progressbar"',
      ' aria-valuenow="' + game.progress + '"',
      ' aria-valuemin="0"',
      ' aria-valuemax="100"',
      ' aria-label="' + (game.progressLabel || game.progress + '% complete') + '">',
      '  <div class="gc-progress__fill" style="width:' + game.progress + '%"></div>',
      '</div>',
      '<span class="gc-progress__label">' + (game.progressLabel || game.progress + '% done') + '</span>',
    ].join('');
  }

  /* ── Card factory ────────────────────────────────────── */
  /**
   * create(game) → HTMLElement
   * Accepts a game data object and returns a ready-to-append article element.
   */
  function create(game, options) {
    options = options || {};
    var hideProgress  = options.hideProgress || false;
    var showPublish   = options.showPublish || false;
    var showUnpublish = options.showUnpublish || false;

    var mode    = MODE[game.mode] || MODE.solo;
    var article = document.createElement('article');

    article.className = 'game-card' + (game.featured ? ' game-card--featured' : '');
    article.dataset.gameId = game.id;
    article.tabIndex  = 0;
    article.setAttribute('role', 'listitem');
    article.setAttribute('aria-label', game.title + ' — ' + mode.label + ' game');

    /* Cover: image or emoji placeholder */
    var coverMediaHTML = game.image
      ? '<img src="' + game.image + '" alt="' + game.title + '" loading="lazy" />'
      : '<span class="gc-cover__emoji" aria-hidden="true">' + (game.emoji || '🎮') + '</span>';

    article.innerHTML = [

      /* ── Cover ── */
      '<div class="gc-cover" style="background:' + mode.bg + ';--card-glow:' + mode.glowColor + '">',
        coverMediaHTML,
        '<span class="gc-cover__badge ' + mode.badgeClass + '">' + mode.label + '</span>',
      '</div>',

      /* ── Body ── */
      '<div class="gc-body">',

        /* Title */
        '<h3 class="gc-title">' + game.title + '</h3>',

        /* Caption */
        '<p class="gc-caption">' + game.caption + '</p>',

        /* Progress */
        (hideProgress ? '' : (
          '<div class="gc-progress">' +
            buildProgressHTML(game) +
          '</div>'
        )),

        /* Author */
        '<div class="gc-author">',
          '<span class="gc-author__avatar" aria-hidden="true">' + game.author.initials + '</span>',
          '<span class="gc-author__name">' + game.author.name + '</span>',
        '</div>',

        /* Actions */
        '<div class="gc-actions">',

          (showPublish ? (
            '<button class="gc-action gc-action--publish" data-action="publish"' +
            ' aria-label="Publish game" style="width: 100%; justify-content: center; gap: var(--space-2); color: var(--color-success); border-color: rgba(51, 255, 51, 0.2);">' +
              ICONS.publish +
              '<span class="gc-action__count">Publish WARG</span>' +
            '</button>'
          ) : showUnpublish ? (
            '<button class="gc-action gc-action--unpublish" data-action="unpublish"' +
            ' aria-label="Unpublish game" style="width: 100%; justify-content: center; gap: var(--space-2); color: var(--color-warning); border-color: rgba(255, 209, 102, 0.2);">' +
              ICONS.unpublish +
              '<span class="gc-action__count">Unpublish WARG</span>' +
            '</button>'
          ) : (
            '<button class="gc-action" data-action="like"' +
            ' aria-label="Like" aria-pressed="false">' +
              ICONS.thumbUp +
              '<span class="gc-action__count">' + formatCount(game.likes) + '</span>' +
            '</button>' +

            '<button class="gc-action" data-action="dislike"' +
            ' aria-label="Dislike" aria-pressed="false">' +
              ICONS.thumbDown +
              '<span class="gc-action__count">' + formatCount(game.dislikes) + '</span>' +
            '</button>' +

            '<button class="gc-action gc-action--flag" data-action="flag"' +
            ' aria-label="Flag content" aria-pressed="false">' +
              ICONS.flag +
            '</button>' +

            '<div class="gc-rating" aria-label="Rating: ' + game.rating + ' out of 5">' +
              ICONS.star +
              '<span>' + game.rating.toFixed(1) + '</span>' +
            '</div>'
          )),

        '</div>', /* gc-actions */

      '</div>', /* gc-body */

    ].join('');

    /* ── Wire interaction ── */
    _attachEvents(article, game);

    return article;
  }

  /* ── Event handling ─────────────────────────────────── */
  function _attachEvents(article) {
    /* Action buttons: like / dislike / flag (mutually exclusive: like ↔ dislike) */
    article.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) {
        /* Clicking the card body opens the game */
        _onCardOpen(article);
        return;
      }
      e.stopPropagation();

      var action    = btn.dataset.action;

      if (action === 'publish' || action === 'unpublish') {
        article.dispatchEvent(new CustomEvent('warg:' + action, {
          bubbles: true,
          detail: { 
            gameId: article.dataset.gameId, 
            gameTitle: article.querySelector('.gc-title').textContent 
          }
        }));
        return;
      }

      var isPressed = btn.getAttribute('aria-pressed') === 'true';

      btn.setAttribute('aria-pressed', String(!isPressed));
      btn.classList.toggle('is-active', !isPressed);

      /* Mutual exclusion: liking removes dislike state and vice-versa */
      if (action === 'like' && !isPressed) {
        var dislike = article.querySelector('[data-action="dislike"]');
        if (dislike && dislike.getAttribute('aria-pressed') === 'true') {
          dislike.setAttribute('aria-pressed', 'false');
          dislike.classList.remove('is-active');
        }
      } else if (action === 'dislike' && !isPressed) {
        var like = article.querySelector('[data-action="like"]');
        if (like && like.getAttribute('aria-pressed') === 'true') {
          like.setAttribute('aria-pressed', 'false');
          like.classList.remove('is-active');
        }
      }
    });

    /* Keyboard: Enter / Space activates the card (not a button) */
    article.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === article) {
        e.preventDefault();
        _onCardOpen(article);
      }
    });
  }

  function _onCardOpen(article) {
    var title = article.querySelector('.gc-title');
    console.log('[WARG] Open game:', title ? title.textContent.trim() : article.dataset.gameId);
    if (window.location.pathname.includes('studio.html')) {
      window.location.href = 'edit_warg.html';
    } else {
      window.location.href = 'game.html';
    }
  }

  /* ── renderRow helper ────────────────────────────────── */
  /**
   * renderRow(containerId, gamesArray)
   * Clears the container and appends freshly-built cards.
   *
   * @param {string}   containerId  — id attribute of the .card-row element
   * @param {object[]} games        — array of game data objects
   * @param {object}   options      — configuration options (e.g. hideProgress)
   */
  function renderRow(containerId, games, options) {
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn('[GameCard] Container not found:', containerId);
      return;
    }
    /* DocumentFragment batches DOM insertions for one reflow */
    var frag = document.createDocumentFragment();
    games.forEach(function (game) { frag.appendChild(create(game, options)); });
    container.innerHTML = '';
    container.appendChild(frag);
  }

  /* ── Public API ─────────────────────────────────────── */
  return { create: create, renderRow: renderRow };

}());
