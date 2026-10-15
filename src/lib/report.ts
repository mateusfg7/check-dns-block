/**
 * Pure formatting helpers for the result table, CSV export, clipboard copy
 * and the evidence report. Everything here is rendered in the current UI
 * language via the `Messages` dictionary passed in by the caller.
 */
import { pad2 } from "../i18n/format";
import type { Messages } from "../i18n/locales/en";
import type { Answer, CheckRow, EntryKind, Verdict } from "./types";

/** Renders an `Answer` as short text in the given language. */
export function answerText(answer: Answer, kind: EntryKind, t: Messages): string {
  switch (answer.type) {
    case "ok":
      return answer.value.join(", ");
    case "nx_domain":
      return t.answer.nxDomain;
    case "serv_fail":
      return t.answer.servFail;
    case "refused":
      return t.answer.refused;
    case "timeout":
      return t.answer.timeout;
    case "empty":
      return kind === "ip" ? t.answer.emptyIp : t.answer.emptyDomain;
    case "error":
      return t.answer.error(answer.value);
  }
}

/** Formats the local UTC offset as `UTC+hh:mm` / `UTC-hh:mm`. */
export function formatUtcOffsetLabel(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** `"N checked: 3 BLOCKED | 2 NOT BLOCKED | ..."`, most frequent first. */
export function summary(rows: CheckRow[], t: Messages): string {
  const order: Verdict[] = [];
  const counts = new Map<Verdict, number>();
  for (const row of rows) {
    if (!counts.has(row.verdict)) {
      order.push(row.verdict);
    }
    counts.set(row.verdict, (counts.get(row.verdict) ?? 0) + 1);
  }
  const parts = [...order]
    .sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
    .map((verdict) => `${counts.get(verdict)} ${t.verdict[verdict]}`);
  return `${t.report.summaryPrefix(rows.length)} ${parts.join(" | ")}`;
}

function csvField(value: string): string {
  if (/["\n\r;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * `;`-delimited CSV (UTF-8, BOM added separately by the save command so
 * Excel opens accented text correctly). The reference column is always
 * present, labelled with `table.referenceColumnLabel` when no reference DNS
 * was used.
 */
export function toCsv(
  rows: CheckRow[],
  server: string,
  reference: string | null,
  t: Messages,
): string {
  const refHeader = reference ? t.table.columnAnswer(reference) : t.table.referenceColumnLabel;
  const header = [
    t.table.columnEntry,
    t.table.columnType,
    t.table.columnStatus,
    t.table.columnAnswer(server),
    refHeader,
    t.table.columnCheckedAt,
  ];
  const body = rows.map((row) => [
    row.entry,
    t.kind[row.kind],
    t.verdict[row.verdict],
    answerText(row.targetAnswer, row.kind, t),
    row.referenceAnswer ? answerText(row.referenceAnswer, row.kind, t) : "",
    t.formatDateTime(new Date(row.checkedAt)),
  ]);
  return `${[header, ...body].map((cols) => cols.map(csvField).join(";")).join("\r\n")}\r\n`;
}

/**
 * Tab-separated text for the clipboard ("Copy result"). Unlike the CSV
 * export, the reference column is omitted entirely when no reference DNS
 * was used.
 */
export function toTsv(
  rows: CheckRow[],
  server: string,
  reference: string | null,
  t: Messages,
): string {
  const header = [
    t.table.columnEntry,
    t.table.columnType,
    t.table.columnStatus,
    t.table.columnAnswer(server),
  ];
  if (reference) {
    header.push(t.table.columnAnswer(reference));
  }
  header.push(t.table.columnCheckedAt);

  const body = rows.map((row) => {
    const cols = [
      row.entry,
      t.kind[row.kind],
      t.verdict[row.verdict],
      answerText(row.targetAnswer, row.kind, t),
    ];
    if (reference) {
      cols.push(row.referenceAnswer ? answerText(row.referenceAnswer, row.kind, t) : "");
    }
    cols.push(t.formatDateTime(new Date(row.checkedAt)));
    return cols;
  });
  return [header, ...body].map((cols) => cols.join("\t")).join("\r\n");
}

/**
 * Evidence report: blocked domains first (with timestamps), then every
 * other entry, followed by the criteria used.
 */
export function toEvidence(
  rows: CheckRow[],
  server: string,
  reference: string | null,
  generatedAt: Date,
  t: Messages,
): string {
  const blocked = rows.filter((row) => row.verdict === "blocked");
  const rest = rows.filter((row) => row.verdict !== "blocked");
  const width = Math.max(20, ...rows.map((row) => row.entry.length)) + 2;
  const verdictWidth = Math.max(...Object.values(t.verdict).map((label) => label.length)) + 2;
  const headerLabels = [t.report.generatedAt, t.report.queriedServer, t.report.result];
  if (reference) {
    headerLabels.push(t.report.compareServer);
  }
  const headerWidth = Math.max(...headerLabels.map((label) => label.length)) + 1;

  const answer = (row: CheckRow) => answerText(row.targetAnswer, row.kind, t);
  const referenceAnswer = (row: CheckRow) =>
    row.referenceAnswer ? answerText(row.referenceAnswer, row.kind, t) : "";

  const lines: string[] = [];
  lines.push(t.report.evidenceTitle);
  lines.push("=".repeat(50));
  lines.push(
    `${t.report.generatedAt.padEnd(headerWidth)}${t.formatDateTime(generatedAt)} (${formatUtcOffsetLabel(generatedAt)})`,
  );
  lines.push(`${t.report.queriedServer.padEnd(headerWidth)}${server}`);
  if (reference) {
    lines.push(`${t.report.compareServer.padEnd(headerWidth)}${reference}`);
  }
  lines.push(`${t.report.result.padEnd(headerWidth)}${summary(rows, t)}`);
  lines.push("");
  lines.push(t.report.blockedDomains(blocked.length));
  lines.push("-".repeat(50));
  if (blocked.length === 0) {
    lines.push(t.report.none);
  } else {
    for (const row of blocked) {
      let line = `${t.formatDateTime(new Date(row.checkedAt))}  ${row.entry.padEnd(width)}${t.verdict.blocked}  ${server}: ${answer(row)}`;
      if (reference) {
        line += `  |  ${reference}: ${referenceAnswer(row)}`;
      }
      lines.push(line);
    }
  }
  if (rest.length > 0) {
    lines.push("");
    lines.push(t.report.otherEntries(rest.length));
    lines.push("-".repeat(50));
    for (const row of rest) {
      let line = `${t.formatDateTime(new Date(row.checkedAt))}  ${row.entry.padEnd(width)}${t.verdict[row.verdict].padEnd(verdictWidth)}${server}: ${answer(row)}`;
      if (reference) {
        line += `  |  ${reference}: ${referenceAnswer(row)}`;
      }
      lines.push(line);
    }
  }
  lines.push("");
  lines.push(t.report.criteriaBlocked);
  if (reference) {
    lines.push(t.report.criteriaWithReference(reference));
  }
  lines.push(t.report.manualCheck(server));
  return lines.join("\r\n");
}
