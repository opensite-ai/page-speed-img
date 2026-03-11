# AGENTS.md — AI Coding Agent Guide for @page-speed/img

This file is written specifically for AI coding agents (Copilot, Claude, Cursor, etc.) working
inside this repository. It describes the project's purpose, architecture, public API, build
system, test conventions, and the rules that must be followed when making changes.

---

## Project Purpose

`@page-speed/img` is a performance-optimized React image component that implements
[web.dev](https://web.dev) image best practices automatically:

- Pixel-perfect `src` URL sized to the rendered element (avoids over-fetching).
- DPR-aware `srcset` (1×/2×) for AVIF, WebP, and JPEG via `<picture>` + `<source>`.
- IntersectionObserver-based lazy loading with configurable root margin/threshold.
- Optional [OptixFlow](https://opensite.ai) CDN compression/format selection via `optixFlowConfig`.
- SSR-safe: guarded against `window` / `IntersectionObserver` access during server rendering.
- Zero-config defaults; fully configurable when needed.

The component is consumed by the **OpenSite Semantic UI Platform** and is published to npm as
`@page-speed/img`. It depends on `@page-speed/hooks` (the `useOptimizedImage` hook lives there).

---

## Repository Layout

```
page-speed-img/
├── src/
│   ├── index.ts                  # Public entry point — re-exports everything consumers need
│   ├── core/
│   │   ├── index.ts              # Re-exports from core sub-modules
│   │   ├── Img.tsx               # <Img /> component + setDefaultOptixFlowConfig()
│   │   ├── OptixFlowConfig.tsx   # <OptixFlowConfig /> component (SSR-safe config provider)
│   │   ├── useImgDebugLog.ts     # Debug logging hook (dev-only, tree-shaken in prod)
│   │   ├── useMediaSelectionEffect.ts  # Dispatches dt:media-selected DOM events
│   │   └── useResponsiveReset.ts       # Forces <picture> srcset re-evaluation on resize
│   └── utils/                    # Internal utilities (not part of public API)
├── tests/
│   ├── smoke.test.tsx            # Broad smoke tests: exports, DOM rendering, events
│   └── OptixFlowConfig.test.tsx  # Unit tests for <OptixFlowConfig />
├── scripts/
│   ├── emit-cjs.js               # Post-tsc step: rewrites .js → .cjs + barrel files
│   └── analyze-bundle.js         # Bundle size analysis (runs with || true, non-blocking)
├── dist/                         # Build output (git-ignored during dev, committed for publish)
│   ├── index.js / index.cjs / index.d.ts
│   ├── core/
│   └── browser/
│       └── page-speed-img.umd.js  # UMD bundle for CDN / vanilla usage
├── tsconfig.json                  # Targets ESNext, moduleResolution: Bundler
├── tsup.config.ts                 # (present but primary build uses tsc directly)
├── vite.umd.config.ts             # Vite config for UMD build only
├── vitest.config.ts               # Test runner config (happy-dom environment)
└── package.json
```

---

## Public API

Everything consumers should import comes from the root `@page-speed/img` package. Never ask
consumers to import from internal sub-paths like `@page-speed/img/core`.

### Components

#### `<Img />`

The primary component. A drop-in replacement for `<img>` with automatic optimization.

```tsx
import { Img } from "@page-speed/img";

<Img
  src="https://images.example.com/photo.jpg"
  alt="A photo"
  width={800}
  height={600}
  eager                              // force above-the-fold loading (optional)
  optixFlowConfig={{ apiKey: "..." }} // OptixFlow config override (optional)
/>
```

**Key behavior:**
- Renders `<picture>` with AVIF + WebP `<source>` elements when OptixFlow is active.
- Renders a plain `<img>` when OptixFlow is disabled or no srcset is generated.
- Returns `null` and emits a `console.warn` if `src` is falsy/empty.
- `loading` defaults to `"lazy"`; `decoding` defaults to `"async"`.
- `fetchPriority` is set to `"high"` automatically when `eager` is true.

#### `<OptixFlowConfig />` *(preferred approach for setting global defaults)*

An SSR-safe declarative component that sets the default OptixFlow config for all `<Img />`
instances in the tree. Place it once at the root of the application.

```tsx
import { OptixFlowConfig } from "@page-speed/img";

// Standalone (no children):
<OptixFlowConfig config={{ apiKey: process.env.NEXT_PUBLIC_OPTIX_API_KEY, compressionLevel: 80 }} />

// As a wrapper:
<OptixFlowConfig config={{ apiKey: "...", compressionLevel: 80 }}>
  <App />
</OptixFlowConfig>
```

**Why prefer this over `setDefaultOptixFlowConfig()`:**
- Config is applied inside `useEffect`, so it never runs during SSR.
- Config re-applies automatically when the `config` prop changes (supports hot reload).
- Idiomatic React — works with React 18/19 concurrent rendering.
- Passes `null` to `setDefaultOptixFlowConfig` when unmounted (automatic cleanup).

**Returns:** children when provided, otherwise `null`. Has no DOM output of its own.

### Functions

#### `setDefaultOptixFlowConfig(config)`

Imperative API. Sets a module-level default OptixFlow config consumed by all `<Img />` instances
that don't supply their own `optixFlowConfig` prop.

```ts
import { setDefaultOptixFlowConfig } from "@page-speed/img";

// Set at app entry (e.g., in _app.tsx, main.tsx):
setDefaultOptixFlowConfig({ apiKey: "...", compressionLevel: 80 });

// Clear:
setDefaultOptixFlowConfig(null);
```

**Use cases for the function approach:**
- Non-React initialization code (Vanilla JS, script tags).
- Test setup / teardown.
- UMD builds where `<OptixFlowConfig />` cannot be rendered before the rest of the app.

> ⚠️ **SSR caveat:** Calling this function during SSR (e.g., in a Next.js Server Component or
> `getServerSideProps`) will set the config on the module-level singleton, which is shared
> across requests in a Node.js process. Use `<OptixFlowConfig />` or only call this function
> inside `useEffect` / client-only code paths.

### Browser globals (UMD only)

When using the UMD bundle from a CDN, the config can be set before the script loads:

```html
<script>
  window.PageSpeedImgDefaults = {
    optixFlowConfig: { apiKey: "YOUR_KEY", compressionLevel: 80 }
  };
</script>
<script src="https://cdn.../page-speed-img.umd.js"></script>
```

All three globals are honored (checked in order, first wins):
1. `window.PageSpeedImgDefaults.optixFlowConfig`
2. `window.OpensiteImgDefaults.optixFlowConfig`
3. `window.PAGE_SPEED_IMG_DEFAULTS.optixFlowConfig`

### Types

```ts
import type { ImgProps, OptixFlowConfigProps } from "@page-speed/img";

// Hook types re-exported from @page-speed/hooks for convenience:
import type {
  ImageFormat,
  SrcsetByFormat,
  UseOptimizedImageOptions,
  UseOptimizedImageState,
} from "@page-speed/img";

// Config type alias:
import type { OptixFlowConfig } from "@page-speed/img"; // = UseOptimizedImageOptions["optixFlowConfig"]
```

### `ImgProps` reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | — | **Required.** Image URL. |
| `alt` | `string` | — | Alt text (passed to `<img>`). |
| `width` | `number \| string` | — | Layout hint; prevents CLS. |
| `height` | `number \| string` | — | Layout hint; prevents CLS. |
| `eager` | `boolean` | `false` | Force eager loading + `fetchPriority="high"`. |
| `loading` | `"lazy" \| "eager"` | `"lazy"` | Native loading attribute. |
| `decoding` | `"async" \| "sync" \| "auto"` | `"async"` | Native decoding attribute. |
| `sizes` | `string` | auto | Override computed `sizes`. |
| `intersectionMargin` | `string` | `"200px"` | `rootMargin` for IntersectionObserver. |
| `intersectionThreshold` | `number` | `0.1` | `threshold` for IntersectionObserver. |
| `optixFlowConfig` | `OptixFlowConfig` | `undefined` | Per-image OptixFlow override. |
| `useDebugMode` | `boolean` | `false` | Log image state to console. |

All standard `HTMLImageElement` attributes are also accepted (spread onto `<img>`), except
`srcSet` and `sizes` which are managed internally.

---

## Build System

### Commands

```bash
pnpm build          # Full build (ESM + CJS + UMD)
pnpm build:lib      # tsc → dist/ (ESM .js + .d.ts), then emit-cjs.js → .cjs files
pnpm build:umd      # Vite UMD bundle → dist/browser/page-speed-img.umd.js
pnpm test           # vitest run (all tests, no watch)
pnpm prepublishOnly # build + test (must pass 100% before publishing)
pnpm lint           # eslint src/
```

### Build pipeline detail

1. **`tsc`** compiles `src/` → `dist/` as ESM (`.js` + `.d.ts`). Config is in `tsconfig.json`
   (`moduleResolution: "Bundler"`, `module: "ESNext"`).
2. **`scripts/emit-cjs.js`** copies every `.js` file in `dist/` to `.cjs`, rewrites
   `require()` paths, and creates dual-format barrel files. This is the CJS build step.
3. **`vite build --config vite.umd.config.ts`** produces the single-file UMD bundle.
   React and ReactDOM are externalized (`globals: { react: "React", "react-dom": "ReactDOM" }`).

### Important: `.js` extensions in source imports

Because the package is `"type": "module"` and TypeScript targets ESM, all relative imports in
`src/` **must use `.js` extensions** even though the files are `.ts`/`.tsx`. This is how Node
ESM resolution works. Do not use `.ts` extensions or extensionless imports in `src/`.

```ts
// ✅ Correct
import { Img } from "./Img.js";

// ❌ Wrong
import { Img } from "./Img";
import { Img } from "./Img.ts";
```

This rule does **not** apply to test files, which use vitest's resolver that handles `.ts`
imports fine.

---

## Testing

### Running tests

```bash
pnpm test          # single run (used in CI / prepublishOnly)
pnpm test --watch  # watch mode for development
```

### Test environment

- **Runner:** Vitest 3.x
- **DOM environment:** `happy-dom` (configured in `vitest.config.ts`)
- **Component rendering:** `@testing-library/react` (`render`, `waitFor`)
- **No jest-dom setup file** — `toBeInTheDocument()` is not available. Use `.toBeTruthy()`,
  `.not.toBeNull()`, or `container.querySelector()` based assertions instead.

### Test file conventions

| File | What it tests |
|------|---------------|
| `tests/smoke.test.tsx` | Package exports exist, DOM rendering via `createRoot`/`act`, custom events, `resetResponsivePictureState` |
| `tests/OptixFlowConfig.test.tsx` | `<OptixFlowConfig />` component behavior, SSR safety, config propagation, edge cases |

### Critical rules for writing tests

1. **Never set `window` or `global.window` to `undefined` inside a test** — React 19's
   scheduler reads `window.event` during render/unmount. Nulling `window` corrupts the entire
   test file's environment because `@testing-library/react`'s cleanup (`afterEach`) also runs
   React code. If you must test SSR behavior, mock at a higher level or skip DOM rendering.

2. **Use `vi.spyOn(module, 'exportName')` for intercepting named exports**, not
   `(global as any).fnName = mockFn`. Assigning to `global` never intercepts module-bound
   imports. Vitest 3 supports `vi.spyOn` on module namespace objects when the module is
   transformed by Vite.

   ```ts
   import * as CoreImg from "../src/core/Img";
   const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");
   // ... render component that calls setDefaultOptixFlowConfig internally ...
   expect(spy).toHaveBeenCalledWith(expectedConfig);
   ```

3. **`vi.restoreAllMocks()` is in `afterEach`** — individual tests do not need to call it.
   `setDefaultOptixFlowConfig(null)` is also called in `beforeEach`/`afterEach` to reset
   global state between tests.

4. **`waitFor` is required for `useEffect` assertions** — `setDefaultOptixFlowConfig` is
   called inside `useEffect` in `<OptixFlowConfig />`, so assertions on it must be wrapped in
   `await waitFor(...)`.

5. **Smoke tests use `createRoot` + `act` directly** (not `@testing-library/react`) to avoid
   the deprecated `ReactDOMTestUtils.act` warning while still exercising the real render path.
   New smoke-style tests should follow the same pattern.

---

## Source File Responsibilities

### `src/index.ts`

The public entry point. Responsibilities:
- Patches `globalThis.process.env.NODE_ENV` for UMD/browser environments that lack it.
- Re-exports `Img`, `setDefaultOptixFlowConfig`, `OptixFlowConfig` from `./core/index.js`.
- Re-exports `ImgProps`, `OptixFlowConfigProps` type aliases.
- Re-exports hook types from `@page-speed/hooks/media` for consumer convenience.
- Exports the `OptixFlowConfig` type alias (`= UseOptimizedImageOptions["optixFlowConfig"]`).

### `src/core/Img.tsx`

The implementation of `<Img />`. Key internals:
- `defaultOptixFlowConfig` — module-level variable set by `setDefaultOptixFlowConfig()`.
- `readGlobalOptixFlowConfig()` — reads `window.PageSpeedImgDefaults` etc. for UMD support.
- `resolveOptixFlowConfig()` — merges prop → module default → window global (in that priority).
- `ModernImg` — inner functional component; always rendered via `forwardRef` wrapper.
- `composeRefs()` — merges the hook ref, forwarded ref, and local ref into one callback ref.
- `parseDimension()` — safely converts `width`/`height` props (may be strings) to numbers.
- `Img` — the exported memoized component; returns `null` with a warning if `src` is empty.

### `src/core/OptixFlowConfig.tsx`

SSR-safe config provider. Key rules:
- **`useEffect` only** — config is never set during the render phase. This is what makes it
  SSR-safe. Do not add any code outside `useEffect` that calls `setDefaultOptixFlowConfig` or
  accesses `window`.
- **No conditional hooks** — all `React.use*` calls must be at the top level of the function,
  unconditionally. This was a bug in an earlier version; do not reintroduce it.
- Passes `config ?? null` (not just `config`) so that `undefined` config also clears the
  default, preventing stale configs when the prop is removed.

### `src/core/useMediaSelectionEffect.ts`

Registers a singleton `window` event listener for `dt:media-selected` events. Uses a ref-count
guard to avoid duplicate listeners when multiple `<Img />` instances mount. Safe to call in SSR
(no-ops when `window` is undefined).

### `src/core/useResponsiveReset.ts`

Forces `<picture>` elements to re-evaluate `srcset` after resize events. Needed because some
browsers cache the selected `<source>` and don't re-run media query matching on resize.

---

## Package Exports Map

```json
{
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/index.d.ts"
  },
  "./core": {
    "import": "./dist/core/index.js",
    "require": "./dist/core/index.cjs",
    "types": "./dist/core/index.d.ts"
  },
  "./core/img": {
    "import": "./dist/core/Img.js",
    "require": "./dist/core/Img.cjs",
    "types": "./dist/core/Img.d.ts"
  }
}
```

The `./core` and `./core/img` sub-paths exist for advanced tree-shaking scenarios. Direct
consumers should always use the root `"."` path.

---

## SSR Safety Rules

These rules apply to all source code in this package:

1. **Never access `window`, `document`, or `navigator` at module load time** (i.e., outside a
   function body or `useEffect`). These will throw on the server.

2. **`useEffect` is the correct gate for client-only side effects** — it never runs during SSR.

3. **`typeof window !== 'undefined'` guards are acceptable inside function bodies** (not in
   module scope and not wrapping React hook calls).

4. **`globalThis` is safe at module scope** — it exists in both Node.js and browsers.

5. **`"use client"` directives** — `Img.tsx` and `OptixFlowConfig.tsx` both carry `"use client"`.
   This is required for Next.js App Router. Do not remove these directives.

---

## OptixFlow Config Shape

The `optixFlowConfig` prop / default config object type is:

```ts
type OptixFlowConfig = {
  apiKey: string;
  compressionLevel?: number;       // 1–100, default determined by CDN
  renderedFileType?: "avif" | "webp" | "jpeg" | "png";
  objectFit?: "cover" | "contain" | "fill";
};
```

This type is `UseOptimizedImageOptions["optixFlowConfig"]` from `@page-speed/hooks/media`.
The source of truth lives in that package; do not duplicate or redefine the type here.

---

## Common Tasks

### Adding a new prop to `<Img />`

1. Add the prop to the `ImgProps` type in `src/core/Img.tsx`.
2. Destructure it in `ModernImg`'s parameter list.
3. Wire it up in the appropriate `useMemo` or pass it through to `useOptimizedImage`.
4. Ensure SSR safety (no direct `window` access in render phase).
5. Document it in the Props table in `README.md`.
6. Add a test in `tests/smoke.test.tsx` or `tests/OptixFlowConfig.test.tsx`.

### Adding a new export

1. Define/export from the appropriate `src/core/*.tsx` file.
2. Add it to `src/core/index.ts` (both value and type exports if needed).
3. Add it to `src/index.ts` for the public API.
4. Run `pnpm build` to verify `tsc` picks it up with no errors.

### Updating the build or release

1. Bump the version in `package.json`.
2. Add a `## [x.y.z] - YYYY-MM-DD` entry to `CHANGELOG.md`.
3. Run `pnpm prepublishOnly` — **both `build` and `test` must pass 100%**.
4. Publish with `pnpm publish`.

### Changing `OptixFlowConfig`

- Only ever add side effects inside `useEffect`. The render phase must stay pure.
- The `config` dependency array entry in `useEffect` is intentional — it re-applies when
  the config object reference changes (e.g., during hot reload or prop updates).
- Do **not** add `React.useRef`, `React.useCallback`, or any other hook inside a conditional.

---

## Gotchas and Anti-Patterns

| Anti-pattern | Why it's wrong | Correct approach |
|---|---|---|
| Calling `React.useRef` / any hook inside `if (...) { }` | Violates Rules of Hooks; React tracks hooks by call order | Move the hook call to the top level of the function |
| `Object.defineProperty(global, 'window', { value: undefined })` in tests | Corrupts `window` for all subsequent tests; React 19 crashes on `window.event` | Never null out `window`; test SSR safety by design, not by environment mutation |
| `(global as any).setDefaultOptixFlowConfig = vi.fn()` to mock | Sets a global property; does not intercept the module-bound import | Use `vi.spyOn(CoreImg, 'setDefaultOptixFlowConfig')` |
| Importing with `.ts`/`.tsx` extension in `src/` | Breaks Node ESM resolution at runtime | Use `.js` extension in all `src/` relative imports |
| Accessing `window` in module scope | Throws during SSR | Guard with `typeof window !== 'undefined'` inside a function, or use `useEffect` |
| Adding `toBeInTheDocument()` assertions | `@testing-library/jest-dom` is not installed or configured | Use `.toBeTruthy()`, `.not.toBeNull()`, or DOM query comparisons |
| Duplicating `OptixFlowConfig` type definition | Gets out of sync with `@page-speed/hooks` | Always use `UseOptimizedImageOptions["optixFlowConfig"]` from the hooks package |

---

## Dependencies

### Runtime (bundled)

- `@page-speed/hooks` — provides `useOptimizedImage` hook and media types.
- `@opensite/hooks` — internal OpenSite hooks (used transitively via `@page-speed/hooks`).

### Peer (must be provided by the consumer)

- `react` ≥ 17.0.0
- `react-dom` ≥ 17.0.0

### Dev (not bundled)

- `typescript` — compilation.
- `vite` / `@vitejs/plugin-react` — UMD bundle.
- `vitest` / `happy-dom` / `@testing-library/react` — test runner and DOM environment.
- `eslint` / `@typescript-eslint/*` — linting.

---

## Environment Variables

No environment variables are required for the package itself. The `apiKey` is passed by
consumers at runtime. Consumers in Next.js typically expose it via
`NEXT_PUBLIC_OPTIX_FLOW_API_KEY` (or similar) and pass it to `<OptixFlowConfig />` or
`setDefaultOptixFlowConfig()`.

---

## Versioning Policy

This package follows [Semantic Versioning](https://semver.org/):

- **Patch** (`0.x.y`): bug fixes, test fixes, documentation.
- **Minor** (`0.x.0`): new exports, new props with backward-compatible defaults.
- **Major** (`x.0.0`): breaking changes to the public API (prop removals, type renames,
  behavioral changes with no opt-out).

---

## Quick Reference

```
src/index.ts                → public entry; edit this when adding/removing exports
src/core/Img.tsx            → <Img /> component implementation
src/core/OptixFlowConfig.tsx→ <OptixFlowConfig /> component
src/core/index.ts           → re-exports from core; must mirror what index.ts re-exports
pnpm prepublishOnly         → the single gate before every publish (build + test)
vitest.config.ts            → test environment (happy-dom, no jest-dom matchers)
vite.umd.config.ts          → UMD bundle (React/ReactDOM externalized)
CHANGELOG.md                → add an entry for every version bump
```
