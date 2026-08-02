import { gsap } from 'gsap';

const MAGNETIC_STRENGTH = 0.21; // zone padding is applied via CSS (.floating-cta-zone)

export function setupFloatingCta() {
  const zone = document.createElement('div');
  zone.className = 'floating-cta-zone';

  const group = document.createElement('div');
  group.className = 'floating-cta-group';

  const button = document.createElement('button');
  button.className = 'floating-cta';
  button.type = 'button';
  button.innerHTML = `
    <span class="floating-cta__roll">
      <span class="floating-cta__label">Request a Demo</span>
      <span class="floating-cta__label">Request a Demo</span>
    </span>
  `;

  const iconButton = document.createElement('button');
  iconButton.className = 'floating-cta-icon';
  iconButton.type = 'button';
  iconButton.setAttribute('aria-label', 'Request a demo');
  iconButton.innerHTML = `
    <span class="floating-cta-icon__arrow">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </span>
  `;

  // Hover behavior: rotate to point down immediately, then after a short
  // sustained hover, pulse it a few times (a gentle "pull down" nudge)
  // rather than looping indefinitely for as long as the cursor stays.
  const arrowEl = iconButton.querySelector('.floating-cta-icon__arrow') as HTMLElement;
  let pullTimer: ReturnType<typeof setTimeout> | null = null;

  iconButton.addEventListener('mouseenter', () => {
    arrowEl.classList.add('is-down');
    pullTimer = setTimeout(() => {
      arrowEl.classList.add('is-pulling');
    }, 500);
  });

  iconButton.addEventListener('mouseleave', () => {
    arrowEl.classList.remove('is-down', 'is-pulling');
    if (pullTimer) {
      clearTimeout(pullTimer);
      pullTimer = null;
    }
  });

  arrowEl.addEventListener('animationend', () => {
    arrowEl.classList.remove('is-pulling');
  });

  group.appendChild(button);
  group.appendChild(iconButton);
  zone.appendChild(group);
  document.body.appendChild(zone);

  // Magnetic pull: the whole group translates toward the cursor while it's
  // within the padded zone, eased via GSAP's quickTo, springing back to
  // (0,0) once the cursor leaves.
  const moveX = gsap.quickTo(group, 'x', { duration: 0.4, ease: 'power3' });
  const moveY = gsap.quickTo(group, 'y', { duration: 0.4, ease: 'power3' });

  zone.addEventListener('mousemove', (e) => {
    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    moveX((e.clientX - centerX) * MAGNETIC_STRENGTH);
    moveY((e.clientY - centerY) * MAGNETIC_STRENGTH);
  });

  zone.addEventListener('mouseleave', () => {
    moveX(0);
    moveY(0);
  });

  const backdrop = document.createElement('div');
  backdrop.className = 'demo-modal-backdrop';
  backdrop.innerHTML = `
    <div class="demo-modal" role="dialog" aria-modal="true" aria-label="Request a demo">
      <button class="demo-modal__close" type="button" aria-label="Close">&times;</button>
      <h2>Request a Demo</h2>
      <p class="demo-modal__placeholder">Form coming soon — this is a placeholder.</p>
    </div>
  `;
  document.body.appendChild(backdrop);

  const closeBtn = backdrop.querySelector('.demo-modal__close') as HTMLButtonElement;

  function openModal() {
    backdrop.classList.add('is-open');
  }
  function closeModal() {
    backdrop.classList.remove('is-open');
  }

  button.addEventListener('click', openModal);
  iconButton.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
