// Headless Chrome on Windows still locks the real mouse when a page asks for pointer lock: it takes the owner's cursor
// and holds it, though there's no window to see. The game asks on every desktop click, so every QA tool fakes the lock
// in the page instead: `await page.addInitScript(fakePointerLock)` before the first `goto`.
export function fakePointerLock() {
  let locked = null;
  const lock = (element) => {
    if (locked === element) return;
    locked = element;
    setTimeout(() => document.dispatchEvent(new Event('pointerlockchange')));
  };
  Object.defineProperty(Document.prototype, 'pointerLockElement', {
    configurable: true,
    get: () => locked,
  });
  Element.prototype.requestPointerLock = function () {
    lock(this);
    return Promise.resolve();
  };
  Document.prototype.exitPointerLock = () => lock(null);
  // Esc releases a real lock.
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.code === 'Escape') document.exitPointerLock();
    },
    true,
  );
}
