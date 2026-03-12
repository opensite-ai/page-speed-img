import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";

// Import from source to ensure TS/ESM paths and syntax are valid
import { Img, setDefaultOptixFlowConfig, ImgDefaults } from "../src/index.ts";
import { sendMediaSelection } from "../src/core/useMediaSelectionEffect.ts";
import { resetResponsivePictureState } from "../src/core/useResponsiveReset.ts";

describe("package smoke tests", () => {
  const originalInfo = console.info;

  beforeEach(() => {
    console.info = vi.fn();
  });

  afterEach(() => {
    console.info = originalInfo;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exports Img component", () => {
    expect(Img).toBeTruthy();
    // displayName is set explicitly for consumers
    expect((Img as any).displayName).toBe("PageSpeedImg");
    expect(typeof setDefaultOptixFlowConfig).toBe("function");
  });

  it("exports ImgDefaults component", () => {
    expect(ImgDefaults).toBeTruthy();
    expect(typeof ImgDefaults).toBe("function");
    // Should be a valid React component function
    expect(ImgDefaults.name).toBe("ImgDefaults");
  });

  it("dispatches media selection events with payload", () => {
    const listener = vi.fn((event: Event) => event);
    window.addEventListener("dt:media-selected", listener);

    sendMediaSelection("block-123", { mediaId: 42 });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({
      blockId: "block-123",
      payload: { mediaId: 42 },
    });

    window.removeEventListener("dt:media-selected", listener);
  });

  it("core: resetResponsivePictureState is safe with null", () => {
    // This should be a no-op and should not throw
    expect(() => resetResponsivePictureState(null)).not.toThrow();
  });

  it("core: resetResponsivePictureState re-applies srcset", () => {
    const picture = document.createElement("picture");
    const source = document.createElement("source");
    source.setAttribute("srcset", "https://example.com/image.avif 1x");
    picture.appendChild(source);
    document.body.appendChild(picture);

    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });

    resetResponsivePictureState(picture);

    expect(source.getAttribute("data-srcset")).toBe(
      "https://example.com/image.avif 1x",
    );
    expect(source.getAttribute("srcset")).toBe(
      "https://example.com/image.avif 1x",
    );

    document.body.removeChild(picture);
  });

  it("renders picture sources when OptixFlow is enabled", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Img
          src="https://example.com/image.jpg"
          alt="Demo"
          width={480}
          height={320}
          loading="eager"
          optixFlowConfig={{ apiKey: "test-key" }}
        />,
      );
    });

    const picture = container.querySelector("picture");
    expect(picture).toBeTruthy();
    expect(picture?.querySelector('source[type="image/avif"]')).toBeTruthy();
    expect(picture?.querySelector('source[type="image/webp"]')).toBeTruthy();

    act(() => {
      root.unmount();
    });
  });

  it("renders a plain img when OptixFlow is disabled", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Img
          src="https://example.com/plain.jpg"
          alt="Plain"
          width={640}
          height={360}
          loading="eager"
        />,
      );
    });

    const picture = container.querySelector("picture");
    const img = container.querySelector("img");
    expect(picture).toBeNull();
    expect(img).toBeTruthy();
    expect(img?.getAttribute("src")).toBe("https://example.com/plain.jpg");

    act(() => {
      root.unmount();
    });
  });
});
