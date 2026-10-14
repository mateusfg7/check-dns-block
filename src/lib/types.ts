/**
 * Shared data contract between the Rust backend and the React frontend.
 *
 * NOTE: this is scaffolding only — no DNS resolution happens yet. These
 * types mirror the Rust side (`src-tauri/src/dns.rs`) so the UI can be
 * built against a stable shape before the real logic lands.
 */

/** Outcome of comparing a domain/IP lookup against two DNS servers. */
export type Verdict = "blocked" | "not_blocked" | "not_found" | "reverse_ok";

/** Result row for a single domain or IP the user pasted in. */
export interface CheckResult {
  /** The domain or IP exactly as entered by the user. */
  query: string;
  verdict: Verdict;
  /** What the ISP DNS resolved the query to, if anything. */
  ispAnswer: string | null;
  /** What the public DNS resolved the query to, if anything. */
  publicAnswer: string | null;
}

/** Static info shown in the app header, returned by the `app_info` command. */
export interface AppInfo {
  version: string;
  ispDns: string;
  publicDns: string;
}
