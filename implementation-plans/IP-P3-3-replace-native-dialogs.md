# IP-P3-3 — Replace Native `alert()` / `confirm()` with Accessible Primitives

**Register item:** MISSING_ITEMS.md §5, P3-3 (remove native dialogs; use toast/modal-confirm)
**Prerequisites:** IP-00 (the Dev Override `confirm` at `game.js:587` is removed by Polish-F). Shares primitives with IP-P3-1 (focus management in ConfirmModal).
**Effort:** 3–5 hours.

## 1. What is missing and why it matters for scoring

About 20 native `alert()` calls plus 2 `confirm()` calls remain in product code. Native dialogs block the JS thread, are poorly announced by screen readers, cannot be styled, and make Playwright coverage runs fragile (a stray alert blocks page teardown — a known source of the instrumentation timeouts). Replacing them with the existing `window.confirmModal` + a toast primitive removes a whole failure class and demonstrates accessible-UX care in the rubric.

## 2. Current state (verified)

22 call sites enumerated:

- `client/scripts/game.js` — L135, L150, L265, L537, L542, L562, L587 (confirm), L708, L723, L747, L761, L983
- `client/scripts/minigame-handlers.js` — L43, L194 (confirm), L239
- `client/scripts/signup.js` — L43, L120, L127
- `client/scripts/components/RemoveModal.js` — L104
- `client/scripts/components/FlagModal.js` — L118, L149

Existing reusable primitive: `window.confirmModal` (`ConfirmModal.js`, singleton L129) — already used by `GameCard.js` (L353, L480). A toast helper (`showToast`) is referenced in `GameCard.js:361/364` — verify where it's defined; if it is a stub, formalize it here.

## 3. Implementation subtasks

1. **Inventory + classify** every call site into four buckets: error (→ toast with `role="alert"` or error toast variant), status/success (→ toast `role="status"`), destructive confirmation (→ ConfirmModal with red confirm button), authorization prompt (→ ConfirmModal, e.g. "Log in to continue" — `GameCard.js:480-485` is the pattern).
2. **Formalize primitives**:
   - `showToast(message, { type: 'info'|'success'|'error', duration })` — single toast container in each page or a shared module (`client/scripts/components/toast.js`), auto-dismiss, `aria-live` region so messages are announced; stack or replace policy decided once.
   - Reuse `ConfirmModal` for confirmations; extend it with an optional `danger: true` style (it already supports title/desc/confirmText/callback per the `GameCard.js` usage).
3. **Replace incrementally, one page per commit**: game.js (largest cluster) → minigame-handlers.js → signup.js → RemoveModal/FlagModal internals. Keep each commit green.
4. **Preserve semantics**: where `alert()` was used after a failed fetch, the replacement must keep the error visible (toast duration long enough, or persistent until dismissed for errors). Where `confirm()` gated a destructive action, the modal callback must fire only on confirm.
5. **Update `testing.md`** guidance: native dialogs no longer appear; document the toast/modal selectors for tests.
6. **Add an ESLint guard** (client `eslint.config.mjs`): `no-alert` rule enabled — so no native dialog can creep back (this is the durable acceptance mechanism).

## 4. Required tests/checks

- Grep verification: `Select-String -Path client/scripts -Pattern 'alert\(|confirm\(' -Recurse` returns zero product hits (allow-list test files if any).
- New Playwright assertions: triggering an error shows the toast; destructive action opens ConfirmModal and cancel/confirm paths both work; messages announced (check `aria-live` container content).
- Full suite green (`--reporter=json`).

## 5. Acceptance criteria

- No product code invokes native `alert()`/`confirm()` (ESlint-enforced).
- All user messages remain visible and are announced to assistive tech.
- Destructive flows require explicit confirmation via ConfirmModal.

## 6. Verification without breaking existing functionality

- Walk every replaced flow manually once (game play error, signup validation error, remove-from-recent, flag submission).
- Playwright suite green; coverage runs no longer risk alert-blocking (note the improvement in the PR).

## 7. Safety notes

- Client-only change; no server/database impact.
- Do not change *what* the messages say in the same PR — swap mechanism only; copy changes belong to a separate review.
- Beware double-notification: if a flow already shows a toast AND an alert for the same event, keep exactly one.
