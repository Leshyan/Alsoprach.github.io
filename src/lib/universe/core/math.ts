export const TAU = Math.PI * 2;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const easeInOutCubic = (t: number) => {
  const value = clamp01(t);
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
};

export const easeOutExpo = (t: number) => {
  const value = clamp01(t);
  return value >= 1 ? 1 : 1 - Math.pow(2, -10 * value);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const hashString = (value: string) => {
  let hash = 2166136261 >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export type RandomSource = () => number;

export const createSeededRandom = (seed: number | string): RandomSource => {
  let state = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomSigned = (random: RandomSource) => random() * 2 - 1;
