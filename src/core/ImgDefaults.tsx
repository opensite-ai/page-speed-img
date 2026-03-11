"use client";

import * as React from "react";
import type { UseOptimizedImageOptions } from "@page-speed/hooks/media";
import { setDefaultOptixFlowConfig } from "./Img.js";

/**
 * Props for the ImgDefaults component
 */
export interface ImgDefaultsProps {
  /**
   * OptixFlow configuration to set as default for all images.
   * Pass null or omit to clear any previously set default.
   * @example { apiKey: 'your-api-key', compressionLevel: 80 }
   */
  config?: UseOptimizedImageOptions["optixFlowConfig"] | null;
  /**
   * Optional children — rendered as-is; the component itself has no DOM output.
   */
  children?: React.ReactNode;
}

/**
 * SSR-safe component that sets the default OptixFlow configuration for all
 * <Img /> components in the tree. Place it once at the app root level.
 *
 * Config is applied inside a useEffect, so it **never** runs during
 * server-side rendering and never causes hydration mismatches.
 * When unmounted (or when `config` becomes null/undefined) the default is
 * cleared automatically.
 *
 * @example
 * // As a wrapper (with children):
 * <ImgDefaults config={{ apiKey: 'your-api-key', compressionLevel: 80 }}>
 *   <App />
 * </ImgDefaults>
 *
 * @example
 * // Standalone (no children required):
 * <ImgDefaults config={{ apiKey: 'your-api-key' }} />
 */
export function ImgDefaults({
  config,
  children,
}: ImgDefaultsProps): React.ReactElement | null {
  React.useEffect(() => {
    setDefaultOptixFlowConfig(config ?? null);
  }, [config]);

  return children ? <>{children}</> : null;
}
