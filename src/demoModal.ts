import { gsap } from 'gsap';
import { buildSubmissionFormPage } from './submissionForm';

const CLOSE_MAGNETIC_STRENGTH = 0.4;
const PAGE_COUNT = 2;

export interface DemoModal {
  open: () => void;
}

export function setupDemoModal(): DemoModal {
  const backdrop = document.createElement('div');
  backdrop.className = 'demo-modal-backdrop';

  backdrop.innerHTML = `
    <div class="demo-modal" role="dialog" aria-modal="true" aria-label="Submission form">
      <div class="demo-modal__close-zone">
        <button class="demo-modal__close" type="button" aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="5" y1="5" x2="19" y2="19"></line>
            <line x1="19" y1="5" x2="5" y2="19"></line>
          </svg>
        </button>
      </div>

      <div class="demo-tabs">
        <button class="demo-tab is-active" type="button" data-index="0">Submission Form</button>
        <button class="demo-tab-link" type="button" data-index="1">or Request a Demo</button>
      </div>

      <div class="demo-track-viewport">
        <div class="demo-track"></div>
      </div>
    </div>
  `;

  const quitPopup = document.createElement('div');
  quitPopup.className = 'popup-overlay';
  quitPopup.innerHTML = `
    <div class="popup-card">
      <p class="quit-confirm-text">Are you sure you want to quit? All your inputs will be lost.</p>
      <div class="quit-confirm-actions">
        <button class="quit-confirm-btn quit-confirm-btn--back" type="button">Back</button>
        <button class="quit-confirm-btn quit-confirm-btn--quit" type="button">Quit</button>
      </div>
    </div>
  `;
  backdrop.appendChild(quitPopup);

  document.body.appendChild(backdrop);

  const closeZone = backdrop.querySelector('.demo-modal__close-zone') as HTMLElement;
  const closeBtn = backdrop.querySelector('.demo-modal__close') as HTMLButtonElement;
  const track = backdrop.querySelector('.demo-track') as HTMLElement;
  const tabButtons = Array.from(backdrop.querySelectorAll<HTMLButtonElement>('.demo-tab, .demo-tab-link'));

  const page0 = document.createElement('div');
  page0.className = 'demo-page';
  const submissionPage = buildSubmissionFormPage();
  page0.appendChild(submissionPage.element);
  track.appendChild(page0);

  const page1 = document.createElement('div');
  page1.className = 'demo-page';
  page1.innerHTML = `
    <div class="demo-modal__header">
      <h2 class="demo-modal__title">Demo request</h2>
      <p class="demo-modal__subcopy">I'd like to request a demo of the financial model review report.</p>
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
  `;
  track.appendChild(page1);

  const demoForm = page1.querySelector('.demo-modal__form') as HTMLFormElement;
  const demoSuccess = page1.querySelector('.demo-modal__success') as HTMLElement;
  demoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    demoForm.hidden = true;
    demoSuccess.hidden = false;
  });

  function page1HasInput(): boolean {
    if (!demoSuccess.hidden) return false;
    return Array.from(demoForm.querySelectorAll('input')).some(
      (input) => (input as HTMLInputElement).value.trim().length > 0
    );
  }

  let currentIndex = 0;

  function goTo(index: number) {
    currentIndex = Math.max(0, Math.min(PAGE_COUNT - 1, index));
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    tabButtons.forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.index) === currentIndex);
    });
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => goTo(Number(btn.dataset.index)));
  });


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
    document.body.classList.add('modal-open');
    quitPopup.classList.remove('show');
    goTo(0);
  }

  function actuallyClose() {
    backdrop.classList.remove('is-open');
    document.body.classList.remove('modal-open');
    quitPopup.classList.remove('show');
    submissionPage.reset();
    demoForm.reset();
    demoForm.hidden = false;
    demoSuccess.hidden = true;
  }

  function requestClose() {
    if (!backdrop.classList.contains('is-open')) return;
    if (quitPopup.classList.contains('show')) return; // already asking -- wait for Back/Quit
    const dirty = submissionPage.hasInput() || page1HasInput();
    if (!dirty) {
      actuallyClose();
      return;
    }
    quitPopup.classList.add('show');
  }

  function cancelQuit() {
    quitPopup.classList.remove('show');
  }

  const quitBackBtn = quitPopup.querySelector('.quit-confirm-btn--back') as HTMLButtonElement;
  const quitQuitBtn = quitPopup.querySelector('.quit-confirm-btn--quit') as HTMLButtonElement;
  quitBackBtn.addEventListener('click', cancelQuit);
  quitQuitBtn.addEventListener('click', actuallyClose);

  closeBtn.addEventListener('click', requestClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) requestClose();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && backdrop.classList.contains('is-open')) requestClose();
  });

  return { open };
}
