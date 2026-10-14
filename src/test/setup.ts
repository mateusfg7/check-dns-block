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

// Pretend to be inside the Tauri webview so `src/lib/ipc.ts` doesn't
// short-circuit to its browser fallbacks.
Object.defineProperty(window, "__TAURI_INTERNALS__", {
  value: {},
  writable: true,
  configurable: true,
});
