import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// vitest config usa globals:false → registro manual do cleanup do Testing Library
// (sem isso o DOM acumula entre testes e getByText acusa múltiplos elementos).
afterEach(() => {
  cleanup();
});

// jsdom não implementa matchMedia (necessário pelo Recharts ResponsiveContainer).
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    onchange: null,
    dispatchEvent: () => false,
  });
}

// jsdom não implementa ResizeObserver (Recharts ResponsiveContainer).
if (
  typeof window !== "undefined" &&
  typeof window.ResizeObserver !== "function"
) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
}
