![Page Speed React Image Component](https://octane.cdn.ing/api/v1/images/transform?url=https://toastability-production.s3.amazonaws.com/gghtx0lxw9f2zigs427qc2phu024&q=85&f=avif)

---

# ⚡ @page-speed/img
  
**Performance-optimized React Image component**

Drop-in Image implementation of [web.dev](https://web.dev) best practices with zero configuration.

[![npm version](https://img.shields.io/npm/v/@page-speed/img?style=flat-square)](https://www.npmjs.com/package/@page-speed/hooks)
[![npm downloads](https://img.shields.io/npm/dm/@page-speed/img?style=flat-square)](https://www.npmjs.com/package/@page-speed/hooks)
[![License](https://img.shields.io/npm/l/@page-speed/img?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](./tsconfig.json)
[![Tree-Shakeable](https://img.shields.io/badge/Tree%20Shakeable-Yes-brightgreen?style=flat-square)](#tree-shaking)

[Documentation](#documentation) · [Quick Start](#quick-start) · [Hooks](#hooks) · [Examples](#examples) · [Contributing](./CONTRIBUTING.md)

---

## Documentation

`@page-speed/img` is a React-first, OptixFlow-enabled image component that ships Lighthouse-friendly markup by default. It uses `useOptimizedImage` from `@page-speed/hooks` to compute pixel-perfect `src`, DPR-aware `srcset`, and `sizes` on the client without any CDN variant fetches. Tree shaking keeps the bundle lean—only the media hook is pulled in.

### Installation

```bash
pnpm add @page-speed/img
```

Peer deps: `react` and `react-dom` (17+). For OptixFlow optimization, supply an API key.

### Usage (React / Next.js)

```tsx
import { Img, setDefaultOptixFlowConfig } from "@page-speed/img";

// Optional: set once at app start
setDefaultOptixFlowConfig({ apiKey: process.env.NEXT_PUBLIC_OPTIX_API_KEY!, compressionLevel: 80 });

export function HeroImage() {
  return (
    <Img
      src="https://images.example.com/hero.jpg"
      alt="Hero"
      width={1280}
      height={720}
      // Per-image override (optional)
      optixFlowConfig={{ renderedFileType: "jpeg" }}
    />
  );
}
```

What you get:
- Pixel-perfect primary `src` sized to the rendered element (Lighthouse “Properly size images” pass).
- DPR-aware `srcset` (1x/2x) for AVIF/WebP/JPEG.
- Lazy loading with IntersectionObserver; set `eager` for above-the-fold.
- Optional OptixFlow compression/format selection with a single prop.

### Props

- `src` (string, required): Image URL.
- `alt`, `title`, standard `<img>` attributes.
- `width`, `height`: Set for CLS prevention; used as hints for sizing. Actual rendered size is measured to generate the pixel-perfect URL.
- `loading`, `decoding`: Defaults `lazy` / `async`. Set `eager` to force above-the-fold fetch.
- `sizes`: Override the auto-generated `sizes` from `useOptimizedImage`.
- `intersectionMargin`, `intersectionThreshold`: Tweak lazy-load observer.
- `optixFlowConfig`: `{ apiKey: string; compressionLevel?: number; renderedFileType?: 'avif' | 'webp' | 'jpeg' | 'png'; }`.

### Global defaults (React & UMD)

- Programmatic: `setDefaultOptixFlowConfig({ apiKey: '...' })` once during app init.
- Browser global (UMD/inline):

```html
<script>
  window.PageSpeedImgDefaults = {
    optixFlowConfig: {
      apiKey: "YOUR_OPTIX_KEY",
      compressionLevel: 80
    }
  };
</script>
```

`window.OpensiteImgDefaults` and `window.PAGE_SPEED_IMG_DEFAULTS` are also honored for backward compatibility.

### UMD usage

```html
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://cdn.jsdelivr.net/npm/@page-speed/img@0.0.2/dist/browser/page-speed-img.umd.js" crossorigin></script>

<div id="app"></div>
<script>
  const root = ReactDOM.createRoot(document.getElementById('app'));
  root.render(
    React.createElement(PageSpeedImg.Img, {
      src: 'https://images.example.com/card.jpg',
      alt: 'Card',
      width: 800,
      height: 600,
      optixFlowConfig: { apiKey: 'YOUR_OPTIX_KEY', compressionLevel: 70 }
    })
  );
</script>
```

### SSR considerations

- The component is client-only (`"use client"`). For SSR apps, render it in client components/entry points.
- Safe in non-browser contexts: guards exist for `window`/`IntersectionObserver`.

### Tree shaking

`@page-speed/img` only imports `useOptimizedImage` from `@page-speed/hooks`, keeping bundles small. Both ESM and CJS builds are emitted; UMD is externalized to React/ReactDOM.

### Testing

```bash
pnpm test
```

### Roadmap

- Remove legacy `mediaId` shim once internal consumers migrate to the new `src` + OptixFlow path.
- Add storybook examples for common layouts (hero, gallery, card).

---

## Contributing

PRs welcome. Please run `pnpm test` before submitting.
