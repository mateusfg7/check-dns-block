import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// `@tauri-apps/api` throws outside a real Tauri webview; stub it for tests
// that render components which call `invoke`/`Channel` (directly or via
// src/lib/ipc.ts). Individual tests can override the default behaviour with
// `vi.mocked(invoke).mockImplementation(...)`.
class MockChannel<T> {
  onmessage: (response: T) => void = () => {};
}

vi.mock("@tauri-apps/api/core", () => ({
  Channel: MockChannel,
  invoke: vi.fn(async (cmd: string) => {
    if (cmd === "app_info") {
      return { version: "0.0.0-test", ispDns: "177.137.208.6", publicDns: "8.8.8.8" };
    }
    return undefined;
  }),
}));

// `getCurrentWindow()` reads window metadata that doesn't exist in jsdom;
// stub it so the custom title bar's window controls can be tested.
export const mockTauriWindow = {
  minimize: vi.fn(async () => {}),
  toggleMaximize: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  isMaximized: vi.fn(async () => false),
  onResized: vi.fn(async () => () => {}),
};

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => mockTauriWindow,
}));

// Pretend to be inside the Tauri webview so `src/lib/ipc.ts` doesn't
// short-circuit to its browser fallbacks.
Object.defineProperty(window, "__TAURI_INTERNALS__", {
  value: {},
  writable: true,
  configurable: true,
});
