import { Surface, Text } from "@cloudflare/kumo";
import { useI18n } from "../i18n";
import { summary } from "../lib/report";
import type { CheckRow } from "../lib/types";
import type { CheckStatus } from "../lib/useCheck";

interface StatusBarProps {
  status: CheckStatus;
  rows: CheckRow[];
  total: number;
  ignored: number;
  /** A transient confirmation (e.g. "Saved to ..."), shown instead of the summary when set. */
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
  const { t } = useI18n();
  const blocked = rows.filter((row) => row.verdict === "blocked").length;
  const notBlocked = rows.filter(
    (row) => row.verdict === "not_blocked" || row.verdict === "reverse_ok",
  ).length;
  const notFound = rows.filter((row) => row.verdict === "not_found").length;

  let message: string | null = null;
  if (feedback) {
    message = feedback;
  } else if (status === "running") {
    message = t.status.running(rows.length, total);
  } else if (status === "done") {
    message = summary(rows, t);
    if (ignored > 0) {
      message += `   ${t.status.ignored(ignored)}`;
    }
  }

  return (
    <Surface
      as="footer"
      className="flex flex-wrap items-center gap-6 border-t border-kumo-hairline bg-kumo-elevated px-6 py-3"
    >
      <Stat label={t.status.total} value={rows.length} />
      <Stat label={t.status.blocked} value={blocked} />
      <Stat label={t.status.notBlocked} value={notBlocked} />
      <Stat label={t.status.notFound} value={notFound} />
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
