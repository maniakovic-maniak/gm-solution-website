import { gsap } from 'gsap';
import { setupDemoModal } from './demoModal';

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
      <span class="floating-cta__label">Get Started</span>
      <span class="floating-cta__label">Get Started</span>
    </span>
  `;

  const iconButton = document.createElement('button');
  iconButton.className = 'floating-cta-icon';
  iconButton.type = 'button';
  iconButton.setAttribute('aria-label', 'Get started');
  iconButton.innerHTML = `
    <span class="floating-cta-icon__arrow">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"></line>
        <polyline points="12 5 19 12 12 19"></polyline>
      </svg>
    </span>
  `;

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

  const modal = setupDemoModal();
  button.addEventListener('click', modal.open);
  iconButton.addEventListener('click', modal.open);
}
