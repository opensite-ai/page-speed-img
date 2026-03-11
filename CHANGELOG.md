# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.8] - 2026-01-29

### Changed

- **Renamed `OptixFlowConfig` component → `ImgDefaults`** — the component introduced in `0.4.7` conflicted with the long-standing `OptixFlowConfig` *type alias* (exported as `type OptixFlowConfig = UseOptimizedImageOptions["optixFlowConfig"]`) that thousands of consumer components already use for their `optixFlowConfig` prop declarations. Because the component was brand-new and the type alias was widely depended on, the component was renamed to `ImgDefaults` with a matching `ImgDefaultsProps` interface. All imports, exports, tests, and documentation have been updated accordingly.

  ```tsx
  // Before (0.4.7 — component name conflicted with the config type)
  import { OptixFlowConfig } from "@page-speed/img";
  <OptixFlowConfig config={{ apiKey: "..." }} />

  // After (0.4.8 — non-conflicting name)
  import { ImgDefaults } from "@page-speed/img";
  <ImgDefaults config={{ apiKey: "..." }} />
  ```

  The `OptixFlowConfig` **type** is unaffected and continues to be exported from the package root:

  ```ts
  import type { OptixFlowConfig } from "@page-speed/img";
  // optixFlowConfig?: OptixFlowConfig  ← still works, unchanged
  ```

- **`ImgDefaults` `useEffect` now always calls `setDefaultOptixFlowConfig`** — the previous implementation guarded the call behind `if (config?.apiKey)`, which silently skipped clearing the default when a `null`/`undefined` config was passed. The guard has been removed; `setDefaultOptixFlowConfig(config ?? null)` is now called unconditionally, matching the documented cleanup behavior.

- **`ImgDefaultsProps.config` now accepts `null`** — the prop type was widened from `UseOptimizedImageOptions["optixFlowConfig"] | undefined` to include `null` so callers can explicitly pass `null` to clear the global default.

### Renamed

- `src/core/OptixFlowConfig.tsx` → `src/core/ImgDefaults.tsx`
- `tests/OptixFlowConfig.test.tsx` → `tests/ImgDefaults.test.tsx`
- `OptixFlowConfigProps` interface → `ImgDefaultsProps`
- `docs/OptixFlowConfig.md` → `docs/ImgDefaults.md`

---

## [0.4.7] - 2026-01-22

### Added

- **`ImgDefaults` component** — new SSR-safe React component for setting the default OptixFlow configuration at the app root level. Preferred over the imperative `setDefaultOptixFlowConfig` function in SSR/Next.js environments because config is applied inside a `useEffect` and never executed during server-side rendering. Supports optional children so it can be used as a transparent wrapper or as a standalone side-effect node.

  ```tsx
  // Recommended: component approach (SSR-safe)
  import { ImgDefaults } from "@page-speed/img";

  export function Providers({ children }) {
    return (
      <ImgDefaults config={{ apiKey: process.env.NEXT_PUBLIC_OPTIX_KEY }}>
        {children}
      </ImgDefaults>
    );
  }
  ```

- Exported `ImgProps` type from `src/core/index.ts` — it was defined and used in `Img.tsx` but not re-exported through the core barrel, making it inaccessible to consumers who imported from the package root.

- `prepublishOnly` script now runs `pnpm test` in addition to `pnpm build`, ensuring the full test suite must pass before any publish can proceed.

### Fixed

- Removed a conditional `React.useRef` call inside `ImgDefaults` that violated the Rules of Hooks (hooks must not be called inside `if` blocks). The synchronous client-side config path was redundant given the `useEffect` already handles initialization; the offending block was removed entirely.

---

## [0.4.5] - 2026-01-15

### Added

- OptixFlow `objectFit` support (`fit` query param) via `optixFlowConfig.objectFit`.

### Changed

- `Img` now imports `useOptimizedImage` and types from `@page-speed/hooks/media` for better tree-shaking.
- `@page-speed/img` re-exports hook types from `@page-speed/hooks` instead of duplicating local types.

### Performance

- Avoided redundant media selection event listeners across multiple `<Img />` instances.
- Removed unused legacy helpers to reduce build output.
- Added temporary request logging for image URLs to help diagnose repeated transform calls.

## [0.1.4] - 2025-12-01

### Added

- Switched core `<Img />` implementation to the new `useOptimizedImage` flow from `@page-speed/hooks`, eliminating CDN variant fetches for standard usage.
- Added OptixFlow support via `optixFlowConfig` (apiKey, compressionLevel, renderedFileType) with tree-shakeable hook import.
- Introduced global/default configuration helpers (`setDefaultOptixFlowConfig` + `window.PageSpeedImgDefaults/OpensiteImgDefaults`) for UMD and multi-app setups.
- Preserved legacy `mediaId` rendering path but marked it as deprecated with console warnings; primary API is now `src` + OptixFlow.
- Exported `PageSpeedImg` display name and ensured SSR/UMD safety via process/env guards.

---

## License

[BSD 3](https://github.com/opensite-ai/page-speed-img/LICENSE) © [OpenSite AI](https://opensite.ai)

---

## See Also

- [@page-speed/hooks](https://github.com/opensite-ai/page-speed-hooks) - Ultimate PageSpeed React Hooks Toolset
- [web-vitals](https://github.com/GoogleChrome/web-vitals) - Official Google metrics library
- [web.dev](https://web.dev) - Web performance best practices

---

**Questions?** [Open an issue](https://github.com/opensite-ai/page-speed-hooks/issues) or [start a discussion](https://github.com/opensite-ai/page-speed-hooks/discussions)
