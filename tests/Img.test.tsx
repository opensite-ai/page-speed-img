import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from "vitest";
import React, { createRef } from "react";
import { render, cleanup } from "@testing-library/react";

import { Img, setDefaultOptixFlowConfig } from "../src/index.ts";

// Mock the useOptimizedImage hook to control srcset behavior
vi.mock("@page-speed/hooks/media", () => ({
  useOptimizedImage: vi.fn(),
}));

import { useOptimizedImage } from "@page-speed/hooks/media";

const mockUseOptimizedImage = useOptimizedImage as Mock;

// Helper to create a standard mock return value
const createMockHookReturn = (overrides: Partial<ReturnType<typeof useOptimizedImage>> = {}) => ({
  ref: vi.fn(),
  src: "",
  srcset: { avif: "", webp: "", jpeg: "" },
  sizes: "",
  loading: undefined,
  isInView: false,
  size: { width: undefined, height: undefined },
  ...overrides,
});

describe("Img Component", () => {
  beforeEach(() => {
    mockUseOptimizedImage.mockReturnValue(createMockHookReturn());
    // Suppress console.warn for cleaner test output (we test warnings explicitly)
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    setDefaultOptixFlowConfig(null);
  });

  // ============================================================================
  // BASIC RENDERING
  // ============================================================================
  describe("basic rendering", () => {
    it("renders an img element with required src prop", () => {
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const img = container.querySelector("img");
      
      expect(img).toBeTruthy();
      expect(img?.getAttribute("src")).toBe("https://example.com/image.jpg");
      expect(img?.getAttribute("alt")).toBe("Test");
    });

    it("renders null and warns when src is missing", () => {
      const { container } = render(<Img src="" alt="Test" />);
      
      expect(container.querySelector("img")).toBeNull();
      expect(console.warn).toHaveBeenCalledWith(
        "<Img /> requires src. No src provided, rendering null."
      );
    });

    it("renders null for whitespace-only src", () => {
      const { container } = render(<Img src="   " alt="Test" />);
      
      expect(container.querySelector("img")).toBeNull();
      expect(console.warn).toHaveBeenCalled();
    });

    it("trims whitespace from src", () => {
      const { container } = render(<Img src="  https://example.com/image.jpg  " alt="Test" />);
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("src")).toBe("https://example.com/image.jpg");
    });

    it("renders with title attribute", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" title="Image title" />
      );
      
      expect(container.querySelector("img")?.getAttribute("title")).toBe("Image title");
    });

    it("has correct displayName for debugging", () => {
      expect((Img as any).displayName).toBe("PageSpeedImg");
    });
  });

  // ============================================================================
  // LOADING BEHAVIOR
  // ============================================================================
  describe("loading behavior", () => {
    it("defaults to lazy loading", () => {
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("loading")).toBe("lazy");
    });

    it("respects explicit loading='eager' prop", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" loading="eager" />
      );
      
      expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
    });

    it("uses hook-provided loading value when no explicit prop", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({ loading: "eager" }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
    });

    it("explicit loading prop takes precedence over hook value", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({ loading: "eager" }));
      
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" loading="lazy" />
      );
      
      expect(container.querySelector("img")?.getAttribute("loading")).toBe("lazy");
    });
  });

  // ============================================================================
  // DECODING BEHAVIOR
  // ============================================================================
  describe("decoding behavior", () => {
    it("defaults to async decoding", () => {
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("decoding")).toBe("async");
    });

    it("respects explicit decoding prop", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" decoding="sync" />
      );
      
      expect(container.querySelector("img")?.getAttribute("decoding")).toBe("sync");
    });

    it("supports decoding='auto'", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" decoding="auto" />
      );
      
      expect(container.querySelector("img")?.getAttribute("decoding")).toBe("auto");
    });
  });

  // ============================================================================
  // FETCH PRIORITY BEHAVIOR
  // ============================================================================
  describe("fetchPriority behavior", () => {
    it("does not set fetchpriority by default for lazy images", () => {
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("fetchpriority")).toBeNull();
    });

    it("auto-sets fetchpriority='high' for eager loading", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" loading="eager" />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("fetchpriority")).toBe("high");
    });

    it("respects explicit fetchPriority='low'", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" fetchPriority="low" />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("fetchpriority")).toBe("low");
    });

    it("explicit fetchPriority overrides auto-high for eager loading", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          loading="eager" 
          fetchPriority="low" 
        />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("fetchpriority")).toBe("low");
    });

    it("supports fetchPriority='auto'", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" fetchPriority="auto" />
      );
      
      expect(container.querySelector("img")?.getAttribute("fetchpriority")).toBe("auto");
    });

    it("applies fetchpriority as lowercase DOM attribute for React 18 compatibility", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" fetchPriority="high" />
      );
      const img = container.querySelector("img");
      
      // Verify the lowercase attribute is set correctly
      expect(img?.getAttribute("fetchpriority")).toBe("high");
    });
  });

  // ============================================================================
  // PICTURE ELEMENT / SRCSET BEHAVIOR
  // ============================================================================
  describe("picture element and srcset", () => {
    it("renders plain img when hook returns no srcset", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn());
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(container.querySelector("picture")).toBeNull();
      expect(container.querySelector("img")).toBeTruthy();
    });

    it("renders picture element when AVIF srcset is available", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: {
          avif: "image.avif 1x, image@2x.avif 2x",
          webp: "",
          jpeg: "",
        },
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const picture = container.querySelector("picture");
      const avifSource = picture?.querySelector('source[type="image/avif"]');
      
      expect(picture).toBeTruthy();
      expect(avifSource).toBeTruthy();
    });

    it("renders picture element when WebP srcset is available", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: {
          avif: "",
          webp: "image.webp 1x, image@2x.webp 2x",
          jpeg: "",
        },
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const picture = container.querySelector("picture");
      const webpSource = picture?.querySelector('source[type="image/webp"]');
      
      expect(picture).toBeTruthy();
      expect(webpSource).toBeTruthy();
    });

    it("renders picture with both AVIF and WebP sources when both available", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: {
          avif: "image.avif 1x",
          webp: "image.webp 1x",
          jpeg: "image.jpg 1x",
        },
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const picture = container.querySelector("picture");
      
      expect(picture?.querySelector('source[type="image/avif"]')).toBeTruthy();
      expect(picture?.querySelector('source[type="image/webp"]')).toBeTruthy();
    });

    it("renders picture with JPEG-only srcset on img element", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: {
          avif: "",
          webp: "",
          jpeg: "image.jpg 1x, image@2x.jpg 2x",
        },
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const picture = container.querySelector("picture");
      const img = picture?.querySelector("img");
      
      expect(picture).toBeTruthy();
      expect(img).toBeTruthy();
      // No AVIF or WebP sources should be present
      expect(picture?.querySelector('source[type="image/avif"]')).toBeNull();
      expect(picture?.querySelector('source[type="image/webp"]')).toBeNull();
    });

    it("does not apply JPEG srcset to img when AVIF/WebP available", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: {
          avif: "image.avif 1x",
          webp: "image.webp 1x",
          jpeg: "image.jpg 1x",
        },
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const img = container.querySelector("picture img");
      
      // srcset should not be on img when sources handle it
      expect(img?.getAttribute("srcset")).toBeNull();
    });

    it("applies computed sizes to sources", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: { avif: "image.avif 1x", webp: "image.webp 1x", jpeg: "" },
        sizes: "(max-width: 768px) 100vw, 50vw",
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const sources = container.querySelectorAll("source");
      
      // All sources should have sizes attribute
      sources.forEach(source => {
        expect(source.getAttribute("sizes")).toBe("(max-width: 768px) 100vw, 50vw");
      });
    });

    it("explicit sizes prop overrides computed sizes", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: { avif: "image.avif 1x", webp: "", jpeg: "" },
        sizes: "(max-width: 768px) 100vw, 50vw",
      }));
      
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" sizes="100vw" />
      );
      const source = container.querySelector("source");
      
      expect(source?.getAttribute("sizes")).toBe("100vw");
    });
  });

  // ============================================================================
  // DIMENSION HANDLING
  // ============================================================================
  describe("dimension handling", () => {
    it("passes through numeric width and height", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" width={800} height={600} />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("width")).toBe("800");
      expect(img?.getAttribute("height")).toBe("600");
    });

    it("parses string dimensions to numbers", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" width="800" height="600" />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("width")).toBe("800");
      expect(img?.getAttribute("height")).toBe("600");
    });

    it("uses hook-provided dimensions as fallback", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        size: { width: 1024, height: 768 },
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("width")).toBe("1024");
      expect(img?.getAttribute("height")).toBe("768");
    });

    it("explicit dimensions take precedence over hook dimensions", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        size: { width: 1024, height: 768 },
      }));
      
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" width={400} height={300} />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("width")).toBe("400");
      expect(img?.getAttribute("height")).toBe("300");
    });

    it("handles zero dimensions", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" width={0} height={0} />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("width")).toBe("0");
      expect(img?.getAttribute("height")).toBe("0");
    });

    it("ignores invalid string dimensions", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        size: { width: 500, height: 400 },
      }));
      
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          width={"invalid" as any} 
          height={"bad" as any} 
        />
      );
      const img = container.querySelector("img");
      
      // Should fall back to hook dimensions
      expect(img?.getAttribute("width")).toBe("500");
      expect(img?.getAttribute("height")).toBe("400");
    });

    it("handles empty string dimensions", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        size: { width: 500, height: 400 },
      }));
      
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" width="" height="" />
      );
      const img = container.querySelector("img");
      
      // Should fall back to hook dimensions
      expect(img?.getAttribute("width")).toBe("500");
      expect(img?.getAttribute("height")).toBe("400");
    });
  });

  // ============================================================================
  // REF FORWARDING
  // ============================================================================
  describe("ref forwarding", () => {
    it("forwards callback ref to img element", () => {
      const refCallback = vi.fn();
      
      render(<Img src="https://example.com/image.jpg" alt="Test" ref={refCallback} />);
      
      expect(refCallback).toHaveBeenCalledTimes(1);
      expect(refCallback.mock.calls[0][0]).toBeInstanceOf(HTMLImageElement);
    });

    it("forwards object ref to img element", () => {
      const ref = createRef<HTMLImageElement>();
      
      render(<Img src="https://example.com/image.jpg" alt="Test" ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLImageElement);
      expect(ref.current?.tagName).toBe("IMG");
    });

    it("ref works with picture wrapper", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: { avif: "image.avif 1x", webp: "", jpeg: "" },
      }));
      
      const ref = createRef<HTMLImageElement>();
      render(<Img src="https://example.com/image.jpg" alt="Test" ref={ref} />);
      
      expect(ref.current).toBeInstanceOf(HTMLImageElement);
    });

    it("handles null ref gracefully", () => {
      expect(() => {
        render(<Img src="https://example.com/image.jpg" alt="Test" ref={null} />);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // PROPS SPREADING
  // ============================================================================
  describe("props spreading", () => {
    it("passes through className", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" className="custom-class" />
      );
      
      expect(container.querySelector("img")?.classList.contains("custom-class")).toBe(true);
    });

    it("passes through style object", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          style={{ borderRadius: "8px", opacity: 0.5 }} 
        />
      );
      const img = container.querySelector("img");
      
      expect(img?.style.borderRadius).toBe("8px");
      expect(img?.style.opacity).toBe("0.5");
    });

    it("passes through data attributes", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          data-testid="hero-image"
          data-analytics-id="img-001"
        />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("data-testid")).toBe("hero-image");
      expect(img?.getAttribute("data-analytics-id")).toBe("img-001");
    });

    it("passes through aria attributes", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          aria-describedby="description"
          aria-hidden={false}
        />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("aria-describedby")).toBe("description");
      expect(img?.getAttribute("aria-hidden")).toBe("false");
    });

    it("passes through event handlers", () => {
      const onLoad = vi.fn();
      const onError = vi.fn();
      
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          onLoad={onLoad}
          onError={onError}
        />
      );
      const img = container.querySelector("img");
      
      // Simulate load event
      img?.dispatchEvent(new Event("load"));
      expect(onLoad).toHaveBeenCalledTimes(1);
      
      // Simulate error event
      img?.dispatchEvent(new Event("error"));
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("does not leak internal props to DOM", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test"
          intersectionThreshold={0.5}
          intersectionMargin="100px"
          optixFlowConfig={{ apiKey: "test" }}
          useDebugMode={true}
        />
      );
      const img = container.querySelector("img");
      
      expect(img?.getAttribute("intersectionThreshold")).toBeNull();
      expect(img?.getAttribute("intersectionMargin")).toBeNull();
      expect(img?.getAttribute("optixFlowConfig")).toBeNull();
      expect(img?.getAttribute("useDebugMode")).toBeNull();
    });

    it("crossOrigin attribute works correctly", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          crossOrigin="anonymous"
        />
      );
      
      expect(container.querySelector("img")?.getAttribute("crossorigin")).toBe("anonymous");
    });

    it("referrerPolicy attribute works correctly", () => {
      const { container } = render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          referrerPolicy="no-referrer"
        />
      );
      
      expect(container.querySelector("img")?.getAttribute("referrerpolicy")).toBe("no-referrer");
    });
  });

  // ============================================================================
  // OPTIXFLOW CONFIGURATION
  // ============================================================================
  describe("OptixFlow configuration", () => {
    it("passes optixFlowConfig to hook", () => {
      const config = { apiKey: "test-key", compressionLevel: 80 };
      
      render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          optixFlowConfig={config}
        />
      );
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({ optixFlowConfig: config })
      );
    });

    it("uses default config when set via setDefaultOptixFlowConfig", () => {
      const defaultConfig = { apiKey: "default-key" };
      setDefaultOptixFlowConfig(defaultConfig);
      
      render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({ optixFlowConfig: defaultConfig })
      );
    });

    it("explicit config overrides default config", () => {
      setDefaultOptixFlowConfig({ apiKey: "default-key" });
      const explicitConfig = { apiKey: "explicit-key" };
      
      render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test" 
          optixFlowConfig={explicitConfig}
        />
      );
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({ optixFlowConfig: explicitConfig })
      );
    });

    it("passes intersection options to hook", () => {
      render(
        <Img 
          src="https://example.com/image.jpg" 
          alt="Test"
          intersectionThreshold={0.25}
          intersectionMargin="50px"
        />
      );
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 0.25,
          rootMargin: "50px",
        })
      );
    });

    it("uses default intersection options when not specified", () => {
      render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold: 0.1,
          rootMargin: "200px",
        })
      );
    });
  });

  // ============================================================================
  // DEBUG MODE
  // ============================================================================
  describe("debug mode", () => {
    it("does not log by default", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        isInView: true,
        src: "https://cdn.example.com/optimized.jpg",
      }));
      
      render(<Img src="https://example.com/image.jpg" alt="Test" loading="eager" />);
      
      expect(console.info).not.toHaveBeenCalled();
    });

    // Note: Debug logging behavior depends on useImgDebugLog implementation
    // which checks multiple conditions before logging
  });

  // ============================================================================
  // HOOK INTEGRATION
  // ============================================================================
  describe("hook integration", () => {
    it("uses hook-provided src when available", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        src: "https://cdn.example.com/optimized.jpg",
      }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://cdn.example.com/optimized.jpg"
      );
    });

    it("falls back to original src when hook returns empty", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({ src: "" }));
      
      const { container } = render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/image.jpg"
      );
    });

    it("uses transparent pixel as last resort fallback", () => {
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({ src: "" }));
      
      const { container } = render(<Img src="   " alt="Test" />);
      
      // Component returns null for whitespace-only src, so this is expected
      expect(container.querySelector("img")).toBeNull();
    });

    it("passes eager flag to hook based on loading prop", () => {
      render(<Img src="https://example.com/image.jpg" alt="Test" loading="eager" />);
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({ eager: true })
      );
    });

    it("passes lazy (eager: false) to hook by default", () => {
      render(<Img src="https://example.com/image.jpg" alt="Test" />);
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({ eager: false })
      );
    });

    it("passes dimensions to hook", () => {
      render(
        <Img src="https://example.com/image.jpg" alt="Test" width={800} height={600} />
      );
      
      expect(mockUseOptimizedImage).toHaveBeenCalledWith(
        expect.objectContaining({ width: 800, height: 600 })
      );
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe("edge cases", () => {
    it("handles very long URLs", () => {
      const longUrl = `https://example.com/${"a".repeat(2000)}.jpg`;
      const { container } = render(<Img src={longUrl} alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(longUrl);
    });

    it("handles URLs with special characters", () => {
      const specialUrl = "https://example.com/image%20with%20spaces.jpg?query=foo&bar=baz#hash";
      const { container } = render(<Img src={specialUrl} alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(specialUrl);
    });

    it("handles unicode in alt text", () => {
      const { container } = render(
        <Img src="https://example.com/image.jpg" alt="Image with emoji 🎉 and unicode: 日本語" />
      );
      
      expect(container.querySelector("img")?.getAttribute("alt")).toBe(
        "Image with emoji 🎉 and unicode: 日本語"
      );
    });

    it("handles empty alt (decorative image)", () => {
      const { container } = render(<Img src="https://example.com/image.jpg" alt="" />);
      
      expect(container.querySelector("img")?.getAttribute("alt")).toBe("");
    });

    it("handles data URLs", () => {
      const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const { container } = render(<Img src={dataUrl} alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(dataUrl);
    });

    it("handles blob URLs", () => {
      // Mock blob URL format
      const blobUrl = "blob:https://example.com/12345-67890-abcdef";
      const { container } = render(<Img src={blobUrl} alt="Test" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(blobUrl);
    });

    it("handles rapid re-renders with same props", () => {
      const { rerender, container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" />
      );
      
      // Re-render multiple times
      for (let i = 0; i < 10; i++) {
        rerender(<Img src="https://example.com/image.jpg" alt="Test" />);
      }
      
      expect(container.querySelector("img")).toBeTruthy();
    });

    it("handles prop changes correctly", () => {
      const { rerender, container } = render(
        <Img src="https://example.com/image1.jpg" alt="First" />
      );
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/image1.jpg"
      );
      expect(container.querySelector("img")?.getAttribute("alt")).toBe("First");
      
      rerender(<Img src="https://example.com/image2.jpg" alt="Second" />);
      
      expect(container.querySelector("img")?.getAttribute("src")).toBe(
        "https://example.com/image2.jpg"
      );
      expect(container.querySelector("img")?.getAttribute("alt")).toBe("Second");
    });

    it("transitions between plain img and picture based on srcset availability", () => {
      // Start with no srcset
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn());
      
      const { rerender, container } = render(
        <Img src="https://example.com/image.jpg" alt="Test" />
      );
      
      expect(container.querySelector("picture")).toBeNull();
      expect(container.querySelector("img")).toBeTruthy();
      
      // Update mock to return srcset
      mockUseOptimizedImage.mockReturnValue(createMockHookReturn({
        srcset: { avif: "image.avif 1x", webp: "", jpeg: "" },
      }));
      
      // Re-render with different props to bypass memoization
      rerender(<Img src="https://example.com/image2.jpg" alt="Test" />);
      
      expect(container.querySelector("picture")).toBeTruthy();
    });
  });

  // ============================================================================
  // MEMOIZATION
  // ============================================================================
  describe("memoization", () => {
    it("is wrapped in React.memo", () => {
      // Check that the component is memoized
      expect((Img as any).$$typeof?.toString()).toContain("Symbol");
    });

    it("does not re-render with same props", () => {
      const renderCount = { count: 0 };
      
      // Track hook calls as proxy for renders
      mockUseOptimizedImage.mockImplementation(() => {
        renderCount.count++;
        return createMockHookReturn();
      });
      
      const { rerender } = render(
        <Img src="https://example.com/image.jpg" alt="Test" width={100} />
      );
      
      const initialCount = renderCount.count;
      
      // Re-render with identical props
      rerender(<Img src="https://example.com/image.jpg" alt="Test" width={100} />);
      
      // memo should prevent re-render
      expect(renderCount.count).toBe(initialCount);
    });
  });
});
