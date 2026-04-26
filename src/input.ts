export type InputAction =
  | "skill1"
  | "skill2"
  | "skill3"
  | "skill4"
  | "skill5"
  | "target_next"
  | "deselect"
  | "attack_held";

export interface InputState {
  /** WASD or virtual joystick vector in screen-XY space (y is forward) */
  moveX: number;
  moveY: number;
  /** intensity 0..1 used for joystick analog */
  moveIntensity: number;
  /** zoom delta accumulated since last read */
  zoomDelta: number;
  /** rotate yaw delta in radians */
  rotateDelta: number;
  /** mouse held to move toward cursor */
  pointerHeld: boolean;
  /** continuous pinch zoom factor (relative) */
  pinchZoom: number;
}

export interface InputController {
  state: InputState;
  on(action: InputAction, fn: () => void): void;
  setOnTapWorld(fn: (clientX: number, clientY: number) => void): void;
  setOnLongPress(fn: (clientX: number, clientY: number) => void): void;
  /** call once per frame to drain delta accumulators */
  consume(): void;
}

interface JoystickHandle {
  el: HTMLDivElement;
  knob: HTMLDivElement;
}

export function createInputController(opts: {
  joystick: JoystickHandle | null;
  canvas: HTMLCanvasElement;
}): InputController {
  const state: InputState = {
    moveX: 0,
    moveY: 0,
    moveIntensity: 0,
    zoomDelta: 0,
    rotateDelta: 0,
    pointerHeld: false,
    pinchZoom: 0,
  };
  const handlers: Partial<Record<InputAction, () => void>> = {};
  let onTapWorld: (x: number, y: number) => void = () => {};
  let onLongPress: (x: number, y: number) => void = () => {};
  const keys = new Set<string>();

  // ---- keyboard ----
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    keys.add(k);
    if (e.key >= "1" && e.key <= "5") {
      const action = `skill${e.key}` as InputAction;
      handlers[action]?.();
      e.preventDefault();
    } else if (k === "tab") {
      handlers.target_next?.();
      e.preventDefault();
    } else if (k === "escape") {
      handlers.deselect?.();
    } else if (k === "q") {
      state.rotateDelta -= 0.6;
    } else if (k === "e") {
      state.rotateDelta += 0.6;
    } else if (k === " ") {
      // space = primary attack
      handlers.attack_held?.();
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    keys.delete(e.key.toLowerCase());
  });
  window.addEventListener("blur", () => keys.clear());

  // ---- mouse ----
  opts.canvas.addEventListener("wheel", (e) => {
    state.zoomDelta += Math.sign(e.deltaY) * 0.5;
    e.preventDefault();
  }, { passive: false });

  let mouseHeld = false;
  opts.canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button === 0) mouseHeld = true;
  });
  window.addEventListener("pointerup", (e) => {
    if (e.pointerType === "mouse" && e.button === 0) mouseHeld = false;
  });
  window.addEventListener("pointercancel", () => {
    mouseHeld = false;
  });

  // ---- virtual joystick ----
  let joyActive = false;
  let joyId = -1;
  let joyCenter = { x: 0, y: 0 };
  const JOY_RADIUS = 60;

  if (opts.joystick) {
    const { el, knob } = opts.joystick;
    el.addEventListener("pointerdown", (e) => {
      joyActive = true;
      joyId = e.pointerId;
      const r = el.getBoundingClientRect();
      joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      el.setPointerCapture(e.pointerId);
      updateJoy(e.clientX, e.clientY);
      e.preventDefault();
    });
    el.addEventListener("pointermove", (e) => {
      if (!joyActive || e.pointerId !== joyId) return;
      updateJoy(e.clientX, e.clientY);
    });
    const end = (e: PointerEvent) => {
      if (!joyActive || e.pointerId !== joyId) return;
      joyActive = false;
      joyId = -1;
      knob.style.transform = "translate(-50%, -50%)";
      state.moveX = 0;
      state.moveY = 0;
      state.moveIntensity = 0;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);

    function updateJoy(cx: number, cy: number) {
      const dx = cx - joyCenter.x;
      const dy = cy - joyCenter.y;
      const len = Math.hypot(dx, dy);
      const clamp = Math.min(len, JOY_RADIUS);
      const nx = (dx / (len || 1)) * clamp;
      const ny = (dy / (len || 1)) * clamp;
      knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
      const intensity = clamp / JOY_RADIUS;
      state.moveX = (dx / (len || 1)) * intensity;
      state.moveY = (dy / (len || 1)) * intensity;
      state.moveIntensity = intensity;
    }
  }

  // ---- touch & pinch on canvas ----
  const touches = new Map<number, { x: number; y: number; downTime: number; startX: number; startY: number }>();
  let lastPinchDist = 0;
  let pinchActive = false;
  let suppressTap = false;

  opts.canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    touches.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      downTime: performance.now(),
      startX: e.clientX,
      startY: e.clientY,
    });
    if (touches.size === 2) {
      const arr = [...touches.values()];
      lastPinchDist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      pinchActive = true;
      suppressTap = true;
    }
  });

  opts.canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch") return;
    const t = touches.get(e.pointerId);
    if (!t) return;
    t.x = e.clientX;
    t.y = e.clientY;
    if (pinchActive && touches.size === 2) {
      const arr = [...touches.values()];
      const d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      const delta = (lastPinchDist - d) * 0.04;
      state.zoomDelta += delta;
      lastPinchDist = d;
    }
  });

  const endTouch = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    const t = touches.get(e.pointerId);
    touches.delete(e.pointerId);
    if (touches.size < 2) {
      pinchActive = false;
    }
    if (!t) return;
    const dt = performance.now() - t.downTime;
    const dx = t.x - t.startX;
    const dy = t.y - t.startY;
    const moved = Math.hypot(dx, dy);
    if (!suppressTap && touches.size === 0 && dt < 350 && moved < 12) {
      onTapWorld(t.x, t.y);
    }
    if (touches.size === 0) suppressTap = false;
  };
  opts.canvas.addEventListener("pointerup", endTouch);
  opts.canvas.addEventListener("pointercancel", endTouch);

  return {
    state,
    on(action, fn) {
      handlers[action] = fn;
    },
    setOnTapWorld(fn) {
      onTapWorld = fn;
    },
    setOnLongPress(fn) {
      onLongPress = fn;
    },
    consume() {
      // poll keyboard state
      let kx = 0;
      let ky = 0;
      if (keys.has("w") || keys.has("arrowup")) ky -= 1;
      if (keys.has("s") || keys.has("arrowdown")) ky += 1;
      if (keys.has("a") || keys.has("arrowleft")) kx -= 1;
      if (keys.has("d") || keys.has("arrowright")) kx += 1;
      const klen = Math.hypot(kx, ky);
      if (klen > 0) {
        // override only if joystick not active
        if (!joyActive) {
          state.moveX = kx / klen;
          state.moveY = ky / klen;
          state.moveIntensity = 1;
        }
      } else if (!joyActive) {
        state.moveX = 0;
        state.moveY = 0;
        state.moveIntensity = 0;
      }
      state.pointerHeld = mouseHeld;
      // zoom and rotate deltas drained externally; reset after consume call
      void onLongPress;
    },
  };
}
