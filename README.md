# ⚡ @page-speed/img

## Performance-optimized React Image component - Drop-in Image implementation of [web.dev](https://web.dev) best practices with zero configuration. Also a great alternative to [next/image](https://nextjs.org/docs/api-reference/next/image) for non-Next.js projects that still need the automated image optimization tools that the Next `Image` component provides. Utilized throughout the [OpenSite Semantic UI Platform](https://opensite.ai).

![Page Speed React Image Component](https://octane.cdn.ing/api/v1/images/transform?url=https://toastability-production.s3.amazonaws.com/gghtx0lxw9f2zigs427qc2phu024&f=webp)

[![npm version](https://img.shields.io/npm/v/@page-speed/img?style=flat-square)](https://www.npmjs.com/package/@page-speed/hooks)
[![npm downloads](https://img.shields.io/npm/dm/@page-speed/img?style=flat-square)](https://www.npmjs.com/package/@page-speed/hooks)
[![License](https://img.shields.io/npm/l/@page-speed/img?style=flat-square)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](./tsconfig.json)

[Documentation](#documentation) · [Quick Start](#quick-start) · [Global Defaults](#setting-global-defaults) · [Examples](#examples) · [Contributing](./CONTRIBUTING.md)

---

## Documentation

`@page-speed/img` is a React-first, OptixFlow-enabled image component that ships Lighthouse-friendly markup by default. It uses `useOptimizedImage` from `@page-speed/hooks` to compute pixel-perfect `src`, DPR-aware `srcset`, and `sizes` on the client. Tree shaking keeps the bundle lean — only the media hook is pulled in.

### Installation

```bash
pnpm add @page-speed/img
```

Peer deps: `react` and `react-dom` (17+). For OptixFlow optimization, supply an API key.

---

### Usage (React / Next.js)

```tsx
import { Img } from "@page-speed/img";

export function HeroImage() {
  return (
    <Img
      src="https://images.example.com/hero.jpg"
      alt="Hero"
      width={1280}
      height={720}
      eager
    />
  );
}
```

What you get automatically:

- Pixel-perfect primary `src` sized to the rendered element (Lighthouse "Properly size images" pass).
- DPR-aware `srcset` (1x/2x) for AVIF, WebP, and JPEG.
- Lazy loading via IntersectionObserver; set `eager` for above-the-fold images.
- Optional OptixFlow compression and format selection with a single prop.

---

### Setting Global Defaults

When all or most images in your app share the same OptixFlow configuration, you can set it once globally instead of repeating `optixFlowConfig` on every `<Img />`.

#### ✅ Recommended: `<ImgDefaults />` component (SSR-safe)

The `ImgDefaults` component is the preferred approach for React and Next.js apps. It applies the default config inside a `useEffect`, which means it **never runs during server-side rendering** — making it safe to place in any server component tree without wrapping in a `"use client"` boundary at the call site.

**As a wrapper around your app:**

```tsx
// app/layout.tsx (Next.js App Router) or src/App.tsx
import { ImgDefaults } from "@page-speed/img";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ImgDefaults
          config={{
            apiKey: process.env.NEXT_PUBLIC_OPTIX_API_KEY!,
            compressionLevel: 80,
          }}
        >
          {children}
        </ImgDefaults>
      </body>
    </html>
  );
}
```

**Standalone (no children required):**

```tsx
// Place anywhere in the tree; renders null, no visual output
import { ImgDefaults } from "@page-speed/img";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ImgDefaults
        config={{ apiKey: process.env.NEXT_PUBLIC_OPTIX_API_KEY! }}
      />
      {children}
    </>
  );
}
```

Individual `<Img />` components can always override the default with their own `optixFlowConfig` prop:

```tsx
<Img
  src="https://images.example.com/hero.jpg"
  alt="Hero"
  width={1280}
  height={720}
  // Overrides the global default for this image only
  optixFlowConfig={{ renderedFileType: "jpeg", objectFit: "cover" }}
/>
```

#### Alternative: `setDefaultOptixFlowConfig()` function

For purely client-side apps, scripts, or imperative initialization (e.g. outside of React's render tree), the `setDefaultOptixFlowConfig` function is available. Call it once at app startup before any `<Img />` components mount.

```tsx
import { Img, setDefaultOptixFlowConfig } from "@page-speed/img";

// Call once, e.g. in main.tsx / index.tsx before rendering
setDefaultOptixFlowConfig({
  apiKey: process.env.VITE_OPTIX_API_KEY!,
  compressionLevel: 80,
});

export function HeroImage() {
  return (
    <Img
      src="https://images.example.com/hero.jpg"
      alt="Hero"
      width={1280}
      height={720}
    />
  );
}
```

> **Note:** `setDefaultOptixFlowConfig` is not SSR-safe on its own. In server-rendered environments (Next.js, Remix, etc.) prefer the `<ImgDefaults />` component, which handles the client/server boundary automatically.

To clear or reset the global default at any point:

```ts
setDefaultOptixFlowConfig(null);
```

#### Browser global (UMD / inline script)

For vanilla HTML pages or CMS integrations using the UMD build, set the global before the component renders:

```html
<script>
  window.PageSpeedImgDefaults = {
    optixFlowConfig: {
      apiKey: "YOUR_OPTIX_KEY",
      compressionLevel: 80,
      objectFit: "cover",
    },
  };
</script>
```

`window.OpensiteImgDefaults` and `window.PAGE_SPEED_IMG_DEFAULTS` are also honored for backward compatibility.

---

### `<Img />` Props

| Prop                    | Type                          | Default             | Description                                                            |
| ----------------------- | ----------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `src`                   | `string`                      | —                   | **(Required)** Image URL.                                              |
| `alt`                   | `string`                      | —                   | Alt text (passed through to `<img>`).                                  |
| `width`                 | `number \| string`            | —                   | Hint for sizing and CLS prevention.                                    |
| `height`                | `number \| string`            | —                   | Hint for sizing and CLS prevention.                                    |
| `eager`                 | `boolean`                     | `false`             | Force eager loading (above-the-fold). Equivalent to `loading="eager"`. |
| `loading`               | `"lazy" \| "eager"`           | `"lazy"`            | Native loading attribute. `eager` prop takes precedence.               |
| `decoding`              | `"async" \| "sync" \| "auto"` | `"async"`           | Native decoding attribute.                                             |
| `fetchPriority`         | `"high" \| "low" \| "auto"`   | `"high"` when eager | Native fetch priority.                                                 |
| `sizes`                 | `string`                      | auto-computed       | Override the `sizes` attribute generated by `useOptimizedImage`.       |
| `intersectionMargin`    | `string`                      | `"200px"`           | Root margin for the lazy-load IntersectionObserver.                    |
| `intersectionThreshold` | `number`                      | `0.1`               | Threshold for the lazy-load IntersectionObserver.                      |
| `optixFlowConfig`       | `OptixFlowConfig`             | global default      | Per-image OptixFlow config. Overrides any global default.              |
| `useDebugMode`          | `boolean`                     | `false`             | Log image request details to the console.                              |

**`optixFlowConfig` shape:**

```ts
{
  apiKey: string;
  compressionLevel?: number;           // 1–100
  renderedFileType?: "avif" | "webp" | "jpeg" | "png";
  objectFit?: "cover" | "contain" | "fill";
}
```

### `<ImgDefaults />` Props

| Prop       | Type              | Description                                                                             |
| ---------- | ----------------- | --------------------------------------------------------------------------------------- |
| `config`   | `OptixFlowConfig` | The OptixFlow configuration to apply as the global default.                             |
| `children` | `React.ReactNode` | Optional. When provided, children are rendered; otherwise the component renders `null`. |

---

### UMD usage

```html
<script
  src="https://unpkg.com/react@18/umd/react.production.min.js"
  crossorigin
></script>
<script
  src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"
  crossorigin
></script>
<script
  src="https://cdn.jsdelivr.net/npm/@page-speed/img@0.4.7/dist/browser/page-speed-img.umd.js"
  crossorigin
></script>

<div id="app"></div>
<script>
  const root = ReactDOM.createRoot(document.getElementById("app"));
  root.render(
    React.createElement(PageSpeedImg.Img, {
      src: "https://images.example.com/card.jpg",
      alt: "Card",
      width: 800,
      height: 600,
      optixFlowConfig: { apiKey: "YOUR_OPTIX_KEY", compressionLevel: 70 },
    }),
  );
</script>
```

---

### SSR considerations

- `<Img />` is marked `"use client"`. In Next.js App Router, place it inside a Client Component or a shared layout where the `"use client"` boundary is already established.
- `<ImgDefaults />` is also marked `"use client"` and applies its config exclusively via `useEffect`, so it is safe to import and render from a Server Component tree — the config call never executes on the server.
- Guards exist for `window` and `IntersectionObserver` throughout the library, so modules can be imported safely in SSR environments without crashing.

---

### Tree shaking

`@page-speed/img` only imports `useOptimizedImage` from `@page-speed/hooks`, keeping bundles small. Both ESM and CJS builds are emitted; the UMD build externalizes React and ReactDOM.

---

### Testing

```bash
pnpm test
```

---

### Roadmap

- Add Storybook examples for common layouts (hero, gallery, card).

---

## Contributing

PRs welcome. Please run `pnpm test` before submitting. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

BSD 3-Clause
