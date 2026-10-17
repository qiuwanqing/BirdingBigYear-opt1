# Supermarket Birding — 360° environment pipeline

Run `npm install` then `npm run dev`. Build with `npm run build`.

## Active test environment

**Current override:** user-provided `retro-convenience-360.png` (1774×887, 8-bit LDR PNG). Background and sphere reflections both use this same image. No HDR lighting is claimed. Stitching, poles and public redistribution rights are unverified; this is a local visual trial. In `src/environment-config.js`, change `...retroStore` to `...shopRoom` to revert to the retained EXR. Other blur, exposure, material and interaction settings are unchanged.

### Retained HDR environment

The previous environment, `public/assets/shop-room-4k.exr`, is retained: **Shop Room**, a photographed retail shop panorama from Blendkit, under CC0. This is a small shop with product shelves and a checkout, not the final large supermarket aisle environment. No mirroring, tiling or photo expansion was performed.

Downloaded through the supplier's official public download API on 2026-10-17. Three.js EXRLoader successfully decoded the 7,539,300-byte map as 4096×2048. Linear RGB maximum is 1085, with 53,662 channel samples above 1. This verifies stored HDR range, not the original exposure-bracketing method. The supplier marks it True HDR. Source and license details are in `public/assets/ASSET-SOURCES.md`.

Set a replacement panorama in `src/environment-config.js`. The entrance displays only action buttons; developer asset controls and introductory text have been removed.

The original 736×588 photograph remains ONLY in the independent binocular observation interface. The old artificial reflection-environment.jpg is never loaded by the entrance.

## Required capture

- Actual full spherical 360° horizontal × 180° vertical equirectangular projection, 2:1 aspect ratio.
- Prefer Radiance RGBE `.hdr` or linear half/float `.exr` with genuine scene-referred HDR brightness; renaming or converting an ordinary JPEG does not restore dynamic range.
- Prefer 8192×4096 master; 4096×2048 is a useful browser test size. Include ceiling, floor and full surroundings; no mirrored, repeated, AI-invented or cropped regions.
- Level horizon, consistent exposure/white balance, correct pole stitching, seamless left/right boundary, no baked sphere or binocular mask.
- Include source URL, author, capture method, license and evidence that the delivered map has actual HDR range. File extension and 2:1 ratio alone cannot verify authenticity.
- True 360° JPEG/PNG/WebP may be used as LDR tests. The UI explicitly labels these as LDR. Their reflections use that SAME map; no unrelated HDR illumination is silently substituted. A separate HDR lighting layer is not implemented in this version.

## Acquisition candidates (not downloaded or license-cleared)

- [Blendkit: German Supermarket Location](https://www.blendkit.com/asset-gallery-detail/d03df48f-d169-47d7-845c-c7750507162c/): candidate HDRI listing. Obtain the original file through the supplier, verify capture, dimensions, brightness range and website distribution rights. A preview image is not a substitute.
- [DOSCH HDRI: Shop Interiors](https://doschdesign.com/productdetail.php?countryid=66&id=1852&line=83): supplier describes full 360° HDR environments including supermarkets. Check the selected map and license before purchase/use.
- Commission a bracketed 360° supermarket capture with permission: shoot around the lens entrance pupil, cover zenith/nadir, merge exposure brackets into linear HDR and stitch into full equirectangular format. Request permission to embed the downloadable map in a public website.

## Implementation and controls

`src/main.js` loads HDR with RGBELoader, EXR with EXRLoader and LDR with TextureLoader/sRGB. It validates aspect ratio, assigns EquirectangularReflectionMapping, uses the original for scene.background and PMREM for scene.environment. Background and reflection share rotation. A dielectric MeshPhysicalMaterial sphere uses metalness 0, transmission 1, thickness 2, IOR 1.9, roughness .005, environment reflection intensity 1.8, clearcoat .65 (roughness .005) and subtle dispersion .04 for glass transmission with Fresnel reflection; no animated UV warping, fake highlights, CSS sphere scaling or CubeCamera is used. Background blur is .075 (previously .10). Change `blur` in `src/environment-config.js`: 0 is sharp, larger values blur more.

Drag directly on the central sphere to turn the entire 360° environment with smoothing and decaying inertia. Horizontal and vertical dragging drive one shared YXZ orientation, copied to scene.backgroundRotation and scene.environmentRotation every frame. The sphere uses scene.environment directly, so its curved mirror reflection always follows the same world orientation as the background. There is no independent material envMap or optical-image rotation. The sphere mesh also follows that orientation; its ideal spherical geometry remains symmetric.

The camera remains aimed at the sphere on its central dolly path. Dragging outside the sphere does nothing. Reduced-motion preference disables release inertia. Scroll down/up or press ArrowDown/Up or PageDown/Up to enter/return. Touch drag turns the world through the sphere; entry/exit buttons control the dolly.

Camera z moves from 6.35 to .25 with a unit-radius sphere. The existing binocular scene fades in over progress .69–.77 before the camera crosses the surface. Reverse scrolling retraces the transition.

HDRI provides directional surroundings, not shelf geometry or translational parallax. The binocular scene remains independent and uses the original flat photo. Existing capture and local archive behavior is retained; no recognition or archive feature was added.

## Verification

Production Vite build passes. Actual panorama seams, source authenticity, environment orientation, GPU rendering and mobile transition quality still require browser inspection with a licensed real panorama. No claim of a completed or visually validated supermarket HDR environment is made without that asset.

## Environment absorption on approach

`src/PullBackground.js` adapts the radial background transport from the local Sky Portal Study 003 VolumePass to a spherical entrance. It renders an overscanned real panorama, samples progressively farther outward near the projected sphere boundary, and adds restrained radial trails. This makes background features move inward during camera approach. No synthetic panorama regions are created. Half-float intermediate targets retain linear HDR values; final display tone mapping happens in the main scene. The glass transmission sees the warped background, while its reflection remains based on the shared rotating PMREM world. This lens distortion is an artistic transition, not physical motion of supermarket shelves.

Pull ramps over progress .08–.62, before the existing binocular crossfade .69–.77. Reverse scroll retraces the progress-based deformation without a looping animation. Reduced-motion preference disables the warp. Background blur remains controlled in environment-config.js. Browser visual inspection is still needed for final strength and timing.

### Optical rim on approach

The absorption pass now adds a silhouette-following brightness profile: a narrow warm-white lip immediately outside the sphere, a wider shaded shoulder, then a faint soft recovery into the unmodified background. It fades in over progress .025–.38 and reverses with scrolling. The perspective-projected sphere radius locates the profile in landscape and portrait layouts. Adjust `haloWidth`, `haloStrength`, and `shoulderStrength` in `src/environment-config.js`. This is an artistic optical cue, not a physically simulated caustic. No pulsing or repeating rings are used. Browser verification of the final contrast remains pending.

### Sphere darkening during entry

The glass material multiplies its complete outgoing linear radiance before tone mapping, and drives its output alpha toward 1 as it darkens so background light cannot wash out the black surface. Darkening follows apparent sphere diameter divided by the shorter viewport dimension: starts at .60 and reaches maximum at 1.00. Default sphereDarkness is .999 (near black). It therefore becomes dark well before the existing interface reveal. Reverse scrolling restores the glass. The environment and external halo retain their brightness. Browser verification remains pending.

## Binocular lens layout

The observation overlay uses two intersecting lenses centered at 27.5% and 72.5% width, each with a 25%-width / 44%-height radius. Their openings overlap across the center with no black gap. Clear central imagery fades into a restrained 3px peripheral blur and a narrow feathered black edge. CSS variables on `.observation` control lens geometry. The observation heading and cursor hint are removed; only action buttons and the targeting reticle remain. The original photo and crop coordinates remain unchanged. Browser visual validation remains pending.

### Soft black sphere edge

As absorption increases, the glass shader fades alpha smoothly at grazing view angles, while keeping the central black region opaque. Normal alpha blending lets the surrounding world show through the soft edge. At zero absorption alpha remains 1, retaining the initial glass appearance. `sphereEdgeSoftness` controls the view-angle feather (default .35; larger values widen it). The halo remains outside the original silhouette. Build validation passes; final GPU shader and visual verification remain pending.

## Interactive panorama observation

`src/PanoramaObservation.js` replaces the fixed binocular photograph with an independent Three.js panorama scene/camera. It shares the currently selected panorama, starts with the entrance world orientation, and supports pointer/touch dragging through 360° yaw with near-pole pitch limits and smooth response. The clear and 3px-blurred canvas layers retain the existing intersecting binocular masks. There is no walking or depth parallax. The reticle is now fixed centrally; Capture Bird synchronously renders and crops the current perspective view instead of the old source photograph. Returning through the portal still uses reverse scroll or the back button. Existing recognition/archive scope is unchanged. GPU/browser visual verification remains pending.
