/**
 * Pure formatting helpers for the result table, CSV export, clipboard copy
 * and the evidence report. Ported 1:1 from `Resumo`, `Para-Csv`, `Para-Evidencia`
 * and `Texto-Resposta`'s situation labels in the original `.cmd` tool.
 */
import type { CheckRow, EntryKind, Verdict } from "./types";

/** Portuguese label for each verdict, as shown in the UI and reports. */
export const VERDICT_LABEL: Record<Verdict, string> = {
  blocked: "BLOQUEADO",
  not_blocked: "NÃO BLOQUEADO",
  unresolved: "NÃO RESOLVE",
  no_response: "SEM RESPOSTA",
  not_found: "NÃO EXISTE",
  reverse_ok: "REVERSO OK",
  no_reverse: "SEM REVERSO",
};

/** Portuguese label for each entry kind, as shown in the UI and reports. */
export const TIPO_LABEL: Record<EntryKind, string> = {
  domain: "Domínio",
  ip: "IP",
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Formats a local timestamp as `dd/MM/yyyy HH:mm:ss`. */
export function formatTimestamp(date: Date): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const time = `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  return `${day}/${month}/${date.getFullYear()} ${time}`;
}

/** Formats the local UTC offset as `UTC+hh:mm` / `UTC-hh:mm`. */
export function formatUtcOffsetLabel(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return `UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`;
}

/** `"N verificados: 3 BLOQUEADO | 2 NÃO BLOQUEADO | ..."`, most frequent first. */
export function summary(rows: CheckRow[]): string {
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
    .map((verdict) => `${counts.get(verdict)} ${VERDICT_LABEL[verdict]}`);
  return `${rows.length} verificados: ${parts.join(" | ")}`;
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
 * present, labelled "Referência" when no reference DNS was used.
 */
export function toCsv(rows: CheckRow[], server: string, reference: string | null): string {
  const refHeader = reference ? `Resposta ${reference}` : "Referência";
  const header = ["Entrada", "Tipo", "Situação", `Resposta ${server}`, refHeader, "Consultado em"];
  const body = rows.map((row) => [
    row.entry,
    TIPO_LABEL[row.kind],
    VERDICT_LABEL[row.verdict],
    row.targetAnswer,
    row.referenceAnswer ?? "",
    row.checkedAt,
  ]);
  return `${[header, ...body].map((cols) => cols.map(csvField).join(";")).join("\r\n")}\r\n`;
}

/**
 * Tab-separated text for the clipboard ("Copiar resultado"). Unlike the
 * CSV export, the reference column is omitted entirely when no reference
 * DNS was used.
 */
export function toTsv(rows: CheckRow[], server: string, reference: string | null): string {
  const header = ["Entrada", "Tipo", "Situação", `Resposta ${server}`];
  if (reference) {
    header.push(`Resposta ${reference}`);
  }
  header.push("Consultado em");

  const body = rows.map((row) => {
    const cols = [row.entry, TIPO_LABEL[row.kind], VERDICT_LABEL[row.verdict], row.targetAnswer];
    if (reference) {
      cols.push(row.referenceAnswer ?? "");
    }
    cols.push(row.checkedAt);
    return cols;
  });
  return [header, ...body].map((cols) => cols.join("\t")).join("\r\n");
}

/**
 * Evidence report: blocked domains first (with timestamps), then every
 * other entry, followed by the criteria used. Mirrors `Para-Evidencia`.
 */
export function toEvidence(
  rows: CheckRow[],
  server: string,
  reference: string | null,
  generatedAt: Date,
): string {
  const blocked = rows.filter((row) => row.verdict === "blocked");
  const rest = rows.filter((row) => row.verdict !== "blocked");
  const width = Math.max(20, ...rows.map((row) => row.entry.length)) + 2;

  const lines: string[] = [];
  lines.push("EVIDÊNCIA DE BLOQUEIO DE DOMÍNIOS NO DNS RECURSIVO");
  lines.push("=".repeat(50));
  lines.push(
    `Gerado em:               ${formatTimestamp(generatedAt)} (${formatUtcOffsetLabel(generatedAt)})`,
  );
  lines.push(`Servidor DNS consultado: ${server}`);
  if (reference) {
    lines.push(`DNS público de comparação: ${reference}`);
  }
  lines.push(`Resultado:               ${summary(rows)}`);
  lines.push("");
  lines.push(`DOMÍNIOS BLOQUEADOS (${blocked.length})`);
  lines.push("-".repeat(50));
  if (blocked.length === 0) {
    lines.push("(nenhum)");
  } else {
    for (const row of blocked) {
      let line = `${row.checkedAt}  ${row.entry.padEnd(width)}BLOQUEADO  ${server}: ${row.targetAnswer}`;
      if (reference) {
        line += `  |  ${reference}: ${row.referenceAnswer ?? ""}`;
      }
      lines.push(line);
    }
  }
  if (rest.length > 0) {
    lines.push("");
    lines.push(`DEMAIS ENTRADAS (${rest.length})`);
    lines.push("-".repeat(50));
    for (const row of rest) {
      let line = `${row.checkedAt}  ${row.entry.padEnd(width)}${VERDICT_LABEL[row.verdict].padEnd(15)}${server}: ${row.targetAnswer}`;
      if (reference) {
        line += `  |  ${reference}: ${row.referenceAnswer ?? ""}`;
      }
      lines.push(line);
    }
  }
  lines.push("");
  lines.push(
    "Critério: BLOQUEADO = o servidor consultado não resolve o domínio (ou devolve 0.0.0.0/127.x)",
  );
  if (reference) {
    lines.push(
      `enquanto o DNS público ${reference} resolve normalmente. NÃO EXISTE = não resolve em nenhum dos dois.`,
    );
  }
  lines.push(`Conferência manual: nslookup <domínio> ${server}`);
  return lines.join("\r\n");
}
