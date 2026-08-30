export type MotionCallback = (nx: number, ny: number) => void;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const MOTION_PROMPT_SEEN_KEY = 'motionPromptSeen';

function setupGyro(callback: MotionCallback) {
  // Calibrate neutral position off the first reading rather than assuming
  // a fixed "upright" angle — phone-holding posture varies enough between
  // people/devices that a hardcoded baseline would feel off-center for
  // most users.
  let baseline: { beta: number; gamma: number } | null = null;

  function handleOrientation(e: DeviceOrientationEvent) {
    const gamma = e.gamma ?? 0; // left-right tilt
    const beta = e.beta ?? 0;   // front-back tilt

    if (!baseline) {
      baseline = { beta, gamma };
      return;
    }

    const nx = clamp((gamma - baseline.gamma) / 30, -1, 1);
    const ny = clamp((beta - baseline.beta) / 30, -1, 1);
    callback(nx, ny);
  }

  const DOE = (window as any).DeviceOrientationEvent;
  const needsExplicitPermission = DOE && typeof DOE.requestPermission === 'function';

  if (needsExplicitPermission) {
    // iOS 13+ -- must be requested from within a user gesture handler.
    // iOS never remembers a granted permission across page loads (a fresh
    // tap is required every visit no matter what), so instead of nagging
    // every single time regardless of outcome, we only ever show this
    // prompt once per browser -- if it was already seen (granted, denied,
    // or simply ignored), stay quiet on later visits rather than asking
    // again.
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(MOTION_PROMPT_SEEN_KEY) === '1';
    } catch {
      // localStorage can throw in some private-browsing modes -- treat as
      // not-yet-seen rather than breaking the whole flow.
    }
    if (alreadySeen) return;

    const btn = document.getElementById('enable-motion-btn');
    if (!btn) return;
    btn.style.display = 'block';
    btn.addEventListener(
      'click',
      () => {
        try {
          localStorage.setItem(MOTION_PROMPT_SEEN_KEY, '1');
        } catch {
          // ignore
        }
        DOE.requestPermission()
          .then((state: string) => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(() => {});
        btn.style.display = 'none';
      },
      { once: true }
    );
  } else if (typeof window.DeviceOrientationEvent !== 'undefined') {
    // Android and other browsers that don't gate behind a permission prompt.
    window.addEventListener('deviceorientation', handleOrientation);
  }
}

function setupMouse(callback: MotionCallback) {
  window.addEventListener('mousemove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    callback(nx, ny);
  });
}

export function setupMotionInput(callback: MotionCallback) {
  if (isTouchDevice()) {
    setupGyro(callback);
  } else {
    setupMouse(callback);
  }
}
