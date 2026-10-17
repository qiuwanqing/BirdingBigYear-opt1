# Codex handoff — Supermarket Birding, Sphere Portal

## One-line brief

A user starts surrounded by a visually reconstructed supermarket. A genuine reflective, gently animated Three.js sphere floats in the center. Scrolling physically dollies the virtual camera toward/through the sphere and enters a binocular observation mode. Subsequent interactions let visitors spot, record, and archive birds or bird-like imagery on real supermarket packaging.

## Current design choice

**Choose the sphere-in-supermarket alternative, NOT the older supermarket-box-in-blue-sky portal.** The background is the supplied real supermarket photo. The sphere reflects/refracts this environment. It functions as an optical portal / birding lens. This is a study, not a full installation.

## Non-negotiables

- User-provided real photo is used and should be kept recognizably photographic.
- Center orb is actually rendered by Three.js/WebGL (not a CSS fake or a static composite).
- Mouse-wheel is spatial progress, not ordinary page scroll.
- The orb must show obvious continuous visual motion while idle, not merely a slow overall rotation.
- Scroll makes the camera physically approach and pass into the orb, which morphs to the observation screen.
- Bird spotting is driven by visual noticing, not barcode scanning; barcode only follows a sighting.
- Do NOT invent recognized bird species from random spots in the supplied supermarket photo.
- Do not replace the original creative direction with another site design without checking first.

## Present implementation

- Vite + Three.js modules, `src/main.js`.
- Custom `ShaderMaterial` renders mapped supermarket photo in sphere reflections with chromatic aberration and animated distortion; extra Fresnel halo sphere.
- Scroll progress controls camera z and reveal of observation scene.
- Binocular overlay plus selection reticle and local-storage possible sightings.
- No automatic bird recognition, no 3D interior yet.

## Next iteration ideas

- Improve surface illusion to feel like a refractive lens (refraction / chromatic aberration / specular Fresnel) rather than chrome or an opaque marble.
- Use actual interior panorama or a Blender model instead of the artificial reflection image.
- Experiment with stronger space warping near scroll threshold while preserving visual continuity.
- Smooth reversible camera crossing; avoid jarring hard cuts.
- Only after the entrance is visually right, connect to the actual supermarket 3D environment and phone camera mode.

## Validation

Run `npm install && npm run dev`, open in modern Chrome/Safari, scroll both directions, drag, open about, create a possible sighting, inspect receipt/archive, and resize to mobile viewport. This code was assembled without completing an external Three.js dependency install in the original generation container, so visual WebGL output needs confirmation in your local browser.
