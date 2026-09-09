export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export const cameraRelativeMovement = (
  forward: Vec3Like,
  forwardIntent: number,
  rightIntent: number,
): Vec3Like => {
  const forwardLength = Math.hypot(forward.x, forward.y, forward.z) || 1;
  const fx = forward.x / forwardLength;
  const fy = forward.y / forwardLength;
  const fz = forward.z / forwardLength;

  // forward × worldUp(0, 1, 0)
  let rx = -fz;
  let ry = 0;
  let rz = fx;
  const rightLength = Math.hypot(rx, ry, rz);
  if (rightLength > 1e-6) {
    rx /= rightLength;
    ry /= rightLength;
    rz /= rightLength;
  } else {
    rx = 1;
    ry = 0;
    rz = 0;
  }

  let x = fx * forwardIntent + rx * rightIntent;
  let y = fy * forwardIntent + ry * rightIntent;
  let z = fz * forwardIntent + rz * rightIntent;
  const length = Math.hypot(x, y, z);
  if (length > 1e-6) {
    x /= length;
    y /= length;
    z /= length;
  }
  return { x, y, z };
};
