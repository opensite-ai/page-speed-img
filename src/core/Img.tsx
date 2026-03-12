"use client";

import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useOptimizedImage } from "@page-speed/hooks/media";
import type { UseOptimizedImageOptions } from "@page-speed/hooks/media";
import { useImgDebugLog } from "./useImgDebugLog.js";
import { useMediaSelectionEffect } from "./useMediaSelectionEffect.js";
import { useResponsiveReset } from "./useResponsiveReset.js";

type NativeImgProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src" | "srcSet" | "sizes" | "fetchPriority"
> & {
  src?: string;
};

export type ImgProps = NativeImgProps & {
  /** Explicit sizes attribute (otherwise derived from useOptimizedImage) */
  sizes?: string;
  /** Fetch priority hint – maps to the HTML `fetchpriority` attribute */
  fetchPriority?: "high" | "low" | "auto";
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

/** Merges the hook ref, the forwarded ref, and a local ref into a single callback ref. */
function useComposeRefs(
  hookRef: (node: HTMLImageElement | null) => void,
  forwardedRef: React.Ref<HTMLImageElement | null>,
  localRef: React.MutableRefObject<HTMLImageElement | null>,
) {
  return useCallback(
    (node: HTMLImageElement | null) => {
      hookRef(node);
      localRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef && typeof forwardedRef === "object") {
        (forwardedRef as React.MutableRefObject<HTMLImageElement | null>).current = node;
      }
    },
    [hookRef, forwardedRef, localRef],
  );
}

const ModernImg: React.FC<ForwardedImgProps> = ({
  sizes,
  loading,
  decoding,
  alt,
  title,
  src: directSrc,
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

  const numericWidth = parseDimension(width);
  const numericHeight = parseDimension(height);

  const resolvedOptixConfig = useMemo(
    () => resolveOptixFlowConfig(optixFlowConfig),
    [optixFlowConfig],
  );

  const isEagerLoad = loading === "eager";

  const hookOptions = useMemo(
    () => ({
      src: normalizedSrc,
      eager: isEagerLoad,
      width: numericWidth,
      height: numericHeight,
      rootMargin: intersectionMargin ?? "200px",
      threshold: intersectionThreshold ?? 0.1,
      optixFlowConfig: resolvedOptixConfig,
    }),
    [
      normalizedSrc,
      isEagerLoad,
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

  const mergedRef = useComposeRefs(hookRef, forwardedRef, imgRef);

  // Compute fetchpriority: explicit prop wins, otherwise "high" for eager loads
  const resolvedFetchPriority = fetchPriority ?? (isEagerLoad ? "high" : undefined);

  // Apply fetchpriority via DOM API for React 18 compatibility
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    if (resolvedFetchPriority) {
      el.setAttribute("fetchpriority", resolvedFetchPriority);
    } else {
      el.removeAttribute("fetchpriority");
    }
  }, [resolvedFetchPriority]);

  // Derived values
  const imgSrc = src || normalizedSrc || TRANSPARENT_PIXEL;
  const hasSrcSet = Boolean(srcset.avif || srcset.webp || srcset.jpeg);
  const inlineSrcSet = hasSrcSet && !srcset.avif && !srcset.webp ? srcset.jpeg : undefined;
  const sizesAttr = sizes ?? computedSizes ?? undefined;

  useImgDebugLog({
    enabled: useDebugMode ?? false,
    eagerLoad: isEagerLoad,
    isInView,
    imgSrc,
    transparentPixel: TRANSPARENT_PIXEL,
    srcset,
    sizesAttr,
  });

  // Shared img props for both render paths
  const imgProps = {
    ...restProps,
    ref: mergedRef,
    src: imgSrc,
    loading: loading ?? hookLoading ?? "lazy",
    decoding: decoding ?? "async",
    alt,
    title,
    width: numericWidth ?? size.width ?? undefined,
    height: numericHeight ?? size.height ?? undefined,
  } as const;

  if (!hasSrcSet) {
    return <img {...imgProps} />;
  }

  return (
    <picture ref={pictureRef}>
      {srcset.avif && <source type="image/avif" srcSet={srcset.avif} sizes={sizesAttr} />}
      {srcset.webp && <source type="image/webp" srcSet={srcset.webp} sizes={sizesAttr} />}
      <img {...imgProps} srcSet={inlineSrcSet} sizes={inlineSrcSet ? sizesAttr : undefined} />
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
