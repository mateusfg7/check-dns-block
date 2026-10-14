import { Surface, Text } from "@cloudflare/kumo";

interface StatusBarProps {
  total: number;
  blocked: number;
  notBlocked: number;
  notFound: number;
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

export function StatusBar({ total, blocked, notBlocked, notFound }: StatusBarProps) {
  return (
    <Surface
      as="footer"
      className="flex flex-wrap items-center gap-6 border-t border-kumo-hairline bg-kumo-elevated px-6 py-3"
    >
      <Stat label="total" value={total} />
      <Stat label="bloqueados" value={blocked} />
      <Stat label="não bloqueados" value={notBlocked} />
      <Stat label="não existe" value={notFound} />
    </Surface>
  );
}
