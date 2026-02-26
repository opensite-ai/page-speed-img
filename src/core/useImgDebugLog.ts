import { useEffect, useRef } from "react";

interface ImgDebugLogParams {
  enabled: boolean;
  eagerLoad: boolean;
  isInView: boolean;
  imgSrc: string;
  transparentPixel: string;
  srcset: { avif: string; webp: string; jpeg: string };
  sizesAttr: string | undefined;
}

/**
 * Logs image-request details to the console when `enabled` is true.
 * When disabled (the default), the hook short-circuits on the very first
 * line so there is no meaningful runtime cost.
 */
export function useImgDebugLog({
  enabled,
  eagerLoad,
  isInView,
  imgSrc,
  transparentPixel,
  srcset,
  sizesAttr,
}: ImgDebugLogParams): void {
  const logKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!eagerLoad && !isInView) return;
    if (!imgSrc || imgSrc === transparentPixel) return;

    const logKey = [
      imgSrc,
      srcset.avif,
      srcset.webp,
      srcset.jpeg,
      sizesAttr ?? "",
    ].join("|");

    if (logKeyRef.current === logKey) return;
    logKeyRef.current = logKey;

    if (typeof console !== "undefined" && console.info) {
      console.info("[PageSpeedImg] image request", {
        src: imgSrc,
        srcset,
        sizes: sizesAttr,
      });
    }
  }, [
    enabled,
    eagerLoad,
    imgSrc,
    isInView,
    sizesAttr,
    srcset.avif,
    srcset.webp,
    srcset.jpeg,
    transparentPixel,
  ]);
}
