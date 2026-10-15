import { describe, expect, it } from "vitest";
import { detectLocale } from "./index";
import { en } from "./locales/en";
import { es } from "./locales/es";
import { ptBR } from "./locales/pt-BR";

describe("detectLocale", () => {
  it("maps any pt-* tag to pt-BR", () => {
    expect(detectLocale(["pt-PT"])).toBe("pt-BR");
    expect(detectLocale(["pt"])).toBe("pt-BR");
  });

  it("maps any es-* tag to es", () => {
    expect(detectLocale(["es-MX"])).toBe("es");
  });

  it("falls back to en for anything else, including no match at all", () => {
    expect(detectLocale(["fr-FR", "fr"])).toBe("en");
    expect(detectLocale([])).toBe("en");
  });

  it("uses the first matching tag when several are given", () => {
    expect(detectLocale(["fr-FR", "es-ES", "en-US"])).toBe("es");
  });
});

/** Recursively collects the sorted dotted key paths of an object's leaves. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }
  return Object.keys(value)
    .sort()
    .flatMap((key) =>
      keyPaths((value as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key),
    );
}

describe("locale completeness", () => {
  const enKeys = keyPaths(en);

  it("pt-BR has exactly the same keys as en", () => {
    expect(keyPaths(ptBR)).toEqual(enKeys);
  });

  it("es has exactly the same keys as en", () => {
    expect(keyPaths(es)).toEqual(enKeys);
  });
});
