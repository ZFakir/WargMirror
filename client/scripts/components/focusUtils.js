(() => {
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  const dialogState = new WeakMap();

  function getFocusableElements(dialogEl) {
    return [...dialogEl.querySelectorAll(focusableSelector)].filter((element) => {
      return !element.hidden && element.getAttribute('aria-hidden') !== 'true';
    });
  }

  function setBackgroundInert(dialogEl, isOpen) {
    const overlay = dialogEl.parentElement;
    const siblings = [...document.body.children].filter((element) => element !== overlay);

    siblings.forEach((element) => {
      if (isOpen) {
        element.dataset.dialogPreviousAriaHidden = element.getAttribute('aria-hidden') || '';
        element.inert = true;
        element.setAttribute('aria-hidden', 'true');
        return;
      }

      element.inert = false;
      const previousAriaHidden = element.dataset.dialogPreviousAriaHidden;
      if (previousAriaHidden) {
        element.setAttribute('aria-hidden', previousAriaHidden);
      } else {
        element.removeAttribute('aria-hidden');
      }
      delete element.dataset.dialogPreviousAriaHidden;
    });
  }

  function trapFocus(dialogEl) {
    const state = dialogState.get(dialogEl);
    if (!state || state.keydownHandler) return;

    state.keydownHandler = (event) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements(dialogEl);
      if (!focusableElements.length) {
        event.preventDefault();
        dialogEl.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    dialogEl.addEventListener('keydown', state.keydownHandler);
  }

  function openDialogFocus(dialogEl, triggerEl = document.activeElement) {
    const state = { triggerEl, keydownHandler: null };
    dialogState.set(dialogEl, state);
    setBackgroundInert(dialogEl, true);
    trapFocus(dialogEl);

    const initialFocus = dialogEl.querySelector('[autofocus], [data-dialog-initial-focus]') || getFocusableElements(dialogEl)[0] || dialogEl;
    initialFocus.focus();
  }

  function closeDialogFocus(dialogEl) {
    const state = dialogState.get(dialogEl);
    if (!state) return;

    if (state.keydownHandler) {
      dialogEl.removeEventListener('keydown', state.keydownHandler);
    }
    setBackgroundInert(dialogEl, false);
    dialogState.delete(dialogEl);

    if (state.triggerEl && state.triggerEl.isConnected) {
      state.triggerEl.focus();
    }
  }

  window.focusUtils = { trapFocus, openDialogFocus, closeDialogFocus };
})();