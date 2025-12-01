# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2025-12-01

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
