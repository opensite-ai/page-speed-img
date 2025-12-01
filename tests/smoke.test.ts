import { describe, it, expect } from 'vitest';

// Import from source to ensure TS/ESM paths and syntax are valid
import { Img } from '../src/index.ts';
import {
  imageVariantsHaveRenderableSource,
  imageDataHasRenderableSource,
  buildPlaceholderImageUrl,
} from '../src/utils/api.ts';
import { resetResponsivePictureState } from '../src/core/useResponsiveReset.ts';
import { cacheGet, cacheSet, cacheHas } from '../src/utils/cache.ts';

describe('package smoke tests', () => {
  it('exports Img component', () => {
    expect(Img).toBeTruthy();
    // displayName is set explicitly for consumers
    expect((Img as any).displayName).toBe('OpenSiteImg');
  });

  it('utils: imageVariantsHaveRenderableSource behaves on simple inputs', () => {
    expect(imageVariantsHaveRenderableSource(null)).toBe(false);
    expect(imageVariantsHaveRenderableSource(undefined)).toBe(false);
    expect(
      imageVariantsHaveRenderableSource({
        WEBP: { sm: '', md: '', lg: '', full: '' },
      } as any),
    ).toBe(false);
    expect(
      imageVariantsHaveRenderableSource({
        JPEG: { sm: '/some/path.jpg' },
      } as any),
    ).toBe(true);
  });

  it('utils: imageDataHasRenderableSource detects direct urls', () => {
    expect(
      imageDataHasRenderableSource({
        id: 1,
        img_url: '/img/1.jpg',
      } as any),
    ).toBe(true);

    expect(
      imageDataHasRenderableSource({
        id: 2,
        variants_data: { variants: { WEBP: { sm: '/img/2.webp' } } },
      } as any),
    ).toBe(true);

    expect(
      imageDataHasRenderableSource({ id: 3 } as any),
    ).toBe(false);
  });

  it('utils: builds placeholder image urls correctly', () => {
    expect(buildPlaceholderImageUrl(123)).toMatch(/\/assets\/low_res_thumb\/123$/);
    expect(buildPlaceholderImageUrl(123, 'https://cdn.example.com/')).toBe(
      'https://cdn.example.com/assets/low_res_thumb/123',
    );
  });

  it('core: resetResponsivePictureState is safe with null', () => {
    // This should be a no-op and should not throw
    expect(() => resetResponsivePictureState(null)).not.toThrow();
  });

  it('utils: simple cache set/get/has', () => {
    const key = `test:${Date.now()}`;
    expect(cacheHas(key)).toBe(false);
    cacheSet(key, { ok: true });
    expect(cacheHas(key)).toBe(true);
    const value = cacheGet<any>(key);
    expect(value).toBeTruthy();
    expect(value.ok).toBe(true);
  });
});
