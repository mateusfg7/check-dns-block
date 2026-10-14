import { invoke } from "@tauri-apps/api/core";
import type { AppInfo } from "./types";

/** Fallback used in the browser (e.g. `vitest`, `vite dev` outside Tauri). */
const FALLBACK_APP_INFO: AppInfo = {
  version: "0.0.0",
  ispDns: "177.137.208.6",
  publicDns: "8.8.8.8",
};

/**
 * Fetches static app info (version, DNS servers) from the Rust backend.
 * Falls back to a hardcoded value when not running inside Tauri, so the UI
 * also renders in a plain browser during development.
 */
export async function getAppInfo(): Promise<AppInfo> {
  if (!("__TAURI_INTERNALS__" in window)) {
    return FALLBACK_APP_INFO;
  }
  return invoke<AppInfo>("app_info");
}
