import './style.css';
import { Galaxy } from './galaxy';
import { OverlaySystem } from './overlaySystem';
import { setupScrollEngine } from './scrollEngine';
import { setupMotionInput } from './motion';
import { setupNav } from './nav';

function isLowPower(): boolean {
  const cores = navigator.hardwareConcurrency || 4;
  return cores <= 4;
}

function showFatalError(label: string, err: unknown) {
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;inset:0;background:#200;color:#f88;font-family:monospace;' +
    'font-size:14px;padding:2rem;z-index:9999;overflow:auto;white-space:pre-wrap;';
  const message = err instanceof Error ? `${err.message}\n\n${err.stack}` : String(err);
  box.textContent = `FATAL during ${label}:\n\n${message}`;
  document.body.appendChild(box);
  // eslint-disable-next-line no-console
  console.error(`FATAL during ${label}`, err);
}

try {
  const canvas = document.getElementById('galaxy-canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('galaxy-canvas element not found in DOM');

  const galaxy = new Galaxy(canvas, { lowPower: isLowPower() });

  let overlay: OverlaySystem;
  try {
    overlay = new OverlaySystem(galaxy.camera);
  } catch (err) {
    showFatalError('OverlaySystem construction', err);
    throw err;
  }

  const sectionCount = document.querySelectorAll('[data-section]').length;

  // nav is created after the scroll engine (it needs the engine's controls
  // to wire click-to-jump), but the engine fires its first progress update
  // synchronously during setup, before nav exists yet -- so the callback
  // guards on a mutable holder instead of closing over `nav` directly.
  let nav: ReturnType<typeof setupNav> | null = null;

  const controls = setupScrollEngine(sectionCount, (progress, locked, lockedSlot) => {
    galaxy.setScrollProgress(progress);
    overlay.setProgress(progress, locked, lockedSlot);
    nav?.setActive(lockedSlot);
  });

  nav = setupNav(controls);
  nav.setActive(0);

  setupMotionInput((nx, ny) => galaxy.setMouseTarget(nx, ny));

  function loop() {
    galaxy.tick();
    overlay.update();
    overlay.render();
    requestAnimationFrame(loop);
  }
  loop();
} catch (err) {
  showFatalError('page init', err);
}
