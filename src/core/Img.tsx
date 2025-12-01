"use client";

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useOptimizedImage } from '@page-speed/hooks';
import type { OptixFlowConfig, ImageData, ProgressiveSizes } from '../types.js';
import {
  DEFAULT_CDN_HOST,
  buildPlaceholderImageUrl,
  fetchImageData,
  imageVariantsHaveRenderableSource,
} from '../utils/api.js';
import { useMediaSelectionEffect } from './useMediaSelectionEffect.js';
import { useResponsiveReset } from './useResponsiveReset.js';

type NativeImgProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> & {
  src?: string;
};

export type ImgProps = NativeImgProps & {
  /** Legacy CDN media id support (deprecated) */
  mediaId?: number;
  /** Override CDN host for legacy mediaId usage */
  cdnHost?: string;
  /** Explicit sizes attribute (otherwise derived from useOptimizedImage) */
  sizes?: string;
  /** Callback when legacy mediaId payload is retrieved */
  onImageData?: (data: ImageData) => void;
  /** Force eager load (alias for loading="eager") */
  eager?: boolean;
  /** Intersection observer threshold for lazy loading */
  intersectionThreshold?: number;
  /** Intersection observer root margin for lazy loading */
  intersectionMargin?: string;
  /** OptixFlow integration options */
  optixFlowConfig?: OptixFlowConfig;
};

type ForwardedImgProps = ImgProps & { forwardedRef: React.Ref<HTMLImageElement | null> };

const DEFAULT_WIDTHS = {
  sm: 640,
  md: 1024,
  lg: 1536,
  full: 2560,
} as const;

const MAX_VARIANT_REFRESH_ATTEMPTS = 5;
const VARIANT_REFRESH_DELAY_MS = 3000;
const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

let defaultOptixFlowConfig: OptixFlowConfig | undefined;
const deprecatedMediaWarnings = new Set<number>();

const readGlobalOptixFlowConfig = (): OptixFlowConfig | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const globalAny = globalThis as any;
  return (
    globalAny.PageSpeedImgDefaults?.optixFlowConfig ||
    globalAny.OpensiteImgDefaults?.optixFlowConfig ||
    globalAny.PAGE_SPEED_IMG_DEFAULTS?.optixFlowConfig
  );
};

const resolveOptixFlowConfig = (config?: OptixFlowConfig): OptixFlowConfig | undefined => {
  return config ?? defaultOptixFlowConfig ?? readGlobalOptixFlowConfig();
};

export const setDefaultOptixFlowConfig = (config?: OptixFlowConfig | null) => {
  defaultOptixFlowConfig = config ?? undefined;
};

const warnDeprecatedMediaId = (mediaId?: number) => {
  if (!Number.isFinite(mediaId) || mediaId == null) return;
  const id = mediaId as number;
  if (deprecatedMediaWarnings.has(id)) return;
  deprecatedMediaWarnings.add(id);
  if (typeof console !== 'undefined' && console.warn) {
    console.warn('[DEPRECATED] <Img mediaId> is deprecated. Provide src + optixFlowConfig instead.', { mediaId: id });
  }
};

const isUrlString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const parseDimension = (value: unknown): number | undefined => {
  if (value === '' || value === null || typeof value === 'undefined') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return undefined;
};

const composeRefs = (
  hookRef: (node: HTMLImageElement | null) => void,
  forwardedRef: React.Ref<HTMLImageElement | null>,
  localRef: React.RefObject<HTMLImageElement>,
) =>
  useCallback(
    (node: HTMLImageElement | null) => {
      hookRef(node);
      // eslint-disable-next-line no-param-reassign
      (localRef as any).current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef && typeof (forwardedRef as any) === 'object') {
        (forwardedRef as any).current = node;
      }
    },
    [hookRef, forwardedRef, localRef],
  );

function widthMapFromMetadata(v?: any): Record<'sm' | 'md' | 'lg' | 'full', number> | null {
  const w = v?.widths as any;
  if (!w) return null;
  return {
    sm: w.small ?? w.sm ?? DEFAULT_WIDTHS.sm,
    md: w.medium ?? w.md ?? DEFAULT_WIDTHS.md,
    lg: w.large ?? w.lg ?? DEFAULT_WIDTHS.lg,
    full: w.full_size ?? w.full ?? DEFAULT_WIDTHS.full,
  };
}

function pickBest(sizes: ProgressiveSizes | undefined): string | undefined {
  if (!sizes) return undefined;
  return sizes.md || sizes.lg || sizes.sm || sizes.full || Object.values(sizes).find(Boolean);
}

const DEFAULT_SIZES = '(max-width:640px) 640px, (max-width:1024px) 1024px, 1536px';

const ModernImg: React.FC<ForwardedImgProps> = ({
  sizes,
  loading,
  decoding,
  alt,
  title,
  src: directSrc,
  eager,
  intersectionMargin,
  intersectionThreshold,
  optixFlowConfig,
  forwardedRef,
  ...rest
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pictureRef = useRef<HTMLPictureElement | null>(null);

  useResponsiveReset(pictureRef);
  useMediaSelectionEffect();

  const normalizedSrc = useMemo(() => (typeof directSrc === 'string' ? directSrc.trim() : ''), [directSrc]);
  const numericWidth = useMemo(() => parseDimension((rest as any).width), [rest]);
  const numericHeight = useMemo(() => parseDimension((rest as any).height), [rest]);
  const resolvedOptixConfig = useMemo(() => resolveOptixFlowConfig(optixFlowConfig), [optixFlowConfig]);
  const eagerLoad = eager ?? loading === 'eager';

  const { ref: hookRef, src, srcset, sizes: computedSizes, loading: hookLoading, size } = useOptimizedImage({
    src: normalizedSrc,
    eager: eagerLoad,
    width: numericWidth,
    height: numericHeight,
    rootMargin: intersectionMargin ?? '200px',
    threshold: intersectionThreshold ?? 0.1,
    optixFlowConfig: resolvedOptixConfig,
  });

  const mergedRef = composeRefs(hookRef, forwardedRef, imgRef);
  const { width, height, ...restProps } = rest as Record<string, unknown>;
  const sizesAttr = sizes ?? (computedSizes || undefined);
  const loadingAttr = loading ?? hookLoading ?? 'lazy';
  const decodingAttr = decoding ?? 'async';
  const hasSrcSet = Boolean(srcset.avif || srcset.webp || srcset.jpeg);
  const imgSrc = src || normalizedSrc || TRANSPARENT_PIXEL;
  const inlineSrcSet = hasSrcSet && !srcset.avif && !srcset.webp ? srcset.jpeg : '';
  const parsedWidth = parseDimension(width);
  const parsedHeight = parseDimension(height);
  const widthAttr = parsedWidth ?? (size.width || numericWidth || undefined);
  const heightAttr = parsedHeight ?? (size.height || numericHeight || undefined);

  if (!hasSrcSet) {
    return (
      <img
        ref={mergedRef}
        src={imgSrc}
        loading={loadingAttr}
        decoding={decodingAttr}
        alt={alt}
        title={title}
        width={widthAttr}
        height={heightAttr}
        {...restProps}
      />
    );
  }

  return (
    <picture ref={pictureRef}>
      {srcset.avif ? <source type="image/avif" srcSet={srcset.avif} sizes={sizesAttr} /> : null}
      {srcset.webp ? <source type="image/webp" srcSet={srcset.webp} sizes={sizesAttr} /> : null}
      <img
        ref={mergedRef}
        src={imgSrc}
        srcSet={inlineSrcSet || undefined}
        sizes={inlineSrcSet ? sizesAttr : undefined}
        loading={loadingAttr}
        decoding={decodingAttr}
        alt={alt}
        title={title}
        width={widthAttr}
        height={heightAttr}
        {...restProps}
      />
    </picture>
  );
};

const LegacyImg: React.FC<ForwardedImgProps> = ({
  mediaId,
  cdnHost,
  sizes,
  onImageData,
  loading,
  decoding,
  alt,
  title,
  src: directSrc,
  forwardedRef,
  ...rest
}) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const pictureRef = useRef<HTMLPictureElement | null>(null);
  useImperativeHandle(forwardedRef, () => imgRef.current);
  useResponsiveReset(pictureRef);
  useMediaSelectionEffect();

  const [data, setData] = useState<ImageData | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const hasMediaId = Number.isFinite(mediaId as number);
  const loadingAttr = loading ?? 'lazy';
  const decodingAttr = decoding ?? 'async';
  const [isInView, setIsInView] = useState(() => !hasMediaId || loadingAttr !== 'lazy');
  const cdnOrigin = useMemo(() => (cdnHost ?? DEFAULT_CDN_HOST).replace(/\/$/, ''), [cdnHost]);

  useEffect(() => {
    if (!hasMediaId) {
      setData(null);
      setRetryCount(0);
      return;
    }
    setData(null);
    setRetryCount(0);
  }, [hasMediaId, mediaId, cdnHost]);

  useEffect(() => {
    if (!hasMediaId) {
      return;
    }
    const controller = new AbortController();
    fetchImageData(mediaId as number, {
      cdnHost,
      signal: controller.signal,
      bypassCache: retryCount > 0,
    })
      .then((d) => {
        setData(d);
        onImageData?.(d);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          // eslint-disable-next-line no-console
          console.warn('Image data fetch failed:', err);
        }
      });
    return () => controller.abort();
  }, [hasMediaId, mediaId, cdnHost, onImageData, retryCount]);

  useEffect(() => {
    if (!hasMediaId || loadingAttr !== 'lazy') {
      setIsInView(true);
      return;
    }
    setIsInView(false);
  }, [hasMediaId, mediaId, loadingAttr]);

  useEffect(() => {
    if (!hasMediaId || loadingAttr !== 'lazy' || isInView) {
      return;
    }
    if (typeof window === 'undefined' || typeof window.IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }
    const node = imgRef.current;
    if (!node) {
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMediaId, loadingAttr, isInView]);

  // Build picture/source/srcset from variants
  const picture = useMemo(() => {
    if (!data) return null;
    const v = data.variants_data?.variants ?? {};
    const webp = (v as any).WEBP as ProgressiveSizes | undefined;
    const avif = (v as any).AVIF as ProgressiveSizes | undefined;
    const jpeg = (v as any).JPEG as ProgressiveSizes | undefined;

    const widths =
      widthMapFromMetadata((v as any).WEBP?.metadata) ||
      widthMapFromMetadata((v as any).JPEG?.metadata) ||
      { ...DEFAULT_WIDTHS };

    const ensureAbsolute = (url?: string) => {
      if (!isUrlString(url)) return undefined;
      if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
      if (url.startsWith('//')) return `https:${url}`;
      if (url.startsWith('/')) return `${cdnOrigin}${url}`;
      return `${cdnOrigin}/${url}`;
    };

    const normalizeCandidate = (candidate?: string | null) =>
      ensureAbsolute(typeof candidate === 'string' ? candidate : undefined);

    const variantCandidates = [
      pickBest(webp),
      pickBest(jpeg),
      pickBest(avif),
      webp?.sm,
      webp?.md,
      webp?.lg,
      webp?.full,
      jpeg?.sm,
      jpeg?.md,
      jpeg?.lg,
      jpeg?.full,
      avif?.sm,
      avif?.md,
      avif?.lg,
      avif?.full,
    ]
      .map((candidate) => normalizeCandidate(candidate ?? undefined))
      .filter(isUrlString);

    const raw = data as any;
    const directCandidates = [
      raw.img_url,
      raw.file_data_url,
      raw.file_data_thumbnail_url,
      raw.img_src,
      raw.med_src,
      raw.thumb_src,
      raw.low_res_thumb,
    ]
      .map((candidate) => (isUrlString(candidate) ? normalizeCandidate(candidate) : undefined))
      .filter(isUrlString);

    // Add fallback_url as the final option if no variants or direct candidates
    const fallbackCandidates = raw.fallback_url ? [normalizeCandidate(raw.fallback_url)].filter(isUrlString) : [];

    const fallback = [...variantCandidates, ...directCandidates, ...fallbackCandidates][0];

    if (!fallback) {
      return null;
    }

    const toSrcSet = (sizes?: ProgressiveSizes) => {
      if (!sizes) return undefined;
      const entries: string[] = [];
      const push = (url?: string, width?: number) => {
        const absolute = normalizeCandidate(url);
        if (absolute && width) entries.push(`${absolute} ${width}w`);
      };
      push(sizes.sm, widths.sm);
      push(sizes.md, widths.md);
      push(sizes.lg, widths.lg);
      push(sizes.full, widths.full);
      return entries.length ? entries.join(', ') : undefined;
    };

    return { webp, avif, jpeg, toSrcSet, fallback, widths, hasVariantSource: variantCandidates.length > 0 } as const;
  }, [data, cdnOrigin]);

  const hasVariantEntries = useMemo(
    () => imageVariantsHaveRenderableSource(data?.variants_data?.variants ?? null),
    [data],
  );

  const variantsStatus = useMemo(() => {
    const status = (data?.variants_data?.status ?? data?.variants_status) ?? '';
    return typeof status === 'string' ? status.toLowerCase() : '';
  }, [data]);

  const variantsFailed = variantsStatus === 'failed' || variantsStatus === 'error';

  const shouldPollForVariants =
    hasMediaId && Boolean(data) && !variantsFailed && !hasVariantEntries && retryCount < MAX_VARIANT_REFRESH_ATTEMPTS;

  useEffect(() => {
    if (!shouldPollForVariants) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setRetryCount((count) => count + 1);
    }, VARIANT_REFRESH_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [shouldPollForVariants]);

  // Map HTML attributes from content manifest and sizing
  const altAttr = useMemo(() => {
    if (typeof alt === 'string') return alt;
    return (data?.meta as any)?.content_manifest?.summary ?? undefined;
  }, [alt, data]);

  const titleAttr = useMemo(() => {
    if (typeof title === 'string') return title;
    return (data?.meta as any)?.content_manifest?.title ?? undefined;
  }, [title, data]);

  const widthAttr = useMemo(() => data?.meta?.sizing?.width ?? data?.variants_data?.metadata?.width ?? undefined, [data]);
  const heightAttr = useMemo(
    () => data?.meta?.sizing?.height ?? data?.variants_data?.metadata?.height ?? undefined,
    [data],
  );

  // Compute data-filename for consumers that need semantic filenames
  const dataFilename = useMemo(() => {
    const base = (data?.meta as any)?.content_manifest?.optimized_filename as string | undefined;
    if (!base) return undefined;
    // ext derived from chosen fallback url
    const href = picture?.fallback;
    if (!href) return undefined;
    const dot = href.lastIndexOf('.');
    const ext = dot > -1 ? href.slice(dot + 1).toLowerCase() : 'jpg';
    return `${base}.${ext}`;
  }, [data, picture]);

  // If mediaId not provided but src is, render plain img
  if (!hasMediaId) {
    const r: any = { ...rest };
    return (
      <img
        ref={imgRef}
        src={directSrc}
        loading={loadingAttr}
        decoding={decodingAttr}
        alt={altAttr}
        title={titleAttr}
        width={r.width}
        height={r.height}
        {...r}
      />
    );
  }

  const placeholderSrc = buildPlaceholderImageUrl(mediaId as number, cdnHost);

  if (!data || !picture || !isInView) {
    const r: any = { ...rest };
    return (
      <img
        ref={imgRef}
        src={placeholderSrc}
        loading={loadingAttr}
        decoding={decodingAttr}
        alt={altAttr}
        title={titleAttr}
        width={r.width ?? widthAttr}
        height={r.height ?? heightAttr}
        {...r}
      />
    );
  }

  const sizesAttr = sizes ?? DEFAULT_SIZES;
  const { webp, avif, jpeg, toSrcSet, fallback } = picture;

  const webpSet = toSrcSet(webp);
  const avifSet = toSrcSet(avif);
  const jpegSet = toSrcSet(jpeg);

  if (webpSet || avifSet || jpegSet) {
    return (
      <picture>
        {avifSet ? <source type="image/avif" srcSet={avifSet} sizes={sizesAttr} /> : null}
        {webpSet ? <source type="image/webp" srcSet={webpSet} sizes={sizesAttr} /> : null}
        <img
          ref={imgRef}
          src={fallback}
          srcSet={jpegSet && !webpSet && !avifSet ? jpegSet : undefined}
          sizes={jpegSet && !webpSet && !avifSet ? sizesAttr : undefined}
          loading={loadingAttr}
          decoding={decodingAttr}
          alt={altAttr}
          title={titleAttr}
          width={widthAttr}
          height={heightAttr}
          data-filename={dataFilename}
          {...rest}
        />
      </picture>
    );
  }

  return (
    <img
      ref={imgRef}
      src={fallback}
      loading={loadingAttr}
      decoding={decodingAttr}
      alt={altAttr}
      title={titleAttr}
      width={widthAttr}
      height={heightAttr}
      data-filename={dataFilename}
      {...rest}
    />
  );
};

const ImgBase = forwardRef<HTMLImageElement, ImgProps>(function Img(props, ref) {
  const hasMediaId = Number.isFinite(props.mediaId as number);

  if (hasMediaId) {
    warnDeprecatedMediaId(props.mediaId);
    return <LegacyImg {...props} forwardedRef={ref} />;
  }

  const hasSrc = typeof props.src === 'string' && props.src.trim().length > 0;
  if (!hasSrc) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('<Img /> requires either src or mediaId. No src provided, rendering null.');
    }
    return null;
  }

  return <ModernImg {...props} forwardedRef={ref} />;
});

export const Img = memo(ImgBase);
Img.displayName = 'PageSpeedImg';
