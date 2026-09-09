import { TAU, type RandomSource } from './math';

export interface Sample2 {
  x: number;
  y: number;
}

export interface Sample3 {
  x: number;
  y: number;
  z: number;
}

export const gaussian = (random: RandomSource) => {
  const u1 = Math.max(Number.EPSILON, random());
  const u2 = random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(TAU * u2);
};

export const sampleDisk = (
  random: RandomSource,
  radialExponent = 0.5,
): Sample2 => {
  const radius = Math.pow(random(), radialExponent);
  const angle = random() * TAU;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
};

export const sampleSphere = (random: RandomSource): Sample3 => {
  const z = random() * 2 - 1;
  const angle = random() * TAU;
  const radial = Math.sqrt(Math.max(0, 1 - z * z));
  return {
    x: Math.cos(angle) * radial,
    y: Math.sin(angle) * radial,
    z,
  };
};
