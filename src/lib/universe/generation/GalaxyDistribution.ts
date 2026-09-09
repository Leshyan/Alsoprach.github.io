import type { NebulaDefinition } from '../../../data/universe';
import { clamp01, createSeededRandom, lerp, TAU } from '../core/math';
import { gaussian, sampleDisk, sampleSphere } from '../core/sampling';

export type GalaxyLayerKind = 'structure' | 'cloud';

export interface GalaxyParticleAttributes {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  alpha: Float32Array;
  formationDelay: Float32Array;
  formationCurl: Float32Array;
}

interface CloudClump {
  x: number;
  y: number;
  z: number;
  angle: number;
  radialSigma: number;
  tangentSigma: number;
  zSigma: number;
}

const colorChannel = (a: number, b: number, mix: number, lift = 0) => (
  Math.min(1, lerp(a, b, mix) + lift)
);

const buildCloudClumps = (
  definition: NebulaDefinition,
  random: () => number,
  arms: number,
): CloudClump[] => {
  const clumpCount = 12;
  const clumps: CloudClump[] = [];
  for (let index = 0; index < clumpCount; index += 1) {
    const radial01 = 0.14 + Math.pow(random(), 0.72) * 0.76;
    const arm = index % arms;
    const angle = arm * TAU / arms
      + radial01 * TAU * 1.05
      + gaussian(random) * 0.13;
    const radial = radial01 * definition.radius;
    clumps.push({
      x: Math.cos(angle) * radial,
      y: Math.sin(angle) * radial,
      z: gaussian(random) * definition.radius * 0.025,
      angle,
      radialSigma: definition.radius * (0.035 + random() * 0.035),
      tangentSigma: definition.radius * (0.06 + random() * 0.075),
      zSigma: definition.radius * (0.035 + random() * 0.035),
    });
  }
  return clumps;
};

export const buildGalaxyLayer = (
  definition: NebulaDefinition,
  kind: GalaxyLayerKind,
  count: number,
): GalaxyParticleAttributes => {
  const random = createSeededRandom(`galaxy:${definition.id}:${kind}:v3`);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const alpha = new Float32Array(count);
  const formationDelay = new Float32Array(count);
  const formationCurl = new Float32Array(count);
  const arms = definition.arms;
  const clumps = kind === 'cloud' ? buildCloudClumps(definition, random, arms) : [];

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    let x = 0;
    let y = 0;
    let z = 0;
    let radial01 = 0;

    if (kind === 'structure') {
      const component = random();
      if (component < 0.17) {
        // Dense central bulge: a softly flattened spheroid, never an axis-aligned box.
        const direction = sampleSphere(random);
        const radius = definition.radius * 0.34 * Math.pow(random(), 1.65);
        x = direction.x * radius;
        y = direction.y * radius;
        z = direction.z * radius * 0.48;
        radial01 = Math.hypot(x, y) / definition.radius;
      } else if (component < 0.93) {
        // Logarithmic-style spiral disk in the XY plane. Z is physical thickness.
        radial01 = Math.pow(random(), 0.74);
        const arm = Math.floor(random() * arms);
        const armPhase = arm * TAU / arms;
        const angleScatter = 0.075 + radial01 * 0.20;
        const angle = armPhase
          + radial01 * TAU * 1.12
          + gaussian(random) * angleScatter;
        const radial = Math.max(
          0,
          radial01 * definition.radius
            + gaussian(random) * definition.radius * (0.010 + radial01 * 0.018),
        );
        x = Math.cos(angle) * radial;
        y = Math.sin(angle) * radial;
        z = gaussian(random)
          * definition.radius
          * (0.012 + Math.pow(radial01, 1.5) * 0.044);
      } else {
        // Sparse stellar halo with a soft ellipsoidal falloff.
        const direction = sampleSphere(random);
        const radius = definition.radius * (0.36 + Math.pow(random(), 0.9) * 0.76);
        x = direction.x * radius;
        y = direction.y * radius;
        z = direction.z * radius * 0.58;
        radial01 = Math.hypot(x, y) / definition.radius;
      }
    } else if (random() < 0.78) {
      // Haze follows elongated arm clumps rather than rectangular Cartesian scatter.
      const clump = clumps[Math.floor(random() * clumps.length)];
      const radialX = Math.cos(clump.angle);
      const radialY = Math.sin(clump.angle);
      const tangentX = -radialY;
      const tangentY = radialX;
      const radialOffset = gaussian(random) * clump.radialSigma;
      const tangentOffset = gaussian(random) * clump.tangentSigma;
      x = clump.x + radialX * radialOffset + tangentX * tangentOffset;
      y = clump.y + radialY * radialOffset + tangentY * tangentOffset;
      z = clump.z + gaussian(random) * clump.zSigma;
      radial01 = Math.hypot(x, y) / definition.radius;
    } else {
      // Diffuse component: circular/ellipsoidal falloff with no hard bounding edges.
      const disk = sampleDisk(random, 0.64);
      const radial = definition.radius * 1.03;
      x = disk.x * radial;
      y = disk.y * radial;
      radial01 = Math.hypot(x, y) / definition.radius;
      z = gaussian(random) * definition.radius * (0.045 + radial01 * 0.035);
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;

    const colorMix = clamp01(radial01 * 0.86 + random() * 0.18);
    const centerLift = Math.max(0, 0.16 - radial01 * 0.22);
    colors[i3] = colorChannel(definition.hueA[0], definition.hueB[0], colorMix, centerLift);
    colors[i3 + 1] = colorChannel(definition.hueA[1], definition.hueB[1], colorMix, centerLift);
    colors[i3 + 2] = colorChannel(definition.hueA[2], definition.hueB[2], colorMix, centerLift * 1.25);

    if (kind === 'structure') {
      sizes[i] = 0.72 + Math.pow(random(), 2.6) * 4.1;
      alpha[i] = 0.055 + Math.pow(random(), 2.0) * 0.56;
    } else {
      sizes[i] = 3.2 + Math.pow(random(), 1.65) * 9.5;
      alpha[i] = 0.010 + Math.pow(random(), 1.95) * 0.066;
    }

    formationDelay[i] = Math.min(0.34, radial01 * 0.17 + random() * 0.11);
    formationCurl[i] = (random() * 2 - 1)
      * definition.radius
      * (kind === 'structure' ? 0.085 : 0.12);
  }

  return { positions, colors, sizes, alpha, formationDelay, formationCurl };
};
