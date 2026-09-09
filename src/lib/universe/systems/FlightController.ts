import * as THREE from 'three';
import { UNIVERSE_CONFIG } from '../core/config';
import { cameraRelativeMovement } from '../core/navigation';

const MOVEMENT_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'ShiftLeft', 'ShiftRight',
]);

export class FlightController {
  private readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLCanvasElement;
  private readonly keys = new Set<string>();
  private enabled = false;
  private pointerLocked = false;
  private yaw = 0;
  private pitch = 0;
  private readonly movement = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ');

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.canvas = canvas;
    this.syncFromCamera();

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('keydown', this.onKeyDown, { passive: false });
    window.addEventListener('keyup', this.onKeyUp, { passive: true });
    window.addEventListener('blur', this.clearKeys, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  setEnabled(enabled: boolean) {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.clearKeys();
      this.releasePointerLock();
    }
  }

  get isPointerLocked() {
    return this.pointerLocked;
  }

  requestPointerLock() {
    if (!this.enabled || this.pointerLocked) return;
    this.canvas.requestPointerLock?.();
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
  }

  syncFromCamera() {
    this.euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
    this.pitch = THREE.MathUtils.clamp(
      this.euler.x,
      -UNIVERSE_CONFIG.motion.maxPitch,
      UNIVERSE_CONFIG.motion.maxPitch,
    );
    this.yaw = this.euler.y;
  }

  update(deltaSeconds: number) {
    if (!this.enabled) return;

    const forwardIntent =
      (this.keys.has('KeyW') || this.keys.has('ArrowUp') ? 1 : 0)
      - (this.keys.has('KeyS') || this.keys.has('ArrowDown') ? 1 : 0);
    const rightIntent =
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') ? 1 : 0)
      - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') ? 1 : 0);

    this.camera.getWorldDirection(this.forward).normalize();
    const direction = cameraRelativeMovement(this.forward, forwardIntent, rightIntent);
    this.movement.set(direction.x, direction.y, direction.z);

    if (this.movement.lengthSq() > 0) {
      const boosting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      const speed = UNIVERSE_CONFIG.motion.cruiseSpeed
        * (boosting ? UNIVERSE_CONFIG.motion.boostMultiplier : 1);
      this.camera.position.addScaledVector(this.movement, speed * deltaSeconds);
      this.clampCameraPosition();
    }
  }

  dispose() {
    this.releasePointerLock();
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearKeys);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.keys.clear();
  }

  private clampCameraPosition() {
    const { x, y, z } = UNIVERSE_CONFIG.camera.bounds;
    this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, x[0], x[1]);
    this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, y[0], y[1]);
    this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, z[0], z[1]);
  }

  private onMouseMove = (event: MouseEvent) => {
    if (!this.enabled || !this.pointerLocked) return;
    this.yaw -= event.movementX * UNIVERSE_CONFIG.motion.mouseYawSensitivity;
    this.pitch -= event.movementY * UNIVERSE_CONFIG.motion.mousePitchSensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch,
      -UNIVERSE_CONFIG.motion.maxPitch,
      UNIVERSE_CONFIG.motion.maxPitch,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  };

  private onKeyDown = (event: KeyboardEvent) => {
    if (!this.enabled || !MOVEMENT_KEYS.has(event.code)) return;
    const target = event.target;
    if (
      target instanceof HTMLElement
      && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) return;
    this.keys.add(event.code);
    if (event.code.startsWith('Arrow')) event.preventDefault();
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onVisibilityChange = () => {
    if (document.hidden) this.clearKeys();
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    if (this.pointerLocked) this.syncFromCamera();
    else this.clearKeys();
  };

  private clearKeys = () => {
    this.keys.clear();
  };
}
