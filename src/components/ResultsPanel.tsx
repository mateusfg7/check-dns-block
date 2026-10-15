import { Badge, Empty, Table } from "@cloudflare/kumo";
import { ListMagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "../i18n";
import { answerText } from "../lib/report";
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
  /** Already filtered (e.g. by "only blocked") — rendered as-is. */
  rows: CheckRow[];
  server: string;
  reference: string | null;
  status: CheckStatus;
}

export function ResultsPanel({ rows, server, reference, status }: ResultsPanelProps) {
  const { t } = useI18n();

  if (rows.length === 0) {
    return (
      <Empty
        icon={<ListMagnifyingGlass size={40} />}
        title={status === "running" ? t.results.runningTitle : t.results.emptyTitle}
        description={t.results.emptyDescription}
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>{t.table.columnEntry}</Table.Head>
            <Table.Head>{t.table.columnType}</Table.Head>
            <Table.Head>{t.table.columnStatus}</Table.Head>
            <Table.Head>{t.table.columnAnswer(server)}</Table.Head>
            {reference ? <Table.Head>{t.table.columnAnswer(reference)}</Table.Head> : null}
            <Table.Head>{t.table.columnCheckedAt}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((row) => (
            <Table.Row key={row.index}>
              <Table.Cell className="font-mono text-sm">{row.entry}</Table.Cell>
              <Table.Cell>{t.kind[row.kind]}</Table.Cell>
              <Table.Cell>
                <Badge variant={VERDICT_BADGE[row.verdict]}>{t.verdict[row.verdict]}</Badge>
              </Table.Cell>
              <Table.Cell>{answerText(row.targetAnswer, row.kind, t)}</Table.Cell>
              {reference ? (
                <Table.Cell>
                  {row.referenceAnswer ? answerText(row.referenceAnswer, row.kind, t) : "—"}
                </Table.Cell>
              ) : null}
              <Table.Cell>{t.formatDateTime(new Date(row.checkedAt))}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  );
}
