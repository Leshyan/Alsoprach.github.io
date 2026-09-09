# Technical decisions — Nebula Blog v0.3

## Astro + direct Three.js

Astro owns content, static article routes, SEO and client navigation. Three.js owns one persistent scene. There is intentionally no React/R3F layer between the document and render loop.

This keeps article rendering server/static-friendly while allowing the WebGL world to remain a single long-lived imperative runtime.

## Persistent renderer

The spatial metaphor depends on continuity. `UniverseShell` is persisted across Astro navigation, so route changes do not recreate the renderer, camera or galaxy world.

## WebGL first, replaceable simulation systems

The production path targets Three.js `WebGLRenderer`. Particle systems are isolated behind system boundaries so a later WebGPU/compute implementation can replace high-density simulation without changing route or content ownership.

A graphics initialization failure has a content fallback: the site remains navigable as ordinary pages. Coarse-pointer/touch home views also expose direct article links rather than pretending the desktop flight controls are usable there.

## Explicit state machine

The normal interactive path is:

`cover -> collapse -> bigbang -> cosmos -> article-enter -> article -> article-return -> cosmos`

Normal transitions are validated. Direct-URL restoration and navigation-failure recovery are explicit force operations rather than hidden transition exceptions.

## Deterministic procedural generation

Cover stars, background stars, galaxy layers and article bursts use seeded PRNGs. There is no `Math.random()` in the universe runtime.

Benefits:

- stable world layout across sessions;
- reproducible visual debugging;
- forward/reverse article bursts use identical particles;
- geometry can be statistically regression-tested without a browser.

## Circular cover reservoir instead of viewport sampling

A rectangular viewport must not become the physical boundary of the simulated star field. Cover stars are sampled inside a circular disk whose radius exceeds the screen half-diagonal. The browser sees a crop of that larger field.

Stars outside the visible rectangle can therefore flow inward under pointer gravity, and the collapse carries a circular spatial envelope rather than a screen-shaped one. Resize scales the reservoir uniformly so it never becomes an ellipse.

## Camera-relative navigation

The camera orientation is the movement frame. W/S use the full current view direction, including pitch. A/D use the horizontal camera-right vector derived from `forward × worldUp`. Arrow keys mirror those movements. Shift changes speed only; pointer-lock mouse movement changes view only.

## Galaxy model and orientation

The earlier prototype accidentally built disks in X/Z, while the initial camera primarily looked along -Z; most galaxies were therefore seen close to edge-on and read as long rectangular strips.

The final procedural model is constructed in local X/Y:

- flattened central spheroidal bulge;
- logarithmic-style spiral-disk population;
- sparse soft stellar halo;
- separate diffuse cloud layer with arm-following clumps;
- Z used only as physical thickness.

Each topic receives an explicit 3D quaternion orientation. Offline tests reject configurations that become near edge-on from the initial view and reject distributions with strong rectangular-corner occupancy.

## Big Bang as the true formation origin

Galaxies are not finished objects scaled up from zero. Both galaxy layers receive the actual clicked Big Bang world point.

Because each Points object belongs to an oriented/transformed galaxy group, that world point is converted with the object's complete inverse world transform before being sent to the shader. At formation 0, every layer therefore begins at exactly the same world-space point. Formation then follows staggered curved trajectories toward final particle coordinates.

The galaxy object's world transform remains fixed. Only subtle shader-local drift is applied after particles form; there is no object-level spin that would invalidate article-star positions or move the formation origin.

## Two-layer galaxies

Structural stars/dust and diffuse cloud haze intentionally have separate geometry, attributes, opacity and point-size behavior. They share world transform and formation origin but not rendering implementation.

This avoids turning one shader into an all-purpose material and leaves a clean future replacement point for volumetric noise or compute-driven gas.

## Reversible article transition

Article bursts are generated from a slug-derived seed. Forward and reverse sample the same particle trajectory. The selected article star itself fades to zero integrity during entry and reforms during return; it is not left invisibly sitting underneath the burst.

Camera position and quaternion use the same saved cosmos/article endpoints and the same easing curve in both directions. The article endpoint is chosen on the user's actual approach side instead of a fixed world axis.

## Route/visual two-phase commit

Astro preparation is intentionally delayed until the 3D transition completes. Return has an additional invariant: reverse animation finishing does **not** immediately expose `cosmos`. The engine holds the final `article-return` frame until the home document has actually swapped, then route synchronization restores cosmos.

This prevents a temporal mismatch where old article DOM, new home CSS and persistent WebGL state briefly disagree—the root cause of the faint cover-title flash seen in the earlier prototype.

The article CSS entrance animation uses `backwards`, not `both`; return explicitly cancels that animation. This prevents animation fill priority from overriding state-driven opacity during exit.

## Navigation failure recovery

The Astro loader wrapper is treated like a transaction. If the requested document cannot be prepared, the engine restores whichever document remained mounted. A network/load failure therefore cannot strand the camera or star burst in an impossible intermediate state.

## Content ownership

Topic IDs live in `data/themes.ts`; types and the Astro schema derive from them. Article title, description, theme and local galaxy offset live only in Markdown frontmatter. Runtime article-star definitions are derived from the content collection.

## Submission and buffer discipline

Invisible groups are actually marked `visible = false`; setting shader opacity to zero alone would still issue draw calls and execute vertex shaders.

CPU-mutated particle positions use `DynamicDrawUsage`. Galaxy vertex motion during formation happens in the shader. Frustum culling is disabled only while shader-space formation invalidates final CPU bounds and is restored once galaxies reach their final geometry.

## Reduced motion

Reduced-motion mode lowers particle counts and shortens transition durations. It preserves the spatial information architecture rather than merely disabling CSS animation.
