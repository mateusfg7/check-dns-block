import { Surface, Text } from "@cloudflare/kumo";
import { summary } from "../lib/report";
import type { CheckRow } from "../lib/types";
import type { CheckStatus } from "../lib/useCheck";

interface StatusBarProps {
  status: CheckStatus;
  rows: CheckRow[];
  total: number;
  ignored: number;
  /** A transient confirmation (e.g. "Salvo em ..."), shown instead of the summary when set. */
  feedback?: string | null;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <Text variant="heading">{value}</Text>
      <Text variant="secondary" size="sm">
        {label}
      </Text>
    </div>
  );
}

export function StatusBar({ status, rows, total, ignored, feedback }: StatusBarProps) {
  const blocked = rows.filter((row) => row.verdict === "blocked").length;
  const notBlocked = rows.filter(
    (row) => row.verdict === "not_blocked" || row.verdict === "reverse_ok",
  ).length;
  const notFound = rows.filter((row) => row.verdict === "not_found").length;

  let message: string | null = null;
  if (feedback) {
    message = feedback;
  } else if (status === "running") {
    message = `Consultando… ${rows.length} de ${total}`;
  } else if (status === "done") {
    message = summary(rows);
    if (ignored > 0) {
      message += `   (${ignored} trechos ignorados por não serem domínio nem IP)`;
    }
  }

  return (
    <Surface
      as="footer"
      className="flex flex-wrap items-center gap-6 border-t border-kumo-hairline bg-kumo-elevated px-6 py-3"
    >
      <Stat label="total" value={rows.length} />
      <Stat label="bloqueados" value={blocked} />
      <Stat label="não bloqueados" value={notBlocked} />
      <Stat label="não existe" value={notFound} />
      {message ? (
        <div className="ml-auto">
          <Text variant="secondary" size="sm">
            {message}
          </Text>
        </div>
      ) : null}
    </Surface>
  );
}
