// The sound of a recorded clip (M8). The recorder steps exact frames, so the game's own audio can't be captured live;
// instead the page logs every sound it plays (name, frame, gain, pitch) and every music and ambience change, and this
// mixes them offline the way GameAudio would: the same clips, volumes, per-second caps and buses.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const RATE = 44100;

/** Page code: wraps `g.audio` so every sound is logged against `window.__recFrame`. Call before the clip's setup. */
export const SOUND_LOG = `
  window.__installSoundLog = async (g) => {
    const mix = await import('/src/content/audio.ts');
    window.__mix = { MIX: mix.MIX, YELPS: mix.YELPS, BUSES: mix.BUSES, AMBIENCE: mix.AMBIENCE };
    window.__sounds = [];
    window.__beds = [];
    window.__recFrame = 0;
    const a = g.audio;
    const play = a.play.bind(a);
    a.play = (name, o = {}) => { window.__sounds.push({ f: window.__recFrame, name, gain: o.gain ?? 1, rate: o.rate ?? 1 }); play(name, o); };
    a.yelp = (gain = 1) => {
      const { names, rate } = mix.YELPS;
      window.__sounds.push({ f: window.__recFrame, name: names[Math.floor(Math.random() * names.length)], gain,
        rate: rate.low + Math.random() * (rate.high - rate.low), cap: 'yelp' });
    };
    const bed = (kind) => (value) => {
      const last = [...window.__beds].reverse().find((b) => b.kind === kind);
      if (!last || last.value !== value) window.__beds.push({ f: window.__recFrame, kind, value });
    };
    const setMusic = a.setMusic.bind(a);
    const music = bed('music');
    a.setMusic = (name) => { music(name); setMusic(name); };
    const setAmbience = a.setAmbience.bind(a);
    const ambience = bed('ambience');
    a.setAmbience = (on) => { ambience(on); setAmbience(on); };
  };
  /** After the setup: forget its sounds, keep the beds playing from frame 0. */
  window.__startSoundLog = () => {
    window.__sounds = [];
    const now = {};
    for (const b of window.__beds) now[b.kind] = b.value;
    window.__beds = Object.entries(now).map(([kind, value]) => ({ f: 0, kind, value }));
  };
`;

function decode(ffmpeg, file, channels) {
  const buf = execFileSync(ffmpeg, ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', String(channels), '-ar', String(RATE), '-'], {
    maxBuffer: 1 << 30,
  });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
}

/** True when a capped sound may start at time `t` (the game's `GameAudio.allow`). */
function allower() {
  const starts = new Map();
  return (key, perSecond, t) => {
    if (!perSecond) return true;
    const window = Math.max(1, 1 / perSecond);
    const limit = Math.max(1, Math.floor(perSecond * window));
    const list = (starts.get(key) ?? []).filter((s) => t - s <= window);
    if (list.length >= limit) return false;
    list.push(t);
    starts.set(key, list);
    return true;
  };
}

/**
 * Mixes the logged sounds and beds into `wav` (stereo, 16-bit). `log`: { sounds, beds, mix } from the page; `fps`:
 * the clip's frame rate; `seconds`: its length; `audioDir`: public/assets/audio/.
 */
export function mixdown({ ffmpeg, log, fps, seconds, audioDir, wav }) {
  const { MIX, BUSES, AMBIENCE } = log.mix;
  const length = Math.ceil(seconds * RATE);
  const out = new Float32Array(length * 2);
  const cache = new Map();
  const pcm = (name, channels) => {
    const key = `${name}/${channels}`;
    if (!cache.has(key)) cache.set(key, decode(ffmpeg, `${audioDir}${name}.mp3`, channels));
    return cache.get(key);
  };
  // Effects: mono, pitched by playback rate (speed and pitch together, like AudioBufferSourceNode).
  const allow = allower();
  let played = 0;
  for (const s of log.sounds.sort((a, b) => a.f - b.f)) {
    const t = s.f / fps;
    const per = s.cap === 'yelp' ? log.mix.YELPS.perSecond : MIX[s.name]?.perSecond;
    if (!allow(s.cap ?? s.name, per, t)) continue;
    const src = pcm(s.name, 1);
    const volume = (MIX[s.name]?.volume ?? 1) * s.gain * BUSES.sfx * BUSES.master;
    const start = Math.floor(t * RATE);
    const n = Math.floor(src.length / s.rate);
    for (let j = 0; j < n && start + j < length; j++) {
      const x = j * s.rate;
      const i = Math.floor(x);
      const v = (src[i] + ((src[i + 1] ?? 0) - src[i]) * (x - i)) * volume;
      out[(start + j) * 2] += v;
      out[(start + j) * 2 + 1] += v;
    }
    played++;
  }
  // Beds: each music or ambience span loops its clip, with short fades at both ends.
  for (const kind of ['music', 'ambience']) {
    const spans = log.beds.filter((b) => b.kind === kind);
    spans.forEach((b, k) => {
      const name = kind === 'music' ? b.value : b.value ? AMBIENCE : null;
      if (!name) return;
      const src = pcm(name, 2);
      const from = Math.floor((b.f / fps) * RATE);
      const to = k + 1 < spans.length ? Math.floor((spans[k + 1].f / fps) * RATE) : length;
      const level = (kind === 'music' ? BUSES.music : BUSES.ambience) * BUSES.master;
      const fade = Math.floor(BUSES.fade * 0.5 * RATE);
      const frames = src.length / 2;
      for (let j = 0; from + j < to; j++) {
        const g = level * Math.min(1, j / fade, (to - from - j) / fade);
        const i = (j % frames) * 2;
        out[(from + j) * 2] += src[i] * g;
        out[(from + j) * 2 + 1] += src[i + 1] * g;
      }
    });
  }
  // A soft limit, like the browser's output stage would clip.
  const data = Buffer.alloc(44 + length * 4);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + length * 4, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(2, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 4, 28);
  data.writeUInt16LE(4, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(length * 4, 40);
  for (let i = 0; i < length * 2; i++) data.writeInt16LE(Math.round(Math.tanh(out[i]) * 32000), 44 + i * 2);
  writeFileSync(wav, data);
  return { played, logged: log.sounds.length };
}
