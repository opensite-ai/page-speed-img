# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.7] - 2026-01-22

### Added

- **`OptixFlowConfig` component** — new SSR-safe React component for setting the default OptixFlow configuration at the app root level. Preferred over the imperative `setDefaultOptixFlowConfig` function in SSR/Next.js environments because config is applied inside a `useEffect` and never executed during server-side rendering. Supports optional children so it can be used as a transparent wrapper or as a standalone side-effect node.

  ```tsx
  // Recommended: component approach (SSR-safe)
  import { OptixFlowConfig } from "@page-speed/img";

  export function Providers({ children }) {
    return (
      <OptixFlowConfig config={{ apiKey: process.env.NEXT_PUBLIC_OPTIX_KEY }}>
        {children}
      </OptixFlowConfig>
    );
  }
  ```

- Exported `ImgProps` type from `src/core/index.ts` — it was defined and used in `Img.tsx` but not re-exported through the core barrel, making it inaccessible to consumers who imported from the package root.

- `prepublishOnly` script now runs `pnpm test` in addition to `pnpm build`, ensuring the full test suite must pass before any publish can proceed.

### Fixed

- Removed a conditional `React.useRef` call inside `OptixFlowConfig` that violated the Rules of Hooks (hooks must not be called inside `if` blocks). The synchronous client-side config path was redundant given the `useEffect` already handles initialization; the offending block was removed entirely.

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