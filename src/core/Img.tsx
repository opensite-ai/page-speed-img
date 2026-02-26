"use client";

import React, { forwardRef, memo, useCallback, useMemo, useRef } from "react";
import { useOptimizedImage } from "@page-speed/hooks/media";
import type { UseOptimizedImageOptions } from "@page-speed/hooks/media";
import { useImgDebugLog } from "./useImgDebugLog.js";
import { useMediaSelectionEffect } from "./useMediaSelectionEffect.js";
import { useResponsiveReset } from "./useResponsiveReset.js";

type NativeImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "sizes"
> & {
  src?: string;
};

export type ImgProps = NativeImgProps & {
  /** Explicit sizes attribute (otherwise derived from useOptimizedImage) */
  sizes?: string;
  /** Force eager load (alias for loading="eager") */
  eager?: boolean;
  /** Intersection observer threshold for lazy loading */
  intersectionThreshold?: number;
  /** Intersection observer root margin for lazy loading */
  intersectionMargin?: string;
  /** OptixFlow integration options */
  optixFlowConfig?: UseOptimizedImageOptions["optixFlowConfig"];
  /** Enable debug logging for image requests */
  useDebugMode?: boolean;
};

type ForwardedImgProps = ImgProps & {
  forwardedRef: React.Ref<HTMLImageElement | null>;
};

const TRANSPARENT_PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

let defaultOptixFlowConfig:
  | UseOptimizedImageOptions["optixFlowConfig"]
  | undefined;

const readGlobalOptixFlowConfig = ():
  | UseOptimizedImageOptions["optixFlowConfig"]
  | undefined => {
  if (typeof globalThis === "undefined") return undefined;
  const globalAny = globalThis as any;
  return (
    globalAny.PageSpeedImgDefaults?.optixFlowConfig ||
    globalAny.OpensiteImgDefaults?.optixFlowConfig ||
    globalAny.PAGE_SPEED_IMG_DEFAULTS?.optixFlowConfig
  );
};

const resolveOptixFlowConfig = (
  config?: UseOptimizedImageOptions["optixFlowConfig"],
): UseOptimizedImageOptions["optixFlowConfig"] | undefined => {
  return config ?? defaultOptixFlowConfig ?? readGlobalOptixFlowConfig();
};

export const setDefaultOptixFlowConfig = (
  config?: UseOptimizedImageOptions["optixFlowConfig"] | null,
) => {
  defaultOptixFlowConfig = config ?? undefined;
};

const parseDimension = (value: unknown): number | undefined => {
  if (value === "" || value === null || typeof value === "undefined")
    return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
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
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef && typeof (forwardedRef as any) === "object") {
        (forwardedRef as any).current = node;
      }
    },
    [hookRef, forwardedRef, localRef],
  );

const ModernImg: React.FC<ForwardedImgProps> = ({
  sizes,
  loading,
  decoding,
  alt,
  title,
  src: directSrc,
  eager,
  width,
  height,
  fetchPriority,
  intersectionMargin,
  intersectionThreshold,
  optixFlowConfig,
  useDebugMode,
  forwardedRef,
  ...restProps
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pictureRef = useRef<HTMLPictureElement | null>(null);

  useResponsiveReset(pictureRef);
  useMediaSelectionEffect();

  const normalizedSrc = useMemo(
    () => (typeof directSrc === "string" ? directSrc.trim() : ""),
    [directSrc],
  );
  const numericWidth = useMemo(() => parseDimension(width), [width]);
  const numericHeight = useMemo(() => parseDimension(height), [height]);
  const resolvedOptixConfig = useMemo(
    () => resolveOptixFlowConfig(optixFlowConfig),
    [optixFlowConfig],
  );
  const eagerLoad = useMemo(() => {
    return eager ?? loading === "eager";
  }, [eager, loading]);

  const hookOptions = useMemo(
    () => ({
      src: normalizedSrc,
      eager: eagerLoad,
      width: numericWidth,
      height: numericHeight,
      rootMargin: intersectionMargin ?? "200px",
      threshold: intersectionThreshold ?? 0.1,
      optixFlowConfig: resolvedOptixConfig,
    }),
    [
      normalizedSrc,
      eagerLoad,
      numericWidth,
      numericHeight,
      intersectionMargin,
      intersectionThreshold,
      resolvedOptixConfig,
    ],
  );

  const {
    ref: hookRef,
    src,
    srcset,
    sizes: computedSizes,
    loading: hookLoading,
    isInView,
    size,
  } = useOptimizedImage(hookOptions);

  const mergedRef = composeRefs(hookRef, forwardedRef, imgRef);

  const sizesAttr = useMemo(() => {
    return sizes ?? (computedSizes || undefined);
  }, [sizes, computedSizes]);
  const loadingAttr = useMemo(() => {
    return loading ?? hookLoading ?? "lazy";
  }, [loading, hookLoading]);
  const decodingAttr = useMemo(() => {
    return decoding ?? "async";
  }, [decoding]);
  const fetchPriorityAttr = useMemo(() => {
    return fetchPriority ?? (eagerLoad ? "high" : undefined);
  }, [fetchPriority, eagerLoad]);

  const hasSrcSet = useMemo(() => {
    return Boolean(srcset.avif || srcset.webp || srcset.jpeg);
  }, [srcset.avif, srcset.webp, srcset.jpeg]);
  const imgSrc = useMemo(() => {
    return src || normalizedSrc || TRANSPARENT_PIXEL;
  }, [src, normalizedSrc]);
  const inlineSrcSet = useMemo(() => {
    return hasSrcSet && !srcset.avif && !srcset.webp ? srcset.jpeg : "";
  }, [hasSrcSet, srcset.avif, srcset.webp, srcset.jpeg]);

  const widthAttr = useMemo(() => {
    return numericWidth ?? (size.width || undefined);
  }, [numericWidth, size?.width]);
  const heightAttr = useMemo(() => {
    return numericHeight ?? (size.height || undefined);
  }, [numericHeight, size?.height]);

  useImgDebugLog({
    enabled: useDebugMode ?? false,
    eagerLoad,
    isInView,
    imgSrc,
    transparentPixel: TRANSPARENT_PIXEL,
    srcset,
    sizesAttr,
  });

  if (!hasSrcSet) {
    return (
      <img
        ref={mergedRef}
        src={imgSrc}
        loading={loadingAttr}
        decoding={decodingAttr}
        fetchPriority={fetchPriorityAttr}
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
      {srcset.avif ? (
        <source type="image/avif" srcSet={srcset.avif} sizes={sizesAttr} />
      ) : null}
      {srcset.webp ? (
        <source type="image/webp" srcSet={srcset.webp} sizes={sizesAttr} />
      ) : null}
      <img
        ref={mergedRef}
        src={imgSrc}
        srcSet={inlineSrcSet || undefined}
        sizes={inlineSrcSet ? sizesAttr : undefined}
        loading={loadingAttr}
        decoding={decodingAttr}
        fetchPriority={fetchPriorityAttr}
        alt={alt}
        title={title}
        width={widthAttr}
        height={heightAttr}
        {...restProps}
      />
    </picture>
  );
};

const ImgBase = forwardRef<HTMLImageElement, ImgProps>(
  function Img(props, ref) {
    const hasSrc = typeof props.src === "string" && props.src.trim().length > 0;
    if (!hasSrc) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("<Img /> requires src. No src provided, rendering null.");
      }
      return null;
    }

    return <ModernImg {...props} forwardedRef={ref} />;
  },
);

export const Img = memo(ImgBase);
Img.displayName = "PageSpeedImg";
