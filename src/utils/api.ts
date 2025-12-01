import { cacheGet, cacheSet } from './cache.js';
import type { ImageData, ImageVariantsMap, ProgressiveSizes } from '../types.js';

export type FetchImageOptions = {
  cdnHost?: string; // default: https://cdn.ing
  signal?: AbortSignal;
  bypassCache?: boolean;
};

export const DEFAULT_CDN_HOST = 'https://cdn.ing';

function normalizeHost(cdnHost?: string): string {
  return (cdnHost ?? DEFAULT_CDN_HOST).replace(/\/$/, '');
}

function buildPrimaryImageUrl(mediaId: number, cdnHost?: string): string {
  const host = normalizeHost(cdnHost);
  return `${host}/assets/images/${mediaId}`;
}

function buildLegacyImageUrl(mediaId: number, cdnHost?: string): string {
  const host = normalizeHost(cdnHost);
  return `${host}/i/r/${mediaId}`;
}

export function buildPlaceholderImageUrl(mediaId: number, cdnHost?: string): string {
  const host = normalizeHost(cdnHost);
  return `${host}/assets/low_res_thumb/${mediaId}`;
}

function hasRenderableUrlVariant(variant?: ProgressiveSizes | null): boolean {
  if (!variant) return false;
  const candidates = [variant.sm, variant.md, variant.lg, variant.full];
  return candidates.some((value) => typeof value === 'string' && value.trim().length > 0);
}

export function imageVariantsHaveRenderableSource(variants?: ImageVariantsMap | null): boolean {
  if (!variants) return false;
  return ['AVIF', 'WEBP', 'JPEG'].some((format) => {
    const entry = variants?.[format as keyof ImageVariantsMap] as ProgressiveSizes | undefined;
    return hasRenderableUrlVariant(entry);
  });
}

function hasUrlValue(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function imageDataHasRenderableSource(data: ImageData): boolean {
  if (!data) return false;
  if (imageVariantsHaveRenderableSource(data.variants_data?.variants ?? null)) {
    return true;
  }
  const raw = data as any;
  const directFields = [
    raw.img_url,
    raw.file_data_url,
    raw.file_data_thumbnail_url,
    raw.img_src,
    raw.med_src,
    raw.thumb_src,
    raw.low_res_thumb,
  ];
  return directFields.some(hasUrlValue);
}

async function fetchFrom(url: string, signal?: AbortSignal): Promise<ImageData> {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const error = new Error(`Failed to fetch image data (status ${res.status}) from ${url}`);
    (error as any).status = res.status;
    throw error;
  }
  return (await res.json()) as ImageData;
}

export async function fetchImageData(
  mediaId: number,
  options: FetchImageOptions = {}
): Promise<ImageData> {
  if (!Number.isFinite(mediaId)) {
    throw new Error('Invalid mediaId provided to fetchImageData');
  }

  const host = normalizeHost(options.cdnHost);
  const cacheKey = `image:${host}:${mediaId}`;
  if (!options.bypassCache) {
    const cached = cacheGet<ImageData>(cacheKey);
    if (cached) return cached;
  }

  const urls = [buildPrimaryImageUrl(mediaId, host), buildLegacyImageUrl(mediaId, host)];
  let lastError: unknown;

  for (const url of urls) {
    try {
      const data = await fetchFrom(url, options.signal);
      if (imageDataHasRenderableSource(data)) {
        cacheSet(cacheKey, data);
      }
      return data;
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        throw err;
      }
      lastError = err;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error(`Failed to fetch image data for mediaId ${mediaId}`);
}
