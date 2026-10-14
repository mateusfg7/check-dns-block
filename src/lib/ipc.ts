import { Channel, invoke } from "@tauri-apps/api/core";
import type { AppInfo, CheckEvent } from "./types";

/** Fallback used in the browser (e.g. `vitest`, `vite dev` outside Tauri). */
export const FALLBACK_APP_INFO: AppInfo = {
  version: "0.0.0",
  ispDns: "177.137.208.6",
  publicDns: "8.8.8.8",
};

function isTauri(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

/**
 * Fetches static app info (version, DNS servers) from the Rust backend.
 * Falls back to a hardcoded value when not running inside Tauri, so the UI
 * also renders in a plain browser during development.
 */
export async function getAppInfo(): Promise<AppInfo> {
  if (!isTauri()) {
    return FALLBACK_APP_INFO;
  }
  return invoke<AppInfo>("app_info");
}

/**
 * Parses, preflights and resolves every domain/IP in `input` against
 * `server` (and, optionally, `reference`), calling `onEvent` for each
 * streamed event. Resolves once the backend sends `finished`, or rejects
 * with a user-facing (Portuguese) error message.
 */
export async function check(
  input: string,
  server: string,
  reference: string | null,
  onEvent: (event: CheckEvent) => void,
): Promise<void> {
  if (!isTauri()) {
    throw new Error("A verificação só funciona dentro do aplicativo Check DNS Block.");
  }
  const channel = new Channel<CheckEvent>();
  channel.onmessage = onEvent;
  await invoke("check", { input, server, reference, onEvent: channel });
}

/**
 * Opens a native "save file" dialog pre-filled with `defaultName`, then
 * writes `contents` to the chosen path. Returns the chosen path, or `null`
 * if the dialog was cancelled.
 */
export async function saveTextFile(options: {
  defaultName: string;
  filterName: string;
  extension: string;
  contents: string;
  bom?: boolean;
}): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("Salvar arquivos só funciona dentro do aplicativo Check DNS Block.");
  }
  return invoke<string | null>("save_text_file", {
    defaultName: options.defaultName,
    filterName: options.filterName,
    extension: options.extension,
    contents: options.contents,
    bom: options.bom ?? false,
  });
}
