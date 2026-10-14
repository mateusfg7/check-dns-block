import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// `@tauri-apps/api` throws outside a real Tauri webview; stub it for tests
// that render components which call `invoke` (directly or via src/lib/ipc.ts).
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({
    version: "0.0.0-test",
    ispDns: "177.137.208.6",
    publicDns: "8.8.8.8",
  }),
}));
