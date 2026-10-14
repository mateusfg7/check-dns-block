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

/** Result row for a single domain or IP, as streamed by the `check` command. */
export interface CheckRow {
  /** Position in the original (deduped) input; rows can arrive out of order. */
  index: number;
  entry: string;
  kind: EntryKind;
  verdict: Verdict;
  targetAnswer: string;
  referenceAnswer: string | null;
  /** Local timestamp formatted as `dd/MM/yyyy HH:mm:ss`. */
  checkedAt: string;
}

/** Events streamed over the `check` command's channel. */
export type CheckEvent =
  | {
      type: "started";
      total: number;
      ignored: number;
      reference: string | null;
      warning: string | null;
    }
  | ({ type: "row" } & CheckRow)
  | { type: "finished" };

/** Static info shown in the app header, returned by the `app_info` command. */
export interface AppInfo {
  version: string;
  ispDns: string;
  publicDns: string;
}
