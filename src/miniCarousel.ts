const DRAG_THRESHOLD_PX = 10; // minimum movement before we commit to a direction
const SWIPE_COMMIT_FRACTION = 0.2; // fraction of card width a drag must cover to advance a page

interface CarouselState {
  container: HTMLElement;
  track: HTMLElement;
  cards: HTMLElement[];
  dots: HTMLElement[];
  index: number;
}

function goTo(state: CarouselState, index: number) {
  const clamped = Math.max(0, Math.min(state.cards.length - 1, index));
  state.index = clamped;
  state.track.style.transform = `translateX(-${clamped * 100}%)`;
  state.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === clamped));
}

function setupOne(container: HTMLElement) {
  const track = container.querySelector('.mini-track') as HTMLElement;
  const cards = Array.from(track.children) as HTMLElement[];
  const dotsContainer = container.querySelector('.mini-dots') as HTMLElement;

  const dots = cards.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'mini-dot';
    dot.setAttribute('aria-label', `Go to card ${i + 1}`);
    dot.addEventListener('click', () => goTo(state, i));
    dotsContainer.appendChild(dot);
    return dot;
  });

  const state: CarouselState = { container, track, cards, dots, index: 0 };
  goTo(state, 0);

  let startX = 0;
  let startY = 0;
  let dragging = false; // true once we've committed this gesture as horizontal
  let decided = false; // true once we've decided horizontal vs vertical for this gesture
  let currentDx = 0;

  track.style.transition = 'transform 0.35s cubic-bezier(0.65, 0, 0.35, 1)';

  function onDown(clientX: number, clientY: number) {
    startX = clientX;
    startY = clientY;
    dragging = false;
    decided = false;
    currentDx = 0;
    track.style.transition = 'none';
  }

  function onMove(clientX: number, clientY: number, e: Event) {
    const dx = clientX - startX;
    const dy = clientY - startY;

    if (!decided) {
      if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
      decided = true;
      dragging = Math.abs(dx) > Math.abs(dy);
    }

    if (!dragging) return; // vertical gesture -- let it bubble to the page scroll engine untouched

    e.stopPropagation();
    e.preventDefault();
    currentDx = dx;
    const percent = (dx / container.clientWidth) * 100;
    track.style.transform = `translateX(calc(-${state.index * 100}% + ${percent}%))`;
  }

  function onUp() {
    if (dragging) {
      track.style.transition = 'transform 0.35s cubic-bezier(0.65, 0, 0.35, 1)';
      const movedFraction = currentDx / container.clientWidth;
      if (movedFraction < -SWIPE_COMMIT_FRACTION) goTo(state, state.index + 1);
      else if (movedFraction > SWIPE_COMMIT_FRACTION) goTo(state, state.index - 1);
      else goTo(state, state.index);
    }
    dragging = false;
    decided = false;
  }

  container.addEventListener('pointerdown', (e) => onDown(e.clientX, e.clientY));
  container.addEventListener('pointermove', (e) => onMove(e.clientX, e.clientY, e));
  container.addEventListener('pointerup', onUp);
  container.addEventListener('pointerleave', onUp);

  container.addEventListener(
    'touchstart',
    (e) => onDown(e.touches[0].clientX, e.touches[0].clientY),
    { passive: true }
  );
  container.addEventListener(
    'touchmove',
    (e) => onMove(e.touches[0].clientX, e.touches[0].clientY, e),
    { passive: false }
  );
  container.addEventListener('touchend', onUp);
}

export function setupMiniCarousels() {
  document.querySelectorAll<HTMLElement>('.mini-carousel').forEach(setupOne);
}
