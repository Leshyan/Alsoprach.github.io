import * as THREE from 'three';
import { UNIVERSE_CONFIG } from '../core/config';
import { clamp01, createSeededRandom, easeInOutCubic, randomSigned, TAU } from '../core/math';
import { sampleDisk } from '../core/sampling';
import { createStarMaterial } from '../render/materials';

export class IntroStarField {
  readonly material: THREE.ShaderMaterial;
  readonly points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  readonly cursorLight: THREE.Sprite;

  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly count: number;
  private readonly positions: Float32Array;
  private readonly velocities: Float32Array;
  private readonly collapseStart: Float32Array;
  private readonly collapseJitter: Float32Array;
  private readonly explosionVelocity: Float32Array;
  private readonly explosionOffset: Float32Array;
  private readonly pointerWorld = new THREE.Vector3();
  private readonly collapsePoint = new THREE.Vector3();
  private pointerActive = false;
  private fieldRadius = 1;
  private horizontalSpan = 1;
  private verticalSpan = 1;
  private readonly cursorMaterial: THREE.SpriteMaterial;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    glowTexture: THREE.Texture,
    pixelRatio: number,
    reducedMotion: boolean,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.count = reducedMotion
      ? UNIVERSE_CONFIG.particles.introReduced
      : UNIVERSE_CONFIG.particles.intro;
    this.positions = new Float32Array(this.count * 3);
    this.velocities = new Float32Array(this.count * 3);
    this.collapseStart = new Float32Array(this.count * 3);
    this.collapseJitter = new Float32Array(this.count * 3);
    this.explosionVelocity = new Float32Array(this.count * 3);
    this.explosionOffset = new Float32Array(this.count * 3);

    this.material = createStarMaterial(pixelRatio, 1);
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.cursorMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0xcfe2ff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.025,
    });
    this.cursorLight = new THREE.Sprite(this.cursorMaterial);
    this.cursorLight.scale.set(3.8, 3.8, 1);
    this.cursorLight.position.set(0, 0, 0.05);
    scene.add(this.cursorLight);

    this.build(window.innerWidth, window.innerHeight);
  }

  setPointer(world: THREE.Vector3, active: boolean) {
    this.pointerWorld.copy(world);
    this.pointerActive = active;
  }


  getExplosionOrigin(target = new THREE.Vector3()) {
    return target.copy(this.collapsePoint);
  }

  setOpacity(opacity: number) {
    this.material.uniforms.uOpacity.value = opacity;
    this.points.visible = opacity > 0.001;
  }

  setCursorOpacity(opacity: number) {
    this.cursorMaterial.opacity = opacity;
    this.cursorLight.visible = opacity > 0.001;
  }

  beginCollapse(origin: THREE.Vector3) {
    this.collapsePoint.copy(origin);
    this.collapseStart.set(this.positions);
  }

  updateCover(deltaSeconds: number) {
    this.points.visible = true;
    this.cursorLight.visible = true;
    this.cursorLight.position.copy(this.pointerWorld);

    if (!this.pointerActive) {
      for (let i = 0; i < this.count; i += 1) {
        const i3 = i * 3;
        this.positions[i3] += this.velocities[i3] * deltaSeconds * 0.5;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaSeconds * 0.5;
        this.keepInsideCircularField(i3);
      }
      this.markPositionsDirty();
      this.cursorMaterial.opacity = 0.025;
      return 0;
    }

    let nearCount = 0;
    const maxAccel = 22;
    const gravity = 9.5;

    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3;
      const dx = this.pointerWorld.x - this.positions[i3];
      const dy = this.pointerWorld.y - this.positions[i3 + 1];
      const distanceSquared = dx * dx + dy * dy + 0.38;
      const distance = Math.sqrt(distanceSquared);
      const inverseDistance = 1 / distance;
      const acceleration = Math.min(gravity / distanceSquared, maxAccel);

      this.velocities[i3] += dx * inverseDistance * acceleration * deltaSeconds;
      this.velocities[i3 + 1] += dy * inverseDistance * acceleration * deltaSeconds;

      if (distance < 1.25) {
        const tangent = 0.035 * (1.25 - distance);
        this.velocities[i3] += -dy * tangent * deltaSeconds;
        this.velocities[i3 + 1] += dx * tangent * deltaSeconds;
        const damping = Math.pow(0.19, deltaSeconds);
        this.velocities[i3] *= damping;
        this.velocities[i3 + 1] *= damping;
        nearCount += 1;
      } else {
        const damping = Math.pow(0.72, deltaSeconds);
        this.velocities[i3] *= damping;
        this.velocities[i3 + 1] *= damping;
      }

      this.positions[i3] += this.velocities[i3] * deltaSeconds;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * deltaSeconds;
    }

    this.markPositionsDirty();
    const gathered = clamp01(nearCount / (this.count * 0.30));
    this.cursorMaterial.opacity = 0.08 + gathered * 0.34;
    const scale = 2.4 + gathered * 3.4;
    this.cursorLight.scale.set(scale, scale, 1);
    return gathered;
  }

  updateCollapse(progress: number) {
    this.points.visible = true;
    this.cursorLight.visible = true;
    const t = clamp01(progress);
    const eased = easeInOutCubic(t);
    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3;
      const jitter = (1 - eased) * 0.02;
      this.positions[i3] = THREE.MathUtils.lerp(this.collapseStart[i3], this.collapsePoint.x, eased)
        + this.collapseJitter[i3] * jitter;
      this.positions[i3 + 1] = THREE.MathUtils.lerp(this.collapseStart[i3 + 1], this.collapsePoint.y, eased)
        + this.collapseJitter[i3 + 1] * jitter;
      this.positions[i3 + 2] = THREE.MathUtils.lerp(this.collapseStart[i3 + 2], this.collapsePoint.z, eased)
        + this.collapseJitter[i3 + 2] * jitter * 0.4;
    }
    this.markPositionsDirty();
    this.cursorLight.position.copy(this.collapsePoint);
    this.cursorMaterial.opacity = 0.2 + eased * 0.72;
    const scale = 3.5 + eased * 7.5;
    this.cursorLight.scale.set(scale, scale, 1);
  }

  beginBigBang() {
    const random = createSeededRandom(
      `bigbang:${this.collapsePoint.x.toFixed(3)}:${this.collapsePoint.y.toFixed(3)}:${this.collapsePoint.z.toFixed(3)}`,
    );

    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3;
      const theta = random() * TAU;
      const z = randomSigned(random);
      const radial = Math.sqrt(Math.max(0, 1 - z * z));
      const speed = 8 + Math.pow(random(), 0.62) * 33;
      this.explosionOffset[i3] = randomSigned(random) * 0.03;
      this.explosionOffset[i3 + 1] = randomSigned(random) * 0.03;
      this.explosionOffset[i3 + 2] = randomSigned(random) * 0.03;
      this.positions[i3] = this.collapsePoint.x + this.explosionOffset[i3];
      this.positions[i3 + 1] = this.collapsePoint.y + this.explosionOffset[i3 + 1];
      this.positions[i3 + 2] = this.collapsePoint.z + this.explosionOffset[i3 + 2];
      this.explosionVelocity[i3] = Math.cos(theta) * radial * speed;
      this.explosionVelocity[i3 + 1] = Math.sin(theta) * radial * speed;
      this.explosionVelocity[i3 + 2] = -Math.abs(z * speed) - 3 - random() * 7;
    }
    this.markPositionsDirty();
    this.cursorMaterial.opacity = 0.62;
    this.cursorLight.scale.set(7, 7, 1);
  }

  updateBigBang(deltaSeconds: number, progress: number) {
    const drag = Math.pow(0.9, deltaSeconds);
    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3;
      this.positions[i3] += this.explosionVelocity[i3] * deltaSeconds;
      this.positions[i3 + 1] += this.explosionVelocity[i3 + 1] * deltaSeconds;
      this.positions[i3 + 2] += this.explosionVelocity[i3 + 2] * deltaSeconds;
      this.explosionVelocity[i3] *= drag;
      this.explosionVelocity[i3 + 1] *= drag;
      this.explosionVelocity[i3 + 2] *= drag;
    }
    this.markPositionsDirty();
    this.cursorMaterial.opacity = (1 - clamp01(progress / 0.3)) * 0.75;
    this.cursorLight.visible = this.cursorMaterial.opacity > 0.001;
    this.cursorLight.scale.setScalar(6 + clamp01(progress) * 20);
  }

  setPixelRatio(pixelRatio: number) {
    this.material.uniforms.uPixelRatio.value = pixelRatio;
  }

  reflow(width: number, height: number) {
    const spans = this.computeVisibleSpan(width, height);
    const nextRadius = this.computeFieldRadius(spans.horizontal, spans.vertical);
    if (this.fieldRadius <= 0 || this.horizontalSpan <= 0 || this.verticalSpan <= 0) {
      this.fieldRadius = nextRadius;
      this.horizontalSpan = spans.horizontal;
      this.verticalSpan = spans.vertical;
      return;
    }

    // The star reservoir represents an off-screen circle, so resize it uniformly.
    // Axis-specific scaling here would turn that circle into an ellipse.
    const fieldScale = nextRadius / this.fieldRadius;
    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3;
      this.positions[i3] *= fieldScale;
      this.positions[i3 + 1] *= fieldScale;
      this.velocities[i3] *= fieldScale;
      this.velocities[i3 + 1] *= fieldScale;
      this.collapseStart[i3] *= fieldScale;
      this.collapseStart[i3 + 1] *= fieldScale;
    }

    // Pointer/collapse targets are screen-space concepts, so preserve their normalized screen position.
    const targetScaleX = spans.horizontal / this.horizontalSpan;
    const targetScaleY = spans.vertical / this.verticalSpan;
    this.pointerWorld.x *= targetScaleX;
    this.pointerWorld.y *= targetScaleY;
    this.collapsePoint.x *= targetScaleX;
    this.collapsePoint.y *= targetScaleY;

    this.fieldRadius = nextRadius;
    this.horizontalSpan = spans.horizontal;
    this.verticalSpan = spans.vertical;
    this.markPositionsDirty();
  }

  dispose() {
    this.scene.remove(this.points);
    this.scene.remove(this.cursorLight);
    this.geometry.dispose();
    this.material.dispose();
    this.cursorMaterial.dispose();
  }

  private build(width: number, height: number) {
    const random = createSeededRandom('nebula-cover-stars-circular-v3');
    const spans = this.computeVisibleSpan(width, height);
    this.horizontalSpan = spans.horizontal;
    this.verticalSpan = spans.vertical;
    this.fieldRadius = this.computeFieldRadius(spans.horizontal, spans.vertical);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);
    const alpha = new Float32Array(this.count);

    for (let i = 0; i < this.count; i += 1) {
      const i3 = i * 3;
      // Slight central bias keeps visible density high while preserving a genuinely circular
      // off-screen reservoir that is revealed as gravity pulls it inward.
      const disk = sampleDisk(random, 0.58);
      this.positions[i3] = disk.x * this.fieldRadius;
      this.positions[i3 + 1] = disk.y * this.fieldRadius;
      this.positions[i3 + 2] = randomSigned(random) * 0.3;

      const driftAngle = random() * TAU;
      const driftSpeed = 0.004 + random() * 0.014;
      this.velocities[i3] = Math.cos(driftAngle) * driftSpeed;
      this.velocities[i3 + 1] = Math.sin(driftAngle) * driftSpeed;
      this.collapseJitter[i3] = randomSigned(random);
      this.collapseJitter[i3 + 1] = randomSigned(random);
      this.collapseJitter[i3 + 2] = randomSigned(random);

      const temperature = random();
      colors[i3] = 0.72 + temperature * 0.26;
      colors[i3 + 1] = 0.78 + temperature * 0.2;
      colors[i3 + 2] = 0.92 + random() * 0.08;
      sizes[i] = random() < 0.06 ? 2 + random() * 2 : 0.75 + random() * 1.15;
      alpha[i] = 0.22 + Math.pow(random(), 2.6) * 0.78;
    }

    const positionAttribute = new THREE.BufferAttribute(this.positions, 3);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', positionAttribute);
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
  }

  private keepInsideCircularField(i3: number) {
    const x = this.positions[i3];
    const y = this.positions[i3 + 1];
    const radius = Math.hypot(x, y);
    if (radius <= this.fieldRadius || radius < 1e-6) return;

    const nx = x / radius;
    const ny = y / radius;
    this.positions[i3] = nx * this.fieldRadius;
    this.positions[i3 + 1] = ny * this.fieldRadius;
    const outwardSpeed = this.velocities[i3] * nx + this.velocities[i3 + 1] * ny;
    if (outwardSpeed > 0) {
      this.velocities[i3] -= nx * outwardSpeed * 1.8;
      this.velocities[i3 + 1] -= ny * outwardSpeed * 1.8;
    }
  }

  private computeVisibleSpan(width: number, height: number) {
    const aspect = width / Math.max(1, height);
    const vertical = 2
      * Math.tan(THREE.MathUtils.degToRad(this.camera.fov * 0.5))
      * Math.abs(this.camera.position.z);
    return { horizontal: vertical * aspect, vertical };
  }

  private computeFieldRadius(horizontal: number, vertical: number) {
    const halfDiagonal = Math.hypot(horizontal * 0.5, vertical * 0.5);
    return halfDiagonal * 1.08;
  }

  private markPositionsDirty() {
    const attribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    attribute.needsUpdate = true;
  }
}
