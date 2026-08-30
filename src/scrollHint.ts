const DISPLAY_MS = 2000;

export type ScrollHintDirection = 'up' | 'down';

export interface ScrollHint {
  show: (direction: ScrollHintDirection) => void;
}

export function setupScrollHint(): ScrollHint {
  const el = document.createElement('div');
  el.className = 'scroll-hint';
  el.setAttribute('role', 'status');
  document.body.appendChild(el);

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  function show(direction: ScrollHintDirection) {
    el.textContent = direction === 'down' ? 'Swipe down to scroll' : 'Swipe up to scroll';

    // Restart the visible/fade state even if a hint is already showing, so
    // a repeated attempt during the same 2s window keeps it visible rather
    // than letting it disappear mid-way through.
    if (hideTimer) clearTimeout(hideTimer);
    el.classList.add('is-visible');
    hideTimer = setTimeout(() => {
      el.classList.remove('is-visible');
      hideTimer = null;
    }, DISPLAY_MS);
  }

  return { show };
}
