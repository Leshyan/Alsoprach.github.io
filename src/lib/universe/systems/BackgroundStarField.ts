import * as THREE from 'three';
import { UNIVERSE_CONFIG } from '../core/config';
import { createSeededRandom, TAU } from '../core/math';
import { createStarMaterial } from '../render/materials';

export class BackgroundStarField {
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly material: THREE.ShaderMaterial;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene, pixelRatio: number, reducedMotion: boolean) {
    this.scene = scene;
    const count = reducedMotion
      ? UNIVERSE_CONFIG.particles.backgroundReduced
      : UNIVERSE_CONFIG.particles.background;
    const random = createSeededRandom('nebula-background-v2');
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alpha = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3;
      const radius = 90 + Math.pow(random(), 0.5) * 260;
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      positions[i3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i3 + 1] = Math.cos(phi) * radius;
      positions[i3 + 2] = Math.sin(phi) * Math.sin(theta) * radius - 50;
      const cold = random();
      colors[i3] = 0.62 + cold * 0.33;
      colors[i3 + 1] = 0.68 + cold * 0.29;
      colors[i3 + 2] = 0.82 + cold * 0.18;
      sizes[i] = 0.55 + Math.pow(random(), 4) * 2.2;
      alpha[i] = 0.12 + random() * 0.64;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));

    this.material = createStarMaterial(pixelRatio, 0);
    this.points = new THREE.Points(geometry, this.material);
    this.points.visible = false;
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  setOpacity(opacity: number) {
    this.material.uniforms.uOpacity.value = opacity;
    this.points.visible = opacity > 0.001;
  }

  setPixelRatio(pixelRatio: number) {
    this.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  dispose() {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
