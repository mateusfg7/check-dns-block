import { describe, expect, it } from "vitest";
import { en } from "../i18n/locales/en";
import { es } from "../i18n/locales/es";
import { ptBR } from "../i18n/locales/pt-BR";
import { formatUtcOffsetLabel, summary, toCsv, toEvidence, toTsv } from "./report";
import type { Answer, CheckRow } from "./types";

const ok = (...value: string[]): Answer => ({ type: "ok", value });
const nxDomain: Answer = { type: "nx_domain" };

function row(overrides: Partial<CheckRow>): CheckRow {
  return {
    index: 0,
    entry: "exemplo.com.br",
    kind: "domain",
    verdict: "blocked",
    targetAnswer: nxDomain,
    referenceAnswer: ok("93.184.216.34"),
    checkedAt: new Date(2024, 0, 5, 9, 3, 7).getTime(),
    ...overrides,
  };
}

describe("formatUtcOffsetLabel", () => {
  it("formats as UTC+hh:mm / UTC-hh:mm", () => {
    expect(formatUtcOffsetLabel(new Date())).toMatch(/^UTC[+-]\d{2}:\d{2}$/);
  });
});

describe("Messages.formatDateTime", () => {
  it("formats pt-BR/es as dd/MM/yyyy HH:mm:ss using local time", () => {
    const date = new Date(2024, 0, 5, 9, 3, 7);
    expect(ptBR.formatDateTime(date)).toBe("05/01/2024 09:03:07");
    expect(es.formatDateTime(date)).toBe("05/01/2024 09:03:07");
  });
});

describe("summary", () => {
  const rows = [
    row({ index: 0, verdict: "blocked" }),
    row({ index: 1, verdict: "not_blocked" }),
    row({ index: 2, verdict: "not_blocked" }),
    row({ index: 3, verdict: "not_found" }),
  ];

  it("orders verdicts by count, most frequent first (pt-BR)", () => {
    expect(summary(rows, ptBR)).toBe("4 verificados: 2 NÃO BLOQUEADO | 1 BLOQUEADO | 1 NÃO EXISTE");
  });

  it("orders verdicts by count, most frequent first (en)", () => {
    expect(summary(rows, en)).toBe("4 checked: 2 NOT BLOCKED | 1 BLOCKED | 1 NOT FOUND");
  });
});

describe("toCsv", () => {
  it("always includes the reference column, quoting fields with the delimiter (pt-BR)", () => {
    const rows = [row({ targetAnswer: { type: "error", value: "a; b" } })];
    const csv = toCsv(rows, "177.137.208.6", "8.8.8.8", ptBR);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe(
      "Entrada;Tipo;Situação;Resposta 177.137.208.6;Resposta 8.8.8.8;Consultado em",
    );
    expect(lines[1]).toBe(
      'exemplo.com.br;Domínio;BLOQUEADO;"erro: a; b";93.184.216.34;05/01/2024 09:03:07',
    );
  });

  it("labels the reference column with the fallback label and leaves it blank without a reference DNS (pt-BR)", () => {
    const rows = [row({ referenceAnswer: null })];
    const csv = toCsv(rows, "177.137.208.6", null, ptBR);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("Entrada;Tipo;Situação;Resposta 177.137.208.6;Referência;Consultado em");
    expect(lines[1]).toBe(
      "exemplo.com.br;Domínio;BLOQUEADO;não resolve (NXDOMAIN);;05/01/2024 09:03:07",
    );
  });

  it("uses English column headers (en)", () => {
    const rows = [row({ referenceAnswer: null })];
    const csv = toCsv(rows, "177.137.208.6", null, en);
    expect(csv.trim().split("\r\n")[0]).toBe(
      "Entry;Type;Status;Answer 177.137.208.6;Reference;Checked at",
    );
  });
});

describe("toTsv", () => {
  it("omits the reference column entirely when there is no reference DNS (pt-BR)", () => {
    const rows = [row({})];
    const tsv = toTsv(rows, "177.137.208.6", null, ptBR);
    const lines = tsv.split("\r\n");
    expect(lines[0]).toBe("Entrada\tTipo\tSituação\tResposta 177.137.208.6\tConsultado em");
    expect(lines[1]).toBe(
      "exemplo.com.br\tDomínio\tBLOQUEADO\tnão resolve (NXDOMAIN)\t05/01/2024 09:03:07",
    );
  });

  it("includes the reference column when a reference DNS was used (pt-BR)", () => {
    const tsv = toTsv([row({})], "177.137.208.6", "8.8.8.8", ptBR);
    expect(tsv.split("\r\n")[0]).toBe(
      "Entrada\tTipo\tSituação\tResposta 177.137.208.6\tResposta 8.8.8.8\tConsultado em",
    );
  });
});

describe("toEvidence", () => {
  const generatedAt = new Date(2024, 0, 5, 9, 3, 7);

  it("lists blocked entries first, then the rest, with the reference-aware footer (pt-BR)", () => {
    const rows = [
      row({ index: 0, entry: "bloqueado.com", verdict: "blocked" }),
      row({
        index: 1,
        entry: "liberado.com",
        verdict: "not_blocked",
        targetAnswer: ok("93.184.216.34"),
      }),
    ];
    const text = toEvidence(rows, "177.137.208.6", "8.8.8.8", generatedAt, ptBR);
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

  it("prints '(nenhum)' when nothing is blocked, and drops reference-only lines (pt-BR)", () => {
    const rows = [row({ verdict: "not_found" })];
    const text = toEvidence(rows, "177.137.208.6", null, generatedAt, ptBR);

    expect(text).toContain("DOMÍNIOS BLOQUEADOS (0)");
    expect(text).toContain("(nenhum)");
    expect(text).not.toContain("DNS público de comparação");
    expect(text).not.toContain("enquanto o DNS público");
  });

  it("renders in English", () => {
    const rows = [row({ index: 0, entry: "blocked.com", verdict: "blocked" })];
    const text = toEvidence(rows, "177.137.208.6", "8.8.8.8", generatedAt, en);
    const lines = text.split("\r\n");

    expect(lines[0]).toBe("EVIDENCE OF DOMAIN BLOCKING ON THE RECURSIVE DNS");
    expect(text).toContain("BLOCKED DOMAINS (1)");
    expect(text).toContain("blocked.com");
    expect(text).toContain("Manual check: nslookup <domain> 177.137.208.6");
  });
});
