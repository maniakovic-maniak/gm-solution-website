import { gsap } from 'gsap';

const CLOSE_MAGNETIC_STRENGTH = 0.4;

export interface DemoModal {
  open: () => void;
}

export function setupDemoModal(): DemoModal {
  const backdrop = document.createElement('div');
  backdrop.className = 'demo-modal-backdrop';

  backdrop.innerHTML = `
    <div class="demo-modal" role="dialog" aria-modal="true" aria-label="Request a demo">
      <div class="demo-modal__close-zone">
        <button class="demo-modal__close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="5" y1="5" x2="19" y2="19"></line>
            <line x1="19" y1="5" x2="5" y2="19"></line>
          </svg>
        </button>
      </div>

      <div class="demo-modal__header">
        <h2 class="demo-modal__title">Demo request</h2>
        <p class="demo-modal__subcopy">I'd like to request a demo of the audit report.</p>
      </div>

      <form class="demo-modal__form">
        <div class="demo-modal__field">
          <label for="demo-name">Name</label>
          <input id="demo-name" name="name" type="text" placeholder="Type…" required />
        </div>
        <div class="demo-modal__field">
          <label for="demo-company">Company</label>
          <input id="demo-company" name="company" type="text" placeholder="Type…" required />
        </div>
        <div class="demo-modal__field">
          <label for="demo-email">Email</label>
          <input id="demo-email" name="email" type="email" placeholder="Email…" required />
        </div>

        <button class="demo-modal__submit" type="submit">
          <span class="demo-modal__submit-roll">
            <span class="demo-modal__submit-label">Request</span>
            <span class="demo-modal__submit-label">Request</span>
          </span>
        </button>
      </form>

      <p class="demo-modal__success" hidden>Thanks — we'll be in touch shortly.</p>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeZone = backdrop.querySelector('.demo-modal__close-zone') as HTMLElement;
  const closeBtn = backdrop.querySelector('.demo-modal__close') as HTMLButtonElement;
  const form = backdrop.querySelector('.demo-modal__form') as HTMLFormElement;
  const success = backdrop.querySelector('.demo-modal__success') as HTMLElement;

  // Same magnetic-pull technique as the floating CTA, applied to the close
  // button within its own small padded zone.
  const moveX = gsap.quickTo(closeBtn, 'x', { duration: 0.3, ease: 'power3' });
  const moveY = gsap.quickTo(closeBtn, 'y', { duration: 0.3, ease: 'power3' });

  closeZone.addEventListener('mousemove', (e) => {
    const rect = closeZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    moveX((e.clientX - centerX) * CLOSE_MAGNETIC_STRENGTH);
    moveY((e.clientY - centerY) * CLOSE_MAGNETIC_STRENGTH);
  });

  closeZone.addEventListener('mouseleave', () => {
    moveX(0);
    moveY(0);
  });

  function open() {
    backdrop.classList.add('is-open');
    form.hidden = false;
    success.hidden = true;
    form.reset();
  }

  function close() {
    backdrop.classList.remove('is-open');
  }

  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('is-open')) close();
  });

  // Real form validation: required fields trigger the browser's own native
  // validation UI automatically on submit attempt -- no custom tooltip code
  // needed, it's the same mechanism producing the same look as the
  // reference. Submission itself is still a placeholder (no backend yet).
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.hidden = true;
    success.hidden = false;
  });

  return { open };
}
