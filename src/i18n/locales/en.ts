/**
 * English strings — the default locale and the type every other locale is
 * checked against (`export type Messages = typeof en`), so a missing key in
 * `pt-BR.ts`/`es.ts` is a compile error.
 */
import type { EntryKind, Verdict } from "../../lib/types";
import { pad2 } from "../format";

export const en = {
  theme: {
    useLight: "Use light theme",
    useDark: "Use dark theme",
  },
  language: {
    label: "Change language",
  },
  window: {
    minimize: "Minimize",
    maximize: "Maximize",
    restore: "Restore",
    close: "Close",
  },
  input: {
    serverLabel: "DNS server to query:",
    serverAriaLabel: "DNS server to query",
    compareLabel: "Compare with public DNS:",
    referenceAriaLabel: "Public comparison DNS",
    hint: "Paste the domains and/or IPs below (one per line, or separated by space, comma or semicolon):",
    placeholder: "example.com\n192.0.2.10\nother-domain.com",
    textareaAriaLabel: "Domains and IPs to check",
  },
  toolbar: {
    verify: "Check",
    clear: "Clear",
    copyResult: "Copy result",
    saveCsv: "Save CSV…",
    saveEvidence: "Save evidence…",
    onlyBlocked: "Show only blocked",
  },
  table: {
    columnEntry: "Entry",
    columnType: "Type",
    columnStatus: "Status",
    columnAnswer: (server: string) => `Answer ${server}`,
    columnCheckedAt: "Checked at",
    /** Fallback CSV header for the reference column when no reference DNS was used. */
    referenceColumnLabel: "Reference",
  },
  results: {
    runningTitle: "Checking…",
    emptyTitle: "No results yet",
    emptyDescription: "Paste domains or IPs above and click Check to see the result here.",
  },
  status: {
    total: "total",
    blocked: "blocked",
    notBlocked: "not blocked",
    notFound: "not found",
    running: (done: number, total: number) => `Checking… ${done} of ${total}`,
    ignored: (n: number) =>
      `(${n} snippet${n === 1 ? "" : "s"} ignored — neither a domain nor an IP)`,
    copied: (n: number) => `${n} row${n === 1 ? "" : "s"} copied to the clipboard.`,
    savedAt: (path: string) => `Saved to ${path}`,
    evidenceSavedAt: (path: string) => `Evidence saved to ${path}`,
  },
  verdict: {
    blocked: "BLOCKED",
    not_blocked: "NOT BLOCKED",
    unresolved: "NOT RESOLVED",
    no_response: "NO RESPONSE",
    not_found: "NOT FOUND",
    reverse_ok: "REVERSE OK",
    no_reverse: "NO REVERSE",
  } satisfies Record<Verdict, string>,
  kind: {
    domain: "Domain",
    ip: "IP",
  } satisfies Record<EntryKind, string>,
  answer: {
    nxDomain: "does not resolve (NXDOMAIN)",
    servFail: "failure (SERVFAIL)",
    refused: "refused (REFUSED)",
    timeout: "no response",
    emptyDomain: "no A record",
    emptyIp: "no reverse",
    error: (message: string) => `error: ${message}`,
  },
  errors: {
    bannerTitle: "Could not verify",
    invalidServer: "Enter the IP of the DNS server to query.",
    invalidReference: "Enter the IP of the public comparison DNS, or disable the option.",
    noEntries: "Paste at least one valid domain or IP.",
    serverUnreachable: (server: string, control: string) =>
      `The server ${server} did not respond to the test query (${control}).\n\n` +
      "This computer needs to be on the network served by that DNS.",
    internal: (message: string) => `Internal error: ${message}`,
    notInApp: "Checking only works inside the Check DNS Block app.",
  },
  saveErrors: {
    notInApp: "Saving files only works inside the Check DNS Block app.",
    dialogFailed: "Could not open the save dialog.",
    writeFailed: (message: string) => `Could not save: ${message}`,
  },
  warnings: {
    referenceUnreachable: (server: string) =>
      `The public DNS ${server} did not respond from here. The check continues without ` +
      "comparison: anything that doesn't resolve will show as NOT RESOLVED.",
  },
  report: {
    summaryPrefix: (n: number) => `${n} checked:`,
    evidenceTitle: "EVIDENCE OF DOMAIN BLOCKING ON THE RECURSIVE DNS",
    generatedAt: "Generated at:",
    queriedServer: "DNS server queried:",
    compareServer: "Public comparison DNS:",
    result: "Result:",
    blockedDomains: (n: number) => `BLOCKED DOMAINS (${n})`,
    none: "(none)",
    otherEntries: (n: number) => `OTHER ENTRIES (${n})`,
    criteriaBlocked:
      "Criteria: BLOCKED = the queried server does not resolve the domain (or returns 0.0.0.0/127.x)",
    criteriaWithReference: (reference: string) =>
      `while the public DNS ${reference} resolves normally. NOT FOUND = does not resolve on either.`,
    manualCheck: (server: string) => `Manual check: nslookup <domain> ${server}`,
  },
  files: {
    csvName: (ts: string) => `dns-block-${ts}.csv`,
    csvFilter: "CSV",
    evidenceName: (ts: string) => `dns-block-evidence-${ts}.txt`,
    evidenceFilter: "Text",
  },
  /** `yyyy-MM-dd HH:mm:ss`, using local time. */
  formatDateTime: (date: Date): string => {
    const day = pad2(date.getDate());
    const month = pad2(date.getMonth() + 1);
    const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    return `${date.getFullYear()}-${month}-${day} ${time}`;
  },
};

export type Messages = typeof en;
