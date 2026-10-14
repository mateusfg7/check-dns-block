import { Badge, Button, Empty, Surface, Switch, Table, Text } from "@cloudflare/kumo";
import { FloppyDisk, ListMagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import type { CheckResult, Verdict } from "../lib/types";

const VERDICT_LABEL: Record<Verdict, string> = {
  blocked: "BLOQUEADO",
  not_blocked: "NÃO BLOQUEADO",
  not_found: "NÃO EXISTE",
  reverse_ok: "REVERSO OK",
};

const VERDICT_BADGE: Record<Verdict, "error" | "success" | "neutral" | "info"> = {
  blocked: "error",
  not_blocked: "success",
  not_found: "neutral",
  reverse_ok: "info",
};

// Placeholder data for this scaffold — real results come from the Rust backend later.
const results: CheckResult[] = [];

export function ResultsPanel() {
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const visibleResults = onlyBlocked
    ? results.filter((result) => result.verdict === "blocked")
    : results;

  return (
    <Surface className="flex h-full flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="heading">Resultado</Text>
        <div className="flex items-center gap-4">
          <Switch
            label="Mostrar só bloqueados"
            checked={onlyBlocked}
            onCheckedChange={setOnlyBlocked}
            size="sm"
          />
          {/* TODO: wire up to a `save_evidence` command once it exists. */}
          <Button variant="secondary" icon={<FloppyDisk size={16} />} disabled title="Em breve">
            Salvar evidência…
          </Button>
        </div>
      </div>

      {visibleResults.length === 0 ? (
        <Empty
          icon={<ListMagnifyingGlass size={40} />}
          title="Nenhum resultado ainda"
          description="Cole domínios ou IPs ao lado e clique em Verificar para ver o resultado aqui."
        />
      ) : (
        <div className="overflow-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Domínio/IP</Table.Head>
                <Table.Head>Resultado</Table.Head>
                <Table.Head>DNS operadora</Table.Head>
                <Table.Head>DNS público</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {visibleResults.map((result) => (
                <Table.Row key={result.query}>
                  <Table.Cell className="font-mono text-sm">{result.query}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={VERDICT_BADGE[result.verdict]}>
                      {VERDICT_LABEL[result.verdict]}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{result.ispAnswer ?? "—"}</Table.Cell>
                  <Table.Cell>{result.publicAnswer ?? "—"}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      )}
    </Surface>
  );
}
