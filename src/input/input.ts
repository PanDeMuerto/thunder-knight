/**
 * Turns touch, mouse and keyboard into one set of intents (GDD §6). On touch, the lower-left area is a floating move
 * stick and the rest of the screen looks; buttons sit on the right above the resting thumb. On desktop the first
 * click captures the mouse for looking (and doesn't fire); where the frame refuses that, dragging looks instead.
 * Adapted from Primal Valley's input, which came from Scrap Express.
 */

export interface ControlButtons {
  grenade: HTMLElement;
  support: HTMLElement;
  gun: HTMLElement;
  pause: HTMLElement;
}

export type Action = 'grenade' | 'support' | 'swap' | 'reload' | 'next';

export interface InputCallbacks {
  /** The very first deliberate action, used to start the platform session and unlock audio. */
  onFirstInput(): void;
  onPause(): void;
  /** Esc with the game stopped, which closes the pause menu. */
  onEscape(): void;
  /** Touch and mouse players get different layouts and prompts. */
  onDeviceChange(touch: boolean): void;
}

const STICK_RADIUS = 58;
const STICK_DEAD_ZONE = 0.12;
/** Landscape: the stick starts anywhere on the left half below this fraction of the height (the HUD keeps the top). */
const STICK_ZONE_TOP = 0.3;
/** Portrait: the stick starts in the lower-left area (GDD §6.3). */
const PORTRAIT_STICK_ZONE_TOP = 0.55;
const PORTRAIT_STICK_ZONE_RIGHT = 0.5;
/** Degrees turned by dragging across the short edge of the screen. */
const TOUCH_LOOK_DEGREES = 160;
const MOUSE_DEGREES_PER_PIXEL = 0.1;
const DRAG_DEGREES_PER_PIXEL = 0.22;
const MAX_MOUSE_DELTA = 200;
const LOCK_WAIT_MS = 400;
const MENU_CONTROLS = 'button, input, select, .card, .panel';

const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

const ACTION_KEYS: Record<string, Action> = {
  KeyG: 'grenade',
  KeyQ: 'grenade',
  KeyE: 'support',
  KeyF: 'support',
  KeyX: 'swap',
  Digit1: 'swap',
  Digit2: 'swap',
  KeyR: 'reload',
  Enter: 'next',
  NumpadEnter: 'next',
  Space: 'next',
};

export class Input {
  /** Strafe, positive is right. */
  moveX = 0;
  /** Forward, positive is ahead. */
  moveY = 0;
  /** Left mouse held (desktop). Touch fires by aim (auto-fire), not by a button. */
  fireHeld = false;
  sensitivity = 1;
  invertY = false;
  leftHanded = false;
  enabled = false;
  /** Set while the game is in portrait, for the touch zones. */
  portrait = false;
  /** False while a panel needs the cursor (the shop): clicks don't capture the mouse. */
  lockAllowed = true;
  stickVisual: { x: number; y: number; dx: number; dy: number } | null = null;
  /** Seconds since the player last looked. */
  sinceLook = 99;
  /** Seconds since the last touch on the look area or mouse movement, for prompts. */
  totalLook = 0;
  /** Counts every deliberate press (key, click, tap), so a cutscene can be skipped by any input. */
  presses = 0;

  private lookX = 0;
  private lookY = 0;
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<Action>();
  private stickPointer: number | null = null;
  private stickOriginX = 0;
  private stickOriginY = 0;
  private stickX = 0;
  private stickY = 0;
  private lookPointer: number | null = null;
  private lastX = 0;
  private lastY = 0;
  private touchMode: boolean;
  private firstInputSent = false;
  private cursorInWindow = false;
  /** Some browsers and embeds refuse to capture the mouse. Looking still works there, by dragging. */
  private lockRefused = false;
  private dragging = false;
  /** True while we let go of the pointer on purpose, so it isn't read as a pause. */
  private releasing = false;
  private lockRequestedAt = -1;

  constructor(
    private readonly surface: HTMLElement,
    private readonly buttons: ControlButtons,
    private readonly callbacks: InputCallbacks,
  ) {
    this.touchMode = window.matchMedia('(pointer: coarse)').matches;
    this.bind();
  }

  get isTouch(): boolean {
    return this.touchMode;
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement !== null;
  }

  /** True while the desktop player can look by moving the mouse (captured), or by dragging (refused). */
  get mouseLookReady(): boolean {
    return this.pointerLocked || this.lockRefused;
  }

  /** Look movement in degrees since the last call. Positive x turns right, positive y looks down. */
  consumeLook(): { x: number; y: number } {
    const look = { x: this.lookX, y: this.invertY ? -this.lookY : this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return look;
  }

  /** True once per press, even if it was released before the next frame. */
  consume(action: Action): boolean {
    const was = this.pressed.has(action);
    this.pressed.delete(action);
    return was;
  }

  /** Clears anything held, for moments when control is taken away. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.resetHeld();
  }

  /** Frees the mouse for a card, a menu or an ad. */
  releasePointer(): void {
    if (!document.pointerLockElement) return;
    this.releasing = true;
    document.exitPointerLock();
  }

  private resetHeld(): void {
    this.keys.clear();
    this.pressed.clear();
    this.moveX = 0;
    this.moveY = 0;
    this.fireHeld = false;
    this.stickPointer = null;
    this.lookPointer = null;
    this.stickVisual = null;
    this.dragging = false;
    this.lookX = 0;
    this.lookY = 0;
    this.stickX = 0;
    this.stickY = 0;
    for (const b of Object.values(this.buttons)) b.classList.remove('is-held');
  }

  private markFirstInput(): void {
    this.presses++;
    if (this.firstInputSent || !this.enabled) return;
    this.firstInputSent = true;
    this.callbacks.onFirstInput();
  }

  private setTouchMode(touch: boolean): void {
    if (this.touchMode === touch) return;
    this.touchMode = touch;
    this.callbacks.onDeviceChange(touch);
  }

  private bind(): void {
    this.surface.addEventListener('pointerdown', (event) => this.onSurfaceDown(event));
    window.addEventListener('pointermove', (event) => this.onPointerMove(event));
    window.addEventListener('pointerup', (event) => this.onPointerUp(event));
    window.addEventListener('pointercancel', (event) => this.onPointerUp(event));
    // A mouse button let go anywhere stops firing, even over the HUD.
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.fireHeld = false;
    });

    this.bindPress(this.buttons.grenade, 'grenade');
    this.bindPress(this.buttons.support, 'support');
    this.bindPress(this.buttons.gun, 'swap');
    this.buttons.pause.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      event.preventDefault();
    });
    this.buttons.pause.addEventListener('click', (event) => {
      event.stopPropagation();
      this.callbacks.onPause();
    });

    window.addEventListener('keydown', (event) => this.onKey(event, true));
    window.addEventListener('keyup', (event) => this.onKey(event, false));
    window.addEventListener(
      'wheel',
      (event) => {
        // The wheel would scroll the host page; in play it swaps guns.
        event.preventDefault();
        if (this.enabled && Math.abs(event.deltaY) > 2) this.pressed.add('swap');
      },
      { passive: false },
    );
    window.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('mousemove', (event) => this.onMouseMove(event));
    window.addEventListener('blur', () => this.resetHeld());
    document.addEventListener('visibilitychange', () => this.resetHeld());
    document.addEventListener('mouseleave', () => (this.cursorInWindow = false));

    document.addEventListener('pointerlockerror', () => (this.lockRefused = true));
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) {
        this.lockRefused = false;
        return;
      }
      this.fireHeld = false;
      // Esc releases the pointer before any key event arrives, so this is the pause signal.
      if (!this.releasing && this.enabled && !this.touchMode) this.callbacks.onPause();
      this.releasing = false;
    });
  }

  /** A touch button: one press per tap, with a pressed look while the finger is down. */
  private bindPress(element: HTMLElement, action: Action): void {
    element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!this.enabled) return;
      this.setTouchMode(event.pointerType !== 'mouse');
      element.setPointerCapture(event.pointerId);
      element.classList.add('is-held');
      this.markFirstInput();
      this.pressed.add(action);
    });
    const end = (): void => element.classList.remove('is-held');
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
    element.addEventListener('lostpointercapture', end);
  }

  private inStickZone(x: number, y: number): boolean {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.portrait) {
      const right = w * PORTRAIT_STICK_ZONE_RIGHT;
      const side = this.leftHanded ? x > w - right : x < right;
      return side && y > h * PORTRAIT_STICK_ZONE_TOP;
    }
    const side = this.leftHanded ? x > w / 2 : x < w / 2;
    return side && y > h * STICK_ZONE_TOP;
  }

  private onSurfaceDown(event: PointerEvent): void {
    if (!this.enabled) return;
    if (event.pointerType === 'mouse') {
      this.setTouchMode(false);
      // Some embeds never answer a lock request. Treat a long wait as a refusal, so dragging looks.
      if (!this.pointerLocked && this.lockRequestedAt >= 0 && performance.now() - this.lockRequestedAt > LOCK_WAIT_MS) {
        this.lockRefused = true;
      }
      const wasReady = this.mouseLookReady;
      if (!this.lockAllowed) {
        this.markFirstInput();
        return;
      }
      this.requestPointerLock();
      this.markFirstInput();
      // The click that captures the mouse doesn't also fire.
      if (wasReady && event.button === 0) this.fireHeld = true;
      this.dragging = this.lockRefused;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      return;
    }

    this.setTouchMode(true);
    this.markFirstInput();
    if (this.inStickZone(event.clientX, event.clientY) && this.stickPointer === null) {
      this.stickPointer = event.pointerId;
      this.stickOriginX = event.clientX;
      this.stickOriginY = event.clientY;
      this.stickX = 0;
      this.stickY = 0;
      this.stickVisual = { x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
    } else if (this.lookPointer === null) {
      this.lookPointer = event.pointerId;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    }
  }

  private requestPointerLock(): void {
    if (document.pointerLockElement) return;
    if (this.lockRequestedAt < 0) this.lockRequestedAt = performance.now();
    try {
      const result = this.surface.requestPointerLock() as unknown as Promise<void> | undefined;
      result?.catch?.(() => (this.lockRefused = true));
    } catch {
      this.lockRefused = true;
    }
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.enabled) return;
    if (event.pointerId === this.stickPointer) {
      let dx = event.clientX - this.stickOriginX;
      let dy = event.clientY - this.stickOriginY;
      const length = Math.hypot(dx, dy);
      // The stick follows a thumb that drifts past its edge, so it never feels stuck.
      if (length > STICK_RADIUS * 1.4) {
        const pull = (length - STICK_RADIUS * 1.4) / length;
        this.stickOriginX += dx * pull;
        this.stickOriginY += dy * pull;
        dx = event.clientX - this.stickOriginX;
        dy = event.clientY - this.stickOriginY;
      }
      const l2 = Math.hypot(dx, dy);
      const clamped = Math.min(l2, STICK_RADIUS);
      const scale = l2 > 0 ? clamped / l2 : 0;
      this.stickX = (dx * scale) / STICK_RADIUS;
      this.stickY = (dy * scale) / STICK_RADIUS;
      this.stickVisual = { x: this.stickOriginX, y: this.stickOriginY, dx: dx * scale, dy: dy * scale };
      return;
    }
    if (event.pointerId === this.lookPointer) {
      const shortEdge = Math.min(window.innerWidth, window.innerHeight);
      const scale = (TOUCH_LOOK_DEGREES / shortEdge) * this.sensitivity;
      const dx = (event.clientX - this.lastX) * scale;
      const dy = (event.clientY - this.lastY) * scale;
      this.lookX += dx;
      this.lookY += dy;
      this.totalLook += Math.hypot(dx, dy);
      this.lastX = event.clientX;
      this.lastY = event.clientY;
      this.sinceLook = 0;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (event.pointerId === this.stickPointer) {
      this.stickPointer = null;
      this.stickVisual = null;
      this.stickX = 0;
      this.stickY = 0;
    }
    if (event.pointerId === this.lookPointer) this.lookPointer = null;
    if (event.pointerType === 'mouse') this.dragging = false;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled || this.touchMode) return;
    // The cursor arriving from outside the window reports a jump, not a real movement.
    if (!this.cursorInWindow) {
      this.cursorInWindow = true;
      return;
    }
    let scale = 0;
    if (document.pointerLockElement) scale = MOUSE_DEGREES_PER_PIXEL;
    else if (this.lockRefused && this.dragging) scale = DRAG_DEGREES_PER_PIXEL;
    if (scale === 0) return;
    scale *= this.sensitivity;
    const dx = clampDelta(event.movementX) * scale;
    const dy = clampDelta(event.movementY) * scale;
    this.lookX += dx;
    this.lookY += dy;
    this.totalLook += Math.hypot(dx, dy);
    if (event.movementX !== 0 || event.movementY !== 0) this.sinceLook = 0;
  }

  private onKey(event: KeyboardEvent, down: boolean): void {
    const { code } = event;
    // Arrows and Space would scroll the host page. In a menu a focused control keeps them.
    const scrolls = code in MOVE_KEYS || code === 'Space';
    const inControl = event.target instanceof Element && event.target.closest(MENU_CONTROLS) !== null;
    const handled = this.enabled ? scrolls || code === 'Tab' : scrolls && !inControl;
    if (handled) event.preventDefault();
    if (event.repeat) return;
    if (!this.enabled) {
      if (down && code === 'Escape') this.callbacks.onEscape();
      return;
    }
    if (down) {
      this.setTouchMode(false);
      this.markFirstInput();
      this.keys.add(code);
      if (code === 'Escape' || code === 'KeyP') this.callbacks.onPause();
      const action = ACTION_KEYS[code];
      if (action) this.pressed.add(action);
    } else {
      this.keys.delete(code);
    }
  }

  /** Call once per frame before reading movement. */
  update(dt: number): void {
    this.sinceLook += dt;
    let keyX = 0;
    let keyY = 0;
    for (const code of this.keys) {
      const move = MOVE_KEYS[code];
      if (move) {
        keyX += move[0];
        keyY += move[1];
      }
    }
    const stickLength = Math.hypot(this.stickX, this.stickY);
    if (stickLength > STICK_DEAD_ZONE) {
      // Rescale past the dead zone so small pushes still walk slowly.
      const k = (Math.min(1, stickLength) - STICK_DEAD_ZONE) / (1 - STICK_DEAD_ZONE) / stickLength;
      this.moveX = this.stickX * k;
      this.moveY = -this.stickY * k;
    } else {
      const l = Math.hypot(keyX, keyY);
      this.moveX = l > 0 ? keyX / l : 0;
      this.moveY = l > 0 ? keyY / l : 0;
    }
  }
}

function clampDelta(value: number): number {
  return Math.max(-MAX_MOUSE_DELTA, Math.min(MAX_MOUSE_DELTA, value));
}
