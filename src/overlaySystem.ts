import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const TARGET_WORLD_WIDTH = 300;   // world-space width the card is scaled to (matches its 560 CSS px)
const MOBILE_BREAKPOINT_PX = 640;
const CARD_CSS_WIDTH_DESKTOP = 560;
const CARD_CSS_WIDTH_MOBILE = 320; // narrower on mobile so text wraps into a portrait
                                    // shape (more lines, taller card) rather than
                                    // just scaling the same wide layout down

function currentCardCssWidth(): number {
  return window.innerWidth < MOBILE_BREAKPOINT_PX ? CARD_CSS_WIDTH_MOBILE : CARD_CSS_WIDTH_DESKTOP;
}
const ENTRY_START_DISTANCE = 30;  // very close to camera — huge, heavily blurred "swooping past"
const DEPART_END_DISTANCE = 950;  // far enough to be gone/faded
const SETTLE_WIDTH_FRACTION = 0.7; // card should read as 70% of viewport width once settled
const HIGH_BLUR_PX = 26;
const CLOUD_OPACITY = 0.4;        // opacity at the very start of the entry swoop
const SOLID_THRESHOLD = 0.88;     // how "settled" (0..1) before the card becomes the solid panel

interface CardEntry {
  el: HTMLElement;
  object: CSS3DObject;
  slotProgress: number;
  index: number;
}

export class OverlaySystem {
  renderer: CSS3DRenderer;
  scene = new THREE.Scene();
  private cards: CardEntry[] = [];
  private progress = 0;
  private step: number;
  private locked = true;
  private lockedSlot = 0;
  private camera: THREE.PerspectiveCamera;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.renderer = new CSS3DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    Object.assign(this.renderer.domElement.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '1',
      pointerEvents: 'none',
    });
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      // Measure each card's own actual rendered width rather than assuming
      // one shared width -- cards can have their own CSS width override
      // (e.g. the wider Product card), including viewport-relative widths
      // that change continuously on resize, not just at a fixed breakpoint.
      this.cards.forEach((card) => {
        const measuredWidth = card.el.offsetWidth || currentCardCssWidth();
        card.object.scale.setScalar(TARGET_WORLD_WIDTH / measuredWidth);
      });
    });

    const sections = document.querySelectorAll<HTMLElement>('[data-section]');
    this.step = 1 / (sections.length - 1);

    sections.forEach((section, i) => {
      const cardEl = section.querySelector<HTMLElement>('.overlay-card');
      if (!cardEl) return;

      const object = new CSS3DObject(cardEl);
      const measuredWidth = cardEl.offsetWidth || currentCardCssWidth();
      const baseScale = TARGET_WORLD_WIDTH / measuredWidth;
      object.scale.setScalar(baseScale);
      this.scene.add(object);

      this.cards.push({ el: cardEl, object, slotProgress: i * this.step, index: i });
    });

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
  }

  /** Distance from camera at which the card's fixed world width reads as
   * SETTLE_WIDTH_FRACTION of the current viewport width — derived from the
   * camera's actual vertical FOV and aspect, so it stays correct across
   * screen sizes and resizes rather than a guessed constant. */
  private settleDistance(): number {
    const vFov = (this.camera.fov * Math.PI) / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    return TARGET_WORLD_WIDTH / (SETTLE_WIDTH_FRACTION * 2 * Math.tan(hFov / 2));
  }

  setProgress(progress: number, locked: boolean, lockedSlot: number) {
    this.progress = progress;
    this.locked = locked;
    this.lockedSlot = lockedSlot;
  }

  update() {
    const camZ = this.camera.position.z;
    const settleDist = this.settleDistance();

    this.cards.forEach((card) => {
      // normalizedT: -1 at the previous slot, 0 at this card's own slot
      // (fully settled), +1 at the next slot. Entry uses the -1..0 half,
      // departure uses the 0..1 half — so a card is only ever "in play"
      // across the two step-widths adjacent to its own slot.
      const rawT = (this.progress - card.slotProgress) / this.step;
      const normalizedT = THREE.MathUtils.clamp(rawT, -1, 1);

      let distance: number;
      let blurPx: number;
      let opacity: number;
      let focus: number; // 0 = cloud, 1 = fully settled/sharp

      if (normalizedT <= 0) {
        const t = normalizedT + 1; // 0 at previous slot -> 1 at this slot
        distance = THREE.MathUtils.lerp(ENTRY_START_DISTANCE, settleDist, t);
        blurPx = THREE.MathUtils.lerp(HIGH_BLUR_PX, 0, t);
        opacity = THREE.MathUtils.lerp(CLOUD_OPACITY, 1, t);
        focus = t;
      } else {
        const t = normalizedT; // 0 at this slot -> 1 at next slot
        distance = THREE.MathUtils.lerp(settleDist, DEPART_END_DISTANCE, t);
        blurPx = THREE.MathUtils.lerp(0, HIGH_BLUR_PX, t);
        opacity = THREE.MathUtils.lerp(1, 0, t);
        focus = 1 - t;
      }

      // Cards more than one slot away from the current position freeze at
      // the clamp boundary above (same distance/blur every time) — without
      // this, every off-screen card would sit at that identical near-camera
      // "just arriving" state forever and stack up as visible haze. Fade
      // the remainder out over one extra slot-width so they actually
      // disappear instead of piling up.
      const farFade = 1 - THREE.MathUtils.clamp(Math.abs(rawT) - 1, 0, 1);
      opacity *= farFade;

      // While locked/settled, every card except the one actually locked is
      // hidden outright -- without this, a neighboring card sits parked at
      // its entry/exit extreme (close, huge, blurred) for the entire time
      // the active card is being read, bleeding a constant haze across the
      // view instead of only appearing during the brief transition itself.
      if (this.locked && card.index !== this.lockedSlot) {
        opacity = 0;
      }

      // Camera looks toward -z; placing the card at camZ - distance puts
      // it directly ahead, same convention the galaxy tunnel already uses.
      card.object.position.set(0, 0, camZ - distance);

      card.el.style.opacity = String(opacity);
      card.el.style.filter = `blur(${blurPx}px)`;
      card.el.style.pointerEvents = focus > 0.9 ? 'auto' : 'none';

      const shouldBeSolid = focus >= SOLID_THRESHOLD;
      card.el.classList.toggle('is-solid', shouldBeSolid);
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
