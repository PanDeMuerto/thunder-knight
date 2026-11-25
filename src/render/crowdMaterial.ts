import * as THREE from 'three';
import { CROWD } from '@/content/soldiers';
import { CLIP_FPS, type Archetype } from '@/crowd/soldierKit';

/** The crowd's clock in seconds, shared by every crowd material (clips are timed against it). */
export const crowdTime = { value: 0 };

/**
 * Per-instance attributes the crowd shader reads (set by `crowd/crowdRender.ts`):
 * - `iClip` and `iPrev`: the clip playing and the one before it, as (first row, frames — negative plays once and
 *   holds —, start time, rate)
 * - `iLook`: (when the blend from `iPrev` began, hit flash 0–1, sink in model units, part mask)
 * - `iCloth`: the soldier's cloth colour (linear)
 * - `iSteel`: what the grey steel is multiplied by (linear)
 */
export const INSTANCE_ATTRIBUTES = { iClip: 4, iPrev: 4, iLook: 4, iCloth: 3, iSteel: 3 } as const;

const VERTEX_HEAD = /* glsl */ `
attribute vec4 skinIndex;
attribute vec4 skinWeight;
attribute float aPart;
attribute vec4 iClip;
attribute vec4 iPrev;
attribute vec4 iLook;
attribute vec3 iCloth;
attribute vec3 iSteel;
uniform highp sampler2D uBones;
uniform float uTime;
uniform float uBlendTime;
varying float vFlash;
varying vec3 vCloth;
varying vec3 vSteel;
mat4 crowdBone(int frame, float index) {
  int x = int(index + 0.5) * 3;
  vec4 a = texelFetch(uBones, ivec2(x, frame), 0);
  vec4 b = texelFetch(uBones, ivec2(x + 1, frame), 0);
  vec4 c = texelFetch(uBones, ivec2(x + 2, frame), 0);
  return transpose(mat4(a, b, c, vec4(0.0, 0.0, 0.0, 1.0)));
}
// The clip's position in frames (from 0): looping clips wrap, one-shots hold their last frame.
float crowdLocal(vec4 clip) {
  float count = abs(clip.y);
  float local = max(0.0, uTime - clip.z) * clip.w * ${CLIP_FPS.toFixed(1)};
  return clip.y > 0.0 ? mod(local, count) : min(local, count - 1.0);
}
int crowdFrame(vec4 clip) {
  return int(clip.x + floor(crowdLocal(clip)));
}
mat4 crowdSkin(int frame) {
  mat4 m = crowdBone(frame, skinIndex.x) * skinWeight.x;
  if (skinWeight.y > 0.0) m += crowdBone(frame, skinIndex.y) * skinWeight.y;
  if (skinWeight.z > 0.0) m += crowdBone(frame, skinIndex.z) * skinWeight.z;
  if (skinWeight.w > 0.0) m += crowdBone(frame, skinIndex.w) * skinWeight.w;
  return m;
}
// The playing clip, between its two nearest frames, so slowed clips move smoothly (feet don't stutter or slide).
mat4 crowdClip(vec4 clip) {
  float count = abs(clip.y);
  float f = crowdLocal(clip);
  float base = floor(f);
  float next = clip.y > 0.0 ? mod(base + 1.0, count) : min(base + 1.0, count - 1.0);
  float k = f - base;
  mat4 a = crowdSkin(int(clip.x + base));
  if (k < 0.01) return a;
  return a * (1.0 - k) + crowdSkin(int(clip.x + next)) * k;
}
mat4 crowdMatrix() {
  mat4 m = crowdClip(iClip);
  float w = clamp((uTime - iLook.x) / uBlendTime, 0.0, 1.0);
  if (w < 1.0) m = m * w + crowdSkin(crowdFrame(iPrev)) * (1.0 - w);
  return m;
}
`;

/** Skins the vertex, sinks it, and collapses parts this soldier doesn't carry (zero-area triangles draw nothing). */
const VERTEX_BODY = /* glsl */ `
transformed = (crowdM * vec4(transformed, 1.0)).xyz;
transformed.y -= iLook.z;
if (aPart > 0.5 && mod(floor(iLook.w / exp2(aPart)), 2.0) < 0.5) transformed = vec3(0.0);
`;

function patchVertex(shader: THREE.WebGLProgramParametersWithUniforms, withNormals: boolean): void {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`);
  if (withNormals) {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
mat4 crowdM = crowdMatrix();
objectNormal = mat3(crowdM) * objectNormal;
vFlash = iLook.y;
vCloth = iCloth;
vSteel = iSteel;`,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
  } else {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nmat4 crowdM = crowdMatrix();\n${VERTEX_BODY}`,
    );
  }
}

/**
 * The crowd's look (tech design §5.6): Lambert with the model's palette texture, skinned per instance from the bone
 * texture. The cloth is repainted per soldier: palette texels close in hue to the model's cloth colour take the
 * soldier's colour at the same brightness, so one model serves the Baron's red, Larkmoor's blue and peasant brown.
 * A hit flashes the soldier white. Returns the colour material and the matching shadow material.
 */
export function crowdMaterials(archetype: Archetype): { material: THREE.MeshLambertMaterial; depth: THREE.MeshDepthMaterial } {
  const uniforms = {
    uBones: { value: archetype.bones },
    uTime: crowdTime,
    uBlendTime: { value: CROWD.blend },
    uCloth: { value: archetype.cloth.clone() },
  };
  const material = new THREE.MeshLambertMaterial({ map: archetype.map });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    patchVertex(shader, true);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vFlash;\nvarying vec3 vCloth;\nvarying vec3 vSteel;\nuniform vec3 uCloth;',
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  const vec3 LUMA = vec3(0.299, 0.587, 0.114);
  vec3 c = diffuseColor.rgb;
  float l = dot(c, LUMA);
  vec3 chroma = c - l;
  float sat = length(chroma);
  float lc = max(dot(uCloth, LUMA), 0.02);
  vec3 clothChroma = uCloth - lc;
  float clothSat = length(clothChroma);
  float match = sat > 0.005 ? dot(chroma / sat, clothChroma / clothSat) : 0.0;
  // Saturation relative to brightness, so the dark end of a gradient cell counts as much as its bright end.
  float rel = sat / max(l, 0.02);
  float clothRel = clothSat / lc;
  // Close in hue, and well saturated for its brightness (so faintly tinted steel stays steel).
  float m = smoothstep(0.9, 0.97, match) * smoothstep(clothRel * 0.35, clothRel * 0.6, rel);
  // The soldier's colour at the texel's brightness relative to the palette's cloth.
  vec3 painted = clamp(vCloth * (l / lc), 0.0, 1.0);
  // Grey steel (unsaturated, not near black) takes the army's tint.
  float steel = (1.0 - smoothstep(0.15, 0.32, rel)) * smoothstep(0.02, 0.08, l) * (1.0 - m);
  diffuseColor.rgb = mix(c, painted, m) * mix(vec3(1.0), vSteel, steel);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.96, 0.88), vFlash * 0.75);
}`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vFlash * 0.3;');
  };
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    patchVertex(shader, false);
  };
  return { material, depth };
}
