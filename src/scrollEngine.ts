import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

const SENSITIVITY = 0.00055;
const RELEASE_THRESHOLD = 130; // accumulated input needed to break a lock -- higher than before so
                                // a few leftover decaying-momentum events can't trigger it alone
const MAX_STEP_PER_EVENT_FRACTION = 1.0; // clamp: a single wheel event can move at most one full slot-step
// Fixed, short cooldown after locking -- just long enough to eat the
// fastest initial burst of trailing momentum, without waiting for total
// silence (which can legitimately take 1s+ on macOS trackpads and felt
// like the page was stuck). Any momentum that survives past this window
// is still bounded by the crossing-detection clamp below, so it can't
// cause a skip even if it's still technically decaying.
const LOCK_COOLDOWN_MS = 320;

export function setupScrollEngine(
  slotCount: number,
  onProgress: (progress: number, locked: boolean, lockedSlot: number) => void
) {
  const step = 1 / (slotCount - 1);
  const maxStepDelta = step * MAX_STEP_PER_EVENT_FRACTION;

  let progress = 0;
  let locked = true; // start locked on slot 0
  let lockedSlot = 0;
  let releaseAccum = 0;
  let lockedAt = Date.now();

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
    onChange: (self) => {
      const rawDelta = self.deltaY;

      if (locked) {
        if (Date.now() - lockedAt < LOCK_COOLDOWN_MS) return; // absorb the initial momentum burst only

        releaseAccum += rawDelta;
        if (Math.abs(releaseAccum) > RELEASE_THRESHOLD) {
          locked = false;
          releaseAccum = 0;
        }
        return;
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
    },
  });
}
