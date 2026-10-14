import { Badge, Surface, Text } from "@cloudflare/kumo";
import { ShieldCheck } from "@phosphor-icons/react";
import type { AppInfo } from "../lib/types";
import { ThemeToggle } from "./ThemeToggle";

interface AppHeaderProps {
  appInfo: AppInfo | null;
}

export function AppHeader({ appInfo }: AppHeaderProps) {
  return (
    <Surface
      as="header"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-kumo-hairline bg-kumo-elevated px-6 py-4"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck size={24} weight="duotone" aria-hidden />
        <div>
          <Text variant="heading" as="h1" size="lg">
            Verifica Bloqueio DNS
          </Text>
          <Text variant="secondary" size="sm" as="p">
            Confira de uma vez se vários domínios estão bloqueados
          </Text>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="neutral">DNS: {appInfo?.ispDns ?? "—"}</Badge>
        <Badge variant="outline">Público: {appInfo?.publicDns ?? "—"}</Badge>
        {appInfo ? <Badge variant="teal-subtle">v{appInfo.version}</Badge> : null}
        <ThemeToggle />
      </div>
    </Surface>
  );
}
