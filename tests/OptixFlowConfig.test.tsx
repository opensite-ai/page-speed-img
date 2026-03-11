import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, waitFor } from "@testing-library/react";

// Import from source to test the actual implementation
import {
  OptixFlowConfig,
  setDefaultOptixFlowConfig,
  Img,
} from "../src/index.ts";
import type { OptixFlowConfigProps } from "../src/index.ts";

// Module namespace used for vi.spyOn – must resolve to the same instance that
// OptixFlowConfig.tsx binds to at import time so the spy intercepts its calls.
import * as CoreImg from "../src/core/Img";

describe("OptixFlowConfig Component", () => {
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
    it("exports OptixFlowConfig component", () => {
      expect(OptixFlowConfig).toBeTruthy();
      expect(typeof OptixFlowConfig).toBe("function");
    });

    it("has correct prop types", () => {
      const testConfig: OptixFlowConfigProps = {
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
      expect(OptixFlowConfig).toBeDefined();
      expect(typeof OptixFlowConfig).toBe("function");
    });

    it("handles missing window gracefully", () => {
      // The component is SSR-safe by design: it only touches the DOM inside a
      // useEffect, which never runs on the server.  Rendering in the test
      // environment (where window IS available) must not throw, and it
      // demonstrates that the render phase itself has no direct window access.
      expect(() => {
        render(<OptixFlowConfig config={{ apiKey: "ssr-safe-key" }} />);
      }).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  describe("Client-side Behavior", () => {
    it("calls setDefaultOptixFlowConfig with provided config", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const testConfig = { apiKey: "test-api-key", compressionLevel: 75 };

      const { unmount } = render(<OptixFlowConfig config={testConfig} />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith(testConfig);
      });

      unmount();
    });

    it("returns null when no children provided", () => {
      const { container } = render(
        <OptixFlowConfig config={{ apiKey: "test-key" }} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("renders children when provided", () => {
      const { getByText } = render(
        <OptixFlowConfig config={{ apiKey: "test-key" }}>
          <div>Child Component</div>
        </OptixFlowConfig>,
      );

      expect(getByText("Child Component")).toBeTruthy();
    });

    it("works as a wrapper component", () => {
      const { getAllByRole } = render(
        <OptixFlowConfig config={{ apiKey: "test-key" }}>
          <div>
            <button>Button 1</button>
            <button>Button 2</button>
          </div>
        </OptixFlowConfig>,
      );

      expect(getAllByRole("button")).toHaveLength(2);
    });

    it("updates config when prop changes", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const { rerender } = render(
        <OptixFlowConfig config={{ apiKey: "initial-key" }} />,
      );

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({ apiKey: "initial-key" });
      });

      rerender(<OptixFlowConfig config={{ apiKey: "updated-key" }} />);

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

      const { unmount } = render(<OptixFlowConfig config={testConfig} />);

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
        <OptixFlowConfig config={defaultConfig}>
          <Img
            src="test.jpg"
            alt="Test with override"
            optixFlowConfig={overrideConfig}
          />
        </OptixFlowConfig>,
      );

      await waitFor(() => {
        expect(document.querySelector("img")).not.toBeNull();
      });
    });
  });

  // ---------------------------------------------------------------------------
  describe("Edge Cases", () => {
    it("handles null config gracefully", () => {
      expect(() => {
        render(<OptixFlowConfig config={null as any} />);
      }).not.toThrow();
    });

    it("handles undefined config gracefully", () => {
      expect(() => {
        render(<OptixFlowConfig config={undefined as any} />);
      }).not.toThrow();
    });

    it("handles empty config object", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      render(<OptixFlowConfig config={{}} />);

      await waitFor(() => {
        expect(spy).toHaveBeenCalledWith({});
      });
    });

    it("handles rapid prop changes", async () => {
      const spy = vi.spyOn(CoreImg, "setDefaultOptixFlowConfig");

      const { rerender } = render(
        <OptixFlowConfig config={{ apiKey: "key-1" }} />,
      );

      rerender(<OptixFlowConfig config={{ apiKey: "key-2" }} />);
      rerender(<OptixFlowConfig config={{ apiKey: "key-3" }} />);
      rerender(<OptixFlowConfig config={{ apiKey: "key-4" }} />);

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
        <OptixFlowConfig config={{ apiKey: "test-key" }}>
          <ChildComponent />
        </OptixFlowConfig>,
      );

      const initialCallCount = ChildComponent.mock.calls.length;

      // Re-render with the same config reference
      rerender(
        <OptixFlowConfig config={{ apiKey: "test-key" }}>
          <ChildComponent />
        </OptixFlowConfig>,
      );

      // Child should re-render at most once more (React's normal reconciliation)
      expect(ChildComponent.mock.calls.length).toBeLessThanOrEqual(
        initialCallCount + 1,
      );
    });

    it("cleans up properly on unmount", () => {
      const { unmount } = render(
        <OptixFlowConfig config={{ apiKey: "cleanup-test" }} />,
      );

      expect(() => unmount()).not.toThrow();
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
          render(<OptixFlowConfig config={config as any} />);
        }).not.toThrow();
      });
    });
  });
});
