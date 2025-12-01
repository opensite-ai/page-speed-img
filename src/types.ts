export type ProgressiveSizes = Partial<Record<'sm' | 'md' | 'lg' | 'full', string>>;

export type ImageVariantsMap = Partial<
  Record<
    'AVIF' | 'WEBP' | 'JPEG',
    ProgressiveSizes & {
      metadata?: {
        widths?: {
          small?: number;
          medium?: number;
          large?: number;
          full_size?: number;
        };
      };
    }
  >
>;

export interface ImageVariantsData {
  variants?: ImageVariantsMap | null;
  metadata?: {
    width?: number;
    height?: number;
  };
  status?: string;
}

export interface ImageData {
  id: number;
  name?: string;
  media_type?: string;
  img_url?: string | null;
  img_src?: string | null;
  thumb_src?: string | null;
  med_src?: string | null;
  file_data_url?: string | null;
  file_data_thumbnail_url?: string | null;
  low_res_thumb?: string | null;
  fallback_url?: string;
  variants_status?: string | null;
  meta?: {
    sizing?: {
      height?: number;
      width?: number;
      size_in_mb?: number;
      aspect_ratio?: number;
    };
    semantic_filename?: string;
    content_manifest?: {
      title?: string;
      summary?: string;
      description?: string;
      optimized_filename?: string;
    };
  };
  variants_data?: ImageVariantsData | null;
}
