import type { ScrollEngineControls } from './scrollEngine';

interface NavItem {
  index: number;
  key: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { index: 0, key: 'home', label: 'Home' },
  { index: 1, key: 'product', label: 'Product' },
  { index: 2, key: 'security', label: 'Security' },
  { index: 3, key: 'pricing', label: 'Pricing' },
  { index: 4, key: 'company', label: 'Company' },
];

export function setupNav(controls: ScrollEngineControls) {
  const nav = document.createElement('nav');
  nav.className = 'site-nav';

  const wordmark = document.createElement('img');
  wordmark.className = 'site-nav__wordmark';
  wordmark.src = '/logo.png';
  wordmark.alt = 'GM-Solutions';
  nav.appendChild(wordmark);

  // Desktop link row (unchanged behavior, hidden via CSS below the mobile breakpoint)
  const list = document.createElement('div');
  list.className = 'site-nav__links';

  const desktopLinks: HTMLButtonElement[] = [];

  NAV_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'site-nav__link';
    btn.type = 'button';
    btn.dataset.index = String(item.index);
    btn.innerHTML = `
      <span class="site-nav__link-roll">
        <span class="site-nav__link-label">${item.label}</span>
        <span class="site-nav__link-label">${item.label}</span>
      </span>
    `;
    btn.addEventListener('click', () => controls.goToSlot(item.index));
    list.appendChild(btn);
    desktopLinks.push(btn);
  });

  nav.appendChild(list);

  // Hamburger toggle (only visible below the mobile breakpoint via CSS)
  const hamburger = document.createElement('button');
  hamburger.className = 'site-nav__hamburger';
  hamburger.type = 'button';
  hamburger.setAttribute('aria-label', 'Open menu');
  hamburger.innerHTML = `
    <span class="site-nav__hamburger-bar"></span>
    <span class="site-nav__hamburger-bar"></span>
    <span class="site-nav__hamburger-bar"></span>
  `;
  nav.appendChild(hamburger);

  document.body.appendChild(nav);

  // Full-screen mobile menu overlay
  const mobileMenu = document.createElement('div');
  mobileMenu.className = 'site-nav__mobile-menu';

  const mobileLinks: HTMLButtonElement[] = [];

  NAV_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'site-nav__mobile-link';
    btn.type = 'button';
    btn.dataset.index = String(item.index);
    btn.textContent = item.label;
    btn.addEventListener('click', () => {
      controls.goToSlot(item.index);
      closeMenu();
    });
    mobileMenu.appendChild(btn);
    mobileLinks.push(btn);
  });

  document.body.appendChild(mobileMenu);

  let isOpen = false;

  function openMenu() {
    isOpen = true;
    mobileMenu.classList.add('is-open');
    hamburger.classList.add('is-open');
    hamburger.setAttribute('aria-label', 'Close menu');
  }

  function closeMenu() {
    isOpen = false;
    mobileMenu.classList.remove('is-open');
    hamburger.classList.remove('is-open');
    hamburger.setAttribute('aria-label', 'Open menu');
  }

  hamburger.addEventListener('click', () => {
    if (isOpen) closeMenu();
    else openMenu();
  });

  return {
    setActive(index: number) {
      desktopLinks.forEach((link, i) => {
        link.classList.toggle('is-active', i === index);
      });
      mobileLinks.forEach((link, i) => {
        link.classList.toggle('is-active', i === index);
      });
    },
  };
}
