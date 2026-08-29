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

  // All cards sit in normal flow (only translated off-screen, never
  // display:none), so their real natural height can be measured directly
  // even while hidden -- take the tallest and lock the track to that one
  // fixed pixel height, so the card never resizes between slides and we
  // never depend on fragile CSS flex-stretch across transformed siblings.
  const maxHeight = Math.max(...cards.map((card) => card.scrollHeight));
  track.style.height = `${maxHeight}px`;

  prevBtn?.addEventListener('click', () => goTo(state, state.index - 1));
  nextBtn?.addEventListener('click', () => goTo(state, state.index + 1));
}

export function setupMiniCarousels() {
  document.querySelectorAll<HTMLElement>('.mini-carousel').forEach(setupOne);
}

export function resetMiniCarousels() {
  carouselStates.forEach((state) => goTo(state, 0));
}
