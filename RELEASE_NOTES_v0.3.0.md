# Nebula Blog v0.3.0 release-candidate notes

This revision is the root-cause response to the first local visual test of v0.1/RC.

## User-visible corrections

### Circular cover convergence

The cover no longer initializes stars from viewport-aligned X/Y bounds. It uses a larger deterministic circular reservoir outside the visible rectangle. Off-screen stars participate in attraction and collapse, and resize preserves the reservoir with uniform scaling.

### Natural galaxy silhouettes

The old prototype built galaxy disks in X/Z while the default camera looked mainly along -Z, causing edge-on strip/rectangle silhouettes. Galaxies are now generated in local X/Y with Z as thickness, then placed with explicit topic-specific 3D orientations.

The procedural distribution now separates structural stars/dust from diffuse cloud haze and combines a central bulge, spiral disk, sparse halo and arm-following gas clumps without axis-aligned clipping boundaries.

### Article enter/return timing

Return no longer exposes `cosmos` before Astro has actually swapped the home document. The final reverse frame is held in `article-return`; route synchronization commits cosmos only after the swap.

The home cover is default-hidden unless the document is explicitly home + cover/collapse, and the article entrance animation no longer owns a persistent `both` fill state. These changes remove the timing/CSS races that could reveal the cover sentence faintly during exit.

## Additional audit fixes

- exact same seeded article-burst trajectory forward and backward;
- selected article star actually disappears into the burst and reforms on return;
- entry/return camera position and quaternion use the same path in reverse;
- camera endpoint follows the user's approach side of the article star;
- article world offsets use the same galaxy local→world transform as their owning galaxy;
- article stars are constrained back into plausible galaxy thickness;
- focus candidates must be in front of the camera, within view-center threshold and within distance threshold;
- hints distinguish `click to capture view`, `move closer`, `center the star`, and `click to enter`;
- hidden particle systems stop submitting draw calls instead of only using zero opacity;
- CPU-updated particle positions use `DynamicDrawUsage`;
- galaxy frustum culling is disabled during shader-space formation and restored with final-shape bounds afterward;
- pointer-lock release/window blur/document hide clear pressed movement keys;
- inputs/contenteditable elements are not hijacked by WASD handling;
- WebGL context loss/restoration has an explicit RAF lifecycle;
- WebGL initialization failure falls back to static content navigation rather than a blank page;
- coarse-pointer/touch home views expose direct article links because the specified flight model is desktop keyboard + mouse;
- Astro page-preparation failure rolls the persistent universe back to the route that remains mounted;
- topic IDs have one source (`THEME_IDS`); article metadata has one source (Markdown frontmatter);
- flat content glob now matches the actual single-segment `[slug]` routing contract.

## Verification status

`npm run verify:offline` passes in the current development container. The container still cannot resolve/reach the public npm registry, so dependency-backed `astro check`, production build and real Chromium/WebGL smoke testing cannot be truthfully completed here.

Run locally:

```bash
npm install
npm run verify
npm run dev
```

Then follow `VERIFICATION.md` for the browser acceptance checklist.
