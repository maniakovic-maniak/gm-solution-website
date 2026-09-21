interface CarouselState {
  container: HTMLElement;
  track: HTMLElement;
  cards: HTMLElement[];
  dots: HTMLElement[];
  prevBtn: HTMLButtonElement | null;
  nextBtn: HTMLButtonElement | null;
  index: number;
}

const carouselStates: CarouselState[] = [];

function goTo(state: CarouselState, index: number) {
  const clamped = Math.max(0, Math.min(state.cards.length - 1, index));
  state.index = clamped;
  state.track.style.transform = `translateX(-${clamped * 100}%)`;
  state.dots.forEach((dot, i) => dot.classList.toggle('is-active', i === clamped));

  if (state.prevBtn) state.prevBtn.style.visibility = clamped === 0 ? 'hidden' : 'visible';
  if (state.nextBtn) {
    state.nextBtn.style.visibility = clamped === state.cards.length - 1 ? 'hidden' : 'visible';
  }
}

/** All cards sit in normal flow (only translated off-screen, never
 * display:none), so their real natural height can be measured directly
 * even while hidden -- take the tallest and lock the track to that one
 * fixed pixel height, so the card never resizes between slides and we
 * never depend on fragile CSS flex-stretch across transformed siblings.
 * Re-run whenever the viewport changes, since a narrower/wider card
 * reflows its text into a different number of lines, making a height
 * measured at one width stale (and potentially too short) at another. */
function applyTrackHeight(state: CarouselState) {
  const maxHeight = Math.max(...state.cards.map((card) => card.scrollHeight));
  state.track.style.height = `${maxHeight}px`;
}

function setupOne(container: HTMLElement) {
  const track = container.querySelector('.mini-track') as HTMLElement;
  const cards = Array.from(track.children) as HTMLElement[];
  const dotsContainer = container.querySelector('.mini-dots') as HTMLElement;
  const prevBtn = container.querySelector('.mini-arrow--prev') as HTMLButtonElement | null;
  const nextBtn = container.querySelector('.mini-arrow--next') as HTMLButtonElement | null;

  const dots = cards.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'mini-dot';
    dot.setAttribute('aria-label', `Go to card ${i + 1}`);
    dot.addEventListener('click', () => goTo(state, i));
    dotsContainer.appendChild(dot);
    return dot;
  });

  const state: CarouselState = { container, track, cards, dots, prevBtn, nextBtn, index: 0 };
  carouselStates.push(state);
  goTo(state, 0);
  applyTrackHeight(state);

  prevBtn?.addEventListener('click', () => goTo(state, state.index - 1));
  nextBtn?.addEventListener('click', () => goTo(state, state.index + 1));

  // Horizontal swipe, alongside the existing arrows (not replacing them).
  // Only commits to a slide change on a clearly horizontal gesture that
  // crosses a real distance threshold -- and only then calls
  // preventDefault, so an ordinary vertical swipe (the page's own
  // scroll-jacking gesture) passes through untouched rather than getting
  // eaten by this card.
  const SWIPE_THRESHOLD_PX = 40;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchIsHorizontal = false;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchIsHorizontal = false;
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    const deltaX = e.touches[0].clientX - touchStartX;
    const deltaY = e.touches[0].clientY - touchStartY;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      touchIsHorizontal = true;
      e.preventDefault();
    }
  }, { passive: false });

  track.addEventListener('touchend', (e) => {
    if (!touchIsHorizontal) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    goTo(state, deltaX < 0 ? state.index + 1 : state.index - 1);
  });
}

export function setupMiniCarousels() {
  document.querySelectorAll<HTMLElement>('.mini-carousel').forEach(setupOne);

  let resizeTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      carouselStates.forEach((state) => applyTrackHeight(state));
    }, 150);
  });
}

export function resetMiniCarousels() {
  carouselStates.forEach((state) => goTo(state, 0));
}
