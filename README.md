# Blueprint of Water — Mission Lab

A standalone cinematic prototype for the Blueprint of Water Mission page.

This is intentionally separate from the production site. It is a visual lab for the page's art direction, water motion, scroll choreography, and mission copy.

## Stack

- Vite
- TypeScript
- PixiJS v8
- GSAP / ScrollTrigger
- HTML/CSS for content and layout
- Playwright for browser captures

PixiJS is used only for the cinematic water layer. Text, layout, accessibility, and document flow remain normal HTML/CSS.

## Run locally

```bash
npm install
npx playwright install chromium
npm run dev
```

Open the local URL Vite prints, usually:

```text
http://127.0.0.1:5173
```

## Build

```bash
npm run build
```

## Capture screenshots

```bash
npm run capture:frames
```

Screenshots are saved to:

```text
captures/frames/
```

## Capture a scroll-through video

```bash
npm run capture:video
```

Videos are saved to:

```text
captures/video/
```

## Debug panel

Use the `Tune` button or press `D`.

The panel controls:

- water speed
- ion density
- mist intensity
- glow strength
- waterfall width
- turbulence

## PixiJS implementation rules followed

- PixiJS v8 async `Application.init()` is awaited.
- WebGL is preferred as the default renderer.
- GSAP/ScrollTrigger updates scroll state only.
- Pixi objects are not created inside scroll callbacks.
- Pixi's ticker reads state once per frame.
- Reduced-motion mode is supported.
- Text stays outside canvas.

## Optional local skill install

If your local environment supports the `skills` CLI, this is the PixiJS skills command you provided:

```bash
npx skills add https://github.com/pixijs/pixijs-skills
```

The project itself does not require that command to run. The uploaded PixiJS v8 guide files were used as the implementation reference for this prototype.

## What to improve next

1. Make the water route feel more physically continuous over the entire long page.
2. Replace the quick abstract device geometry with more designed instrument silhouettes.
3. Add a more subtle refractive surface texture.
4. Tune mobile with its own composition instead of simply scaling desktop.
5. Deploy the lab to Netlify so both reviewers can inspect the same live scroll behavior.
