import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

const SENSITIVITY = 0.00055;
const RELEASE_THRESHOLD = 80; // accumulated input needed to break a lock -- higher than before so
                                // a few leftover decaying-momentum events can't trigger it alone
const MAX_STEP_PER_EVENT_FRACTION = 1.0; // clamp: a single wheel event can move at most one full slot-step
// Fixed, short cooldown after locking -- just long enough to eat the
// fastest initial burst of trailing momentum, without waiting for total
// silence (which can legitimately take 1s+ on macOS trackpads and felt
// like the page was stuck). Any momentum that survives past this window
// is still bounded by the crossing-detection clamp below, so it can't
// cause a skip even if it's still technically decaying.
const LOCK_COOLDOWN_MS = 220;
const SETTLE_SILENCE_MS = 100;
const DELTA_NOISE_FLOOR = 4; // real touch hardware essentially never reports
                              // exactly 0 for deltaY even when a finger is just
                              // resting still -- without a real floor, every
                              // tiny jitter gets processed as genuine movement,
                              // which is what caused the flicker under touch // if no further input arrives this long while
                                // unlocked and mid-transition, snap to the
                                // nearest slot rather than leaving the card
                                // visually stranded between two settled states

export interface ScrollEngineControls {
  goToSlot: (index: number) => void;
}

export function setupScrollEngine(
  slotCount: number,
  onProgress: (progress: number, locked: boolean, lockedSlot: number) => void,
  onBoundaryAttempt?: (direction: 'up' | 'down') => void
): ScrollEngineControls {
  const step = 1 / (slotCount - 1);
  const maxStepDelta = step * MAX_STEP_PER_EVENT_FRACTION;

  let progress = 0;
  let locked = true; // start locked on slot 0
  let lockedSlot = 0;
  let releaseAccum = 0;
  let lockedAt = Date.now();
  let lastBoundaryHintAt = 0;
  const BOUNDARY_HINT_COOLDOWN_MS = 700; // avoid re-firing dozens of times during one held gesture
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const state = { v: 0 };

  function commit(p: number) {
    progress = p;
    state.v = p;
    onProgress(p, locked, lockedSlot);
  }

  function tweenTo(target: number) {
    gsap.to(state, {
      v: target,
      duration: 0.55,
      ease: 'power2.out',
      onUpdate: () => {
        progress = state.v;
        onProgress(progress, locked, lockedSlot);
      },
    });
  }

  function scheduleSettle() {
    if (settleTimer) clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      settleTimer = null;
      if (locked || document.body.classList.contains('modal-open')) return;
      const nearest = Math.max(0, Math.min(slotCount - 1, Math.round(progress / step)));
      lockedSlot = nearest;
      locked = true;
      lockedAt = Date.now();
      tweenTo(nearest * step);
    }, SETTLE_SILENCE_MS);
  }

  // First-card intro: start slightly "before" slot 0 in progress-space and
  // tween in, so card 0 plays through the exact same entry animation every
  // other card gets on arrival, rather than appearing pre-settled.
  const introStart = -step * 0.9;
  commit(introStart);
  requestAnimationFrame(() => tweenTo(0));

  Observer.create({
    target: window,
    type: 'wheel,touch,pointer',
    wheelSpeed: 1,
    ignore: '.demo-modal-backdrop',
    onChange: (self) => {
      if (document.body.classList.contains('modal-open')) return;
      const rawDelta = self.deltaY;
      if (Math.abs(rawDelta) < DELTA_NOISE_FLOOR) return;

      if (locked) {
        if (Date.now() - lockedAt < LOCK_COOLDOWN_MS) return; // absorb the initial momentum burst only

        // Trying to go before the first slot or past the last slot -- the
        // only real direction available is the opposite one, so surface a
        // hint rather than silently absorbing the input.
        const atStart = lockedSlot === 0 && rawDelta < 0;
        const atEnd = lockedSlot === slotCount - 1 && rawDelta > 0;
        if ((atStart || atEnd) && onBoundaryAttempt) {
          const now = Date.now();
          if (now - lastBoundaryHintAt > BOUNDARY_HINT_COOLDOWN_MS) {
            lastBoundaryHintAt = now;
            onBoundaryAttempt(atStart ? 'down' : 'up');
          }
        }

        releaseAccum += rawDelta;
        if (Math.abs(releaseAccum) > RELEASE_THRESHOLD) {
          locked = false;
          releaseAccum = 0;
          // Fall through into the movement logic below using this same
          // event's delta -- the swipe/scroll that unlocks the page should
          // also count toward actually moving it, instead of being thrown
          // away and forcing a separate second gesture to start progress.
        } else {
          return;
        }
      }

      // Clamp movement per single event so a fast fling can never jump
      // further than the immediately adjacent slot in one step.
      const delta = gsap.utils.clamp(-maxStepDelta, maxStepDelta, rawDelta * SENSITIVITY);
      const direction = Math.sign(delta);
      if (direction === 0) return;

      const targetSlot = direction > 0 ? Math.floor(progress / step) + 1 : Math.ceil(progress / step) - 1;
      const clampedTargetSlot = Math.max(0, Math.min(slotCount - 1, targetSlot));
      const targetSlotProgress = clampedTargetSlot * step;

      const proposed = progress + delta;
      const crossed = direction > 0 ? proposed >= targetSlotProgress : proposed <= targetSlotProgress;

      if (crossed) {
        // Snap exactly to the slot we just crossed into — discard overshoot
        // rather than let it carry into the next slot's range.
        lockedSlot = clampedTargetSlot;
        locked = true;
        lockedAt = Date.now();
        commit(targetSlotProgress);
        return;
      }

      commit(gsap.utils.clamp(0, 1, proposed));
      scheduleSettle();
    },
  });

  function goToSlot(index: number) {
    const clamped = Math.max(0, Math.min(slotCount - 1, index));
    lockedSlot = clamped;
    locked = true;
    lockedAt = Date.now();
    tweenTo(clamped * step);
  }

  window.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('modal-open')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      e.preventDefault();
      goToSlot(lockedSlot + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      goToSlot(lockedSlot - 1);
    }
  });

  return { goToSlot };
}
