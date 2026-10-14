import { Badge, Empty, Table } from "@cloudflare/kumo";
import { ListMagnifyingGlass } from "@phosphor-icons/react";
import { TIPO_LABEL, VERDICT_LABEL } from "../lib/report";
import type { CheckRow, Verdict } from "../lib/types";
import type { CheckStatus } from "../lib/useCheck";

const VERDICT_BADGE: Record<Verdict, "error" | "success" | "warning" | "neutral"> = {
  blocked: "error",
  not_blocked: "success",
  reverse_ok: "success",
  unresolved: "warning",
  no_response: "warning",
  not_found: "neutral",
  no_reverse: "neutral",
};

interface ResultsPanelProps {
  /** Already filtered (e.g. by "só bloqueados") — rendered as-is. */
  rows: CheckRow[];
  server: string;
  reference: string | null;
  status: CheckStatus;
}

export function ResultsPanel({ rows, server, reference, status }: ResultsPanelProps) {
  if (rows.length === 0) {
    return (
      <Empty
        icon={<ListMagnifyingGlass size={40} />}
        title={status === "running" ? "Consultando…" : "Nenhum resultado ainda"}
        description="Cole domínios ou IPs acima e clique em Verificar para ver o resultado aqui."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>Entrada</Table.Head>
            <Table.Head>Tipo</Table.Head>
            <Table.Head>Situação</Table.Head>
            <Table.Head>Resposta {server}</Table.Head>
            {reference ? <Table.Head>Resposta {reference}</Table.Head> : null}
            <Table.Head>Consultado em</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row.index}>
              <Table.Cell className="font-mono text-sm">{row.entry}</Table.Cell>
              <Table.Cell>{TIPO_LABEL[row.kind]}</Table.Cell>
              <Table.Cell>
                <Badge variant={VERDICT_BADGE[row.verdict]}>{VERDICT_LABEL[row.verdict]}</Badge>
              </Table.Cell>
              <Table.Cell>{row.targetAnswer}</Table.Cell>
              {reference ? <Table.Cell>{row.referenceAnswer ?? "—"}</Table.Cell> : null}
              <Table.Cell>{row.checkedAt}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
