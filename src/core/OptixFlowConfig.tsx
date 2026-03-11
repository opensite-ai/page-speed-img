"use client";

import * as React from "react";
import type { UseOptimizedImageOptions } from "@page-speed/hooks/media";
import { setDefaultOptixFlowConfig } from "./Img.js";

/**
 * Props for the OptixFlowConfig component
 */
export interface OptixFlowConfigProps {
  /**
   * OptixFlow configuration to set as default for all images
   * @example { apiKey: 'your-api-key', compressionLevel: 80 }
   */
  config: UseOptimizedImageOptions["optixFlowConfig"];
  /**
   * Optional children (component returns null regardless)
   */
  children?: React.ReactNode;
}

/**
 * A component that sets the default OptixFlow configuration for all Img components
 * in an SSR-safe way. This component should be rendered once at the app root level.
 *
 * The config is applied inside a useEffect, which means it only runs on the client
 * and is never executed during server-side rendering.
 *
 * @example
 * ```tsx
 * // In your app root
 * <OptixFlowConfig config={{ apiKey: 'your-api-key' }}>
 *   <App />
 * </OptixFlowConfig>
 * ```
 *
 * Or without children:
 * ```tsx
 * <OptixFlowConfig config={{ apiKey: 'your-api-key' }} />
 * ```
 */
export function OptixFlowConfig({
  config,
  children,
}: OptixFlowConfigProps): React.ReactElement | null {
  React.useEffect(() => {
    setDefaultOptixFlowConfig(config ?? null);
  }, [config]);

  return children ? <>{children}</> : null;
}
