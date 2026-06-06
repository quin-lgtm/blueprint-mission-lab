# PixiJS Guide Usage

The uploaded PixiJS v8 guide set shaped the implementation rules for this prototype:

- Async `Application.init()` is awaited before using the app.
- The project imports from the single `pixi.js` package.
- WebGL is preferred for the renderer path.
- GSAP scroll code mutates state; the Pixi ticker reads that state.
- Pixi is client-only and owns only the cinematic canvas layer.
- DOM/HTML/CSS own typography, sections, accessibility, and document structure.
- Heavy object creation is avoided in scroll callbacks.
- Reduced-motion mode is supported from the first version.

The uploaded guides remain the reference for future revisions.
