import * as THREE from 'three';

/**
 * A copy of a palette texture with one band of hues (degrees, `from` to `to`) turned to another hue, keeping each
 * texel's saturation and lightness unless `look` scales them (a dark green cloth becoming a bright orange hoodie). The
 * palettes are tiny, so this is cheap at load.
 */
export function recolour(texture: THREE.Texture, from: number, to: number, hue: number, look: { saturation?: number; light?: number } = {}): THREE.Texture {
  const image = texture.image as CanvasImageSource & { width: number; height: number };
  if (!image?.width || typeof document === 'undefined') return texture;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return texture;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const c = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < data.data.length; i += 4) {
    c.setRGB(data.data[i]! / 255, data.data[i + 1]! / 255, data.data[i + 2]! / 255, THREE.LinearSRGBColorSpace);
    c.getHSL(hsl, THREE.LinearSRGBColorSpace);
    const h = hsl.h * 360;
    if (hsl.s < 0.25 || h < from || h > to) continue;
    const s = Math.min(1, hsl.s * (look.saturation ?? 0.9));
    const l = Math.min(0.75, hsl.l * (look.light ?? 1));
    c.setHSL(hue / 360, s, l, THREE.LinearSRGBColorSpace);
    data.data[i] = Math.round(c.r * 255);
    data.data[i + 1] = Math.round(c.g * 255);
    data.data[i + 2] = Math.round(c.b * 255);
  }
  ctx.putImageData(data, 0, 0);
  const out = new THREE.CanvasTexture(canvas);
  out.flipY = texture.flipY;
  out.colorSpace = texture.colorSpace;
  out.magFilter = texture.magFilter;
  out.minFilter = texture.minFilter;
  out.wrapS = texture.wrapS;
  out.wrapT = texture.wrapT;
  return out;
}
