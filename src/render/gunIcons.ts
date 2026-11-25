import * as THREE from 'three';

/** Icon size in pixels (2:1, guns are long); the HUD scales it down. */
const WIDTH = 192;
const HEIGHT = 96;

/**
 * Side views of the gun models as white silhouettes on transparent PNGs (data URLs), rendered once at load (GDD §18.2:
 * gun icons rendered from the models). The UI paints them in its own colour through a CSS mask (`gunArt`).
 * Each gun points right with its top up (its +X barrel, +Y top), filling the icon with a small margin.
 */
export function renderGunIcons<K extends string>(renderer: THREE.WebGLRenderer, guns: ReadonlyMap<K, THREE.Object3D>): Map<K, string> {
  const out = new Map<K, string>();
  const target = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { samples: 4 });
  const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  const before = { target: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha(), tone: renderer.toneMapping };
  if (!ctx) return out;
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  for (const [id, node] of guns) {
    const gun = node.clone(true);
    gun.position.set(0, 0, 0);
    gun.quaternion.identity();
    gun.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.material = white;
    });
    scene.clear();
    scene.add(gun);
    gun.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gun, true);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Fit the side view into the icon with an 8% margin, keeping the gun's proportions.
    const half = Math.max(size.x / 2 / (WIDTH / HEIGHT), size.y / 2) * 1.08;
    camera.left = -half * (WIDTH / HEIGHT);
    camera.right = half * (WIDTH / HEIGHT);
    camera.top = half;
    camera.bottom = -half;
    camera.position.set(c.x, c.y, box.max.z + size.z + 1);
    camera.far = size.z * 3 + 10;
    camera.lookAt(c.x, c.y, c.z);
    camera.updateProjectionMatrix();
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
    // Rendering resolves the multisampled target, so its pixels read back smooth.
    renderer.readRenderTargetPixels(target, 0, 0, WIDTH, HEIGHT, pixels);
    const image = ctx.createImageData(WIDTH, HEIGHT);
    // WebGL rows run bottom-up.
    for (let y = 0; y < HEIGHT; y++) image.data.set(pixels.subarray((HEIGHT - 1 - y) * WIDTH * 4, (HEIGHT - y) * WIDTH * 4), y * WIDTH * 4);
    ctx.putImageData(image, 0, 0);
    out.set(id, canvas.toDataURL('image/png'));
  }
  renderer.setRenderTarget(before.target);
  renderer.setClearColor(before.color, before.alpha);
  renderer.toneMapping = before.tone;
  target.dispose();
  white.dispose();
  return out;
}
