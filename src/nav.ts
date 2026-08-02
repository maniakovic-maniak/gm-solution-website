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

  const list = document.createElement('div');
  list.className = 'site-nav__links';

  const links: HTMLButtonElement[] = [];

  NAV_ITEMS.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'site-nav__link';
    btn.type = 'button';
    btn.dataset.index = String(item.index);

    // Stacked double-label roll effect: two identical copies of the text,
    // clipped by the button's overflow:hidden -- on hover the inner stack
    // translates up so the duplicate rolls into view in place of the
    // original, rather than just recoloring/underlining.
    btn.innerHTML = `
      <span class="site-nav__link-roll">
        <span class="site-nav__link-label">${item.label}</span>
        <span class="site-nav__link-label">${item.label}</span>
      </span>
    `;

    btn.addEventListener('click', () => controls.goToSlot(item.index));
    list.appendChild(btn);
    links.push(btn);
  });

  nav.appendChild(list);
  document.body.appendChild(nav);

  return {
    setActive(index: number) {
      links.forEach((link, i) => {
        link.classList.toggle('is-active', i === index);
      });
    },
  };
}
