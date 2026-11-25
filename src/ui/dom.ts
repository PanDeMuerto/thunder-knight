import { t, type StringKey } from '@/content/strings';

/** Tiny helpers for building the DOM UI without a framework. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  parent?: HTMLElement,
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  parent?.append(node);
  return node;
}

/** Sets text only when it changed, so the DOM isn't touched every frame. */
export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

export function toggle(node: HTMLElement, className: string, on: boolean): void {
  if (node.classList.contains(className) !== on) node.classList.toggle(className, on);
}

/** Restarts a CSS animation on an element. */
export function pulse(node: HTMLElement, className: string): void {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

/**
 * A label set once when the UI is built, in the player's language: its key is kept on the node, so `relabel` can
 * redo it after a language change (M11). `aria` labels a button for screen readers instead of its text.
 */
export function label(node: HTMLElement, key: StringKey, aria = false): HTMLElement {
  if (aria) {
    node.dataset.ariaKey = key;
    node.setAttribute('aria-label', t(key));
  } else {
    node.dataset.key = key;
    node.textContent = t(key);
  }
  return node;
}

/** Redoes every `label` under `root` in the current language. */
export function relabel(root: ParentNode): void {
  for (const node of root.querySelectorAll<HTMLElement>('[data-key]')) node.textContent = t(node.dataset.key as StringKey);
  for (const node of root.querySelectorAll<HTMLElement>('[data-aria-key]')) node.setAttribute('aria-label', t(node.dataset.ariaKey as StringKey));
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
