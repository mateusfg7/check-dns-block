import { describe, expect, it } from "vitest";
import { formatTimestamp, formatUtcOffsetLabel, summary, toCsv, toEvidence, toTsv } from "./report";
import type { CheckRow } from "./types";

function row(overrides: Partial<CheckRow>): CheckRow {
  return {
    index: 0,
    entry: "exemplo.com.br",
    kind: "domain",
    verdict: "blocked",
    targetAnswer: "não resolve (NXDOMAIN)",
    referenceAnswer: "93.184.216.34",
    checkedAt: "05/01/2024 09:03:07",
    ...overrides,
  };
}

describe("formatTimestamp", () => {
  it("formats as dd/MM/yyyy HH:mm:ss using local time", () => {
    const date = new Date(2024, 0, 5, 9, 3, 7);
    expect(formatTimestamp(date)).toBe("05/01/2024 09:03:07");
  });
});

describe("formatUtcOffsetLabel", () => {
  it("formats as UTC+hh:mm / UTC-hh:mm", () => {
    expect(formatUtcOffsetLabel(new Date())).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
  });
});

describe("summary", () => {
  it("orders verdicts by count, most frequent first", () => {
    const rows = [
      row({ index: 0, verdict: "blocked" }),
      row({ index: 1, verdict: "not_blocked" }),
      row({ index: 2, verdict: "not_blocked" }),
      row({ index: 3, verdict: "not_found" }),
    ];
    expect(summary(rows)).toBe("4 verificados: 2 NÃO BLOQUEADO | 1 BLOQUEADO | 1 NÃO EXISTE");
  });
});

describe("toCsv", () => {
  it("always includes the reference column, quoting fields with the delimiter", () => {
    const rows = [row({ targetAnswer: "a; b" })];
    const csv = toCsv(rows, "177.137.208.6", "8.8.8.8");
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe(
      "Entrada;Tipo;Situação;Resposta 177.137.208.6;Resposta 8.8.8.8;Consultado em",
    );
    expect(lines[1]).toBe(
      'exemplo.com.br;Domínio;BLOQUEADO;"a; b";93.184.216.34;05/01/2024 09:03:07',
    );
  });

  it("labels the reference column 'Referência' and leaves it blank without a reference DNS", () => {
    const rows = [row({ referenceAnswer: null })];
    const csv = toCsv(rows, "177.137.208.6", null);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("Entrada;Tipo;Situação;Resposta 177.137.208.6;Referência;Consultado em");
    expect(lines[1]).toBe(
      "exemplo.com.br;Domínio;BLOQUEADO;não resolve (NXDOMAIN);;05/01/2024 09:03:07",
    );
  });
});

describe("toTsv", () => {
  it("omits the reference column entirely when there is no reference DNS", () => {
    const rows = [row({})];
    const tsv = toTsv(rows, "177.137.208.6", null);
    const lines = tsv.split("\r\n");
    expect(lines[0]).toBe("Entrada\tTipo\tSituação\tResposta 177.137.208.6\tConsultado em");
    expect(lines[1]).toBe(
      "exemplo.com.br\tDomínio\tBLOQUEADO\tnão resolve (NXDOMAIN)\t05/01/2024 09:03:07",
    );
  });

  it("includes the reference column when a reference DNS was used", () => {
    const tsv = toTsv([row({})], "177.137.208.6", "8.8.8.8");
    expect(tsv.split("\r\n")[0]).toBe(
      "Entrada\tTipo\tSituação\tResposta 177.137.208.6\tResposta 8.8.8.8\tConsultado em",
    );
  });
});

describe("toEvidence", () => {
  const generatedAt = new Date(2024, 0, 5, 9, 3, 7);

  it("lists blocked entries first, then the rest, with the reference-aware footer", () => {
    const rows = [
      row({ index: 0, entry: "bloqueado.com", verdict: "blocked" }),
      row({
        index: 1,
        entry: "liberado.com",
        verdict: "not_blocked",
        targetAnswer: "93.184.216.34",
      }),
    ];
    const text = toEvidence(rows, "177.137.208.6", "8.8.8.8", generatedAt);
    const lines = text.split("\r\n");

    expect(lines[0]).toBe("EVIDÊNCIA DE BLOQUEIO DE DOMÍNIOS NO DNS RECURSIVO");
    expect(lines).toContain("DNS público de comparação: 8.8.8.8");
    expect(lines).toContain("DOMÍNIOS BLOQUEADOS (1)");
    expect(text).toContain("bloqueado.com");
    expect(text).toContain("DEMAIS ENTRADAS (1)");
    expect(text).toContain("liberado.com");
    expect(text).toContain(
      "enquanto o DNS público 8.8.8.8 resolve normalmente. NÃO EXISTE = não resolve em nenhum dos dois.",
    );
    expect(text).toContain("Conferência manual: nslookup <domínio> 177.137.208.6");
  });

  it("prints '(nenhum)' when nothing is blocked, and drops reference-only lines", () => {
    const rows = [row({ verdict: "not_found" })];
    const text = toEvidence(rows, "177.137.208.6", null, generatedAt);

    expect(text).toContain("DOMÍNIOS BLOQUEADOS (0)");
    expect(text).toContain("(nenhum)");
    expect(text).not.toContain("DNS público de comparação");
    expect(text).not.toContain("enquanto o DNS público");
  });
});
