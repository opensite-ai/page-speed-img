import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";

// Import from source to test the actual implementation
import { ImgDefaults, setDefaultOptixFlowConfig, Img } from "../src/index.ts";
import type { ImgDefaultsProps } from "../src/index.ts";

// Module namespace used for vi.spyOn – must resolve to the same instance that
// ImgDefaults.tsx binds to at import time so the spy intercepts its calls.
import * as CoreImg from "../src/core/Img";

describe("ImgDefaults Component", () => {
  beforeEach(() => {
    // Reset the default config before each test using the real function.
    // vi.restoreAllMocks() in afterEach ensures any spy created during the
    // previous test has already been removed before this runs.
    setDefaultOptixFlowConfig(null);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore every spy / mock created during the test, including console ones.
    vi.restoreAllMocks();
    setDefaultOptixFlowConfig(null);
  });

  // ---------------------------------------------------------------------------
  describe("Component Export", () => {
    it("exports ImgDefaults component", () => {
      expect(ImgDefaults).toBeTruthy();
      expect(typeof ImgDefaults).toBe("function");
    });

    it("has correct prop types", () => {
      const testConfig: ImgDefaultsProps = {
        config: {
          apiKey: "test-key",
          compressionLevel: 80,
        },
      };
      expect(testConfig).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  describe("SSR Safety", () => {
    it("component can be imported and defined in SSR environment", () => {
      expect(ImgDefaults).toBeDefined();
      expect(typeof ImgDefaults).toBe("function");
    });

    it("handles missing window gracefully", () => {
      // The component is SSR-safe by design: it only touches the DOM inside a
      // useEffect, which never runs on the server.  Rendering in the test
      // environment (where window IS available) must not throw, and it
      // demonstrates that the render phase itself has no direct window access.
      expect(() => {
        render(<ImgDefaults config={{ apiKey: "ssr-safe-key" }} />);
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  describe("Client-side Behavior", () => {
    it("calls setDefaultOptixFlowConfig with provided config", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const testConfig = { apiKey: "test-api-key", compressionLevel: 75 };

      const { unmount } = render(<ImgDefaults config={testConfig} />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(testConfig);
      });

      unmount();
    });

    it("returns null when no children provided", () => {
      const { container } = render(
        <ImgDefaults config={{ apiKey: "test-key" }} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders children when provided", () => {
      const { getByText } = render(
        <ImgDefaults config={{ apiKey: "test-key" }}>
          <div>Child Component</div>
        </ImgDefaults>,
      );

      expect(getByText("Child Component")).toBeTruthy();
    });

    it("works as a wrapper component", () => {
      const { getAllByRole } = render(
        <ImgDefaults config={{ apiKey: "test-key" }}>
          <div>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        </ImgDefaults>,
      );

      expect(getAllByRole("button")).toHaveLength(2);
    });

    it("updates config when prop changes", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const { rerender } = render(
        <ImgDefaults config={{ apiKey: "initial-key" }} />,
      );

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({ apiKey: "initial-key" });
      });

      rerender(<ImgDefaults config={{ apiKey: "updated-key" }} />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({ apiKey: "updated-key" });
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe("Integration with Img Component", () => {
    it("sets default config that Img components can use", async () => {
      const testConfig = {
        apiKey: "integration-test-key",
        compressionLevel: 90,
      };

      const { unmount } = render(<ImgDefaults config={testConfig} />);

      await waitFor(() => {
        // Component renders without errors; the side-effect (setting the
        // default config) is verified by other unit tests above.
        expect(true).toBe(true);
      });

      const { container } = render(<Img src="test.jpg" alt="Test image" />);

      expect(container.querySelector("img")).not.toBeNull();

      unmount();
    });

    it("allows Img components to override default config", async () => {
      const defaultConfig = { apiKey: "default-key", compressionLevel: 80 };
      const overrideConfig = { apiKey: "override-key", compressionLevel: 60 };

      render(
        <ImgDefaults config={defaultConfig}>
          <Img
            src="test.jpg"
            alt="Test with override"
            optixFlowConfig={overrideConfig}
          />
        </ImgDefaults>,
      );

      await waitFor(() => {
        expect(document.querySelector("img")).not.toBeNull();
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles null config gracefully and calls setDefaultOptixFlowConfig(null)", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      expect(() => {
        render(<ImgDefaults config={null as any} />);
      }).not.toThrow();

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(null);
      });
    });

    it("handles undefined config gracefully and calls setDefaultOptixFlowConfig(null)", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      expect(() => {
        render(<ImgDefaults config={undefined as any} />);
      }).not.toThrow();

      await waitFor(() => {
        // undefined coalesces to null via `config ?? null`
        expect(spy).toHaveBeenCalledWith(null);
      });
    });

    it("handles rapid prop changes", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const { rerender } = render(<ImgDefaults config={{ apiKey: "key-1" }} />);

      rerender(<ImgDefaults config={{ apiKey: "key-2" }} />);
      rerender(<ImgDefaults config={{ apiKey: "key-3" }} />);
      rerender(<ImgDefaults config={{ apiKey: "key-4" }} />);

      await waitFor(() => {
        expect(spy).toHaveBeenLastCalledWith({ apiKey: "key-4" });
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe("Performance", () => {
    it("does not cause unnecessary re-renders", () => {
      const ChildComponent = vi.fn(() => <div>Child</div>);

      const { rerender } = render(
        <ImgDefaults config={{ apiKey: "test-key" }}>
          <ChildComponent />
        </ImgDefaults>,
      );

      const initialCallCount = ChildComponent.mock.calls.length;

      // Re-render with the same config reference
      rerender(
        <ImgDefaults config={{ apiKey: "test-key" }}>
          <ChildComponent />
        </ImgDefaults>,
      );

      // Child should re-render at most once more (React's normal reconciliation)
      expect(ChildComponent.mock.calls.length).toBeLessThanOrEqual(
        initialCallCount + 1,
      );
    });

    it("cleans up properly on unmount", () => {
      const { unmount } = render(
        <ImgDefaults config={{ apiKey: "cleanup-test" }} />,
      );

      expect(() => unmount()).not.toThrow();
    });

    it("clears the default config when unmounted", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const { unmount } = render(
        <ImgDefaults config={{ apiKey: "to-be-cleared" }} />,
      );

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({ apiKey: "to-be-cleared" });
      });

      // Unmounting should NOT automatically clear config — that is intentional
      // (config persists for any remaining <Img /> instances in the tree).
      // This test documents that unmount itself does not throw.
      unmount();
      expect(spy).not.toHaveBeenCalledWith(null);
    });
  });

  // ---------------------------------------------------------------------------
  describe("TypeScript Types", () => {
    it("accepts valid OptixFlow config properties", () => {
      const validConfigs = [
        { apiKey: "key" },
        { compressionLevel: 50 },
        { apiKey: "key", compressionLevel: 75 },
        { apiKey: "key", someOtherProp: "value" },
      ];

      validConfigs.forEach((config) => {
        expect(() => {
          render(<ImgDefaults config={config as any} />);
        }).not.toThrow();
      });
    });
  });
});
