/**
 * Shared data contract between the Rust backend and the React frontend.
 * Mirrors `src-tauri/src/dns.rs` and the events emitted by the `check` command.
 */

/** Kind of a parsed entry: a domain name or a literal IP address. */
export type EntryKind = "domain" | "ip";

/** Outcome of checking a single domain/IP against the target (and reference) DNS. */
export type Verdict =
  | "blocked"
  | "not_blocked"
  | "unresolved"
  | "no_response"
  | "not_found"
  | "reverse_ok"
  | "no_reverse";

/**
 * Outcome of a single DNS query against one server, exactly as sent by the
 * Rust backend (mirrors `src-tauri/src/dns.rs`'s `Answer`). Kept structured
 * rather than pre-rendered text so the UI can render it in the current
 * language — see `answerText` in `./report`.
 */
export type Answer =
  | { type: "ok"; value: string[] }
  | { type: "nx_domain" }
  | { type: "serv_fail" }
  | { type: "refused" }
  | { type: "empty" }
  | { type: "timeout" }
  | { type: "error"; value: string };

/** Result row for a single domain or IP, as streamed by the `check` command. */
export interface CheckRow {
  /** Position in the original (deduped) input; rows can arrive out of order. */
  index: number;
  entry: string;
  kind: EntryKind;
  verdict: Verdict;
  targetAnswer: Answer;
  referenceAnswer: Answer | null;
  /** Local timestamp as epoch milliseconds; formatted in the current locale for display. */
  checkedAt: number;
}

/** Set on `started` when the reference DNS was requested but dropped. */
export type CheckWarning = { code: "reference_unreachable"; server: string };

/** Events streamed over the `check` command's channel. */
export type CheckEvent =
  | {
      type: "started";
      total: number;
      ignored: number;
      reference: string | null;
      warning: CheckWarning | null;
    }
  | ({ type: "row" } & CheckRow)
  | { type: "finished" };

/**
 * Rejection shape of the `check` command (mirrors `src-tauri/src/lib.rs`'s
 * `CheckError`), plus `not_in_app` for the browser-only fallback in `./ipc`.
 */
export type CheckError =
  | { code: "invalid_server" }
  | { code: "invalid_reference" }
  | { code: "no_entries" }
  | { code: "server_unreachable"; server: string; control: string }
  | { code: "internal"; message: string }
  | { code: "not_in_app" };

/** Rejection shape of the `save_text_file` command, plus `not_in_app`. */
export type SaveError =
  | { code: "dialog_failed" }
  | { code: "write_failed"; message: string }
  | { code: "not_in_app" };

/** Static info shown in the app header, returned by the `app_info` command. */
export interface AppInfo {
  version: string;
  ispDns: string;
  publicDns: string;
}
