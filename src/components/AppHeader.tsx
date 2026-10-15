import { Badge, Surface, Text } from "@cloudflare/kumo";
import { ShieldCheck } from "@phosphor-icons/react";
import type { AppInfo } from "../lib/types";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeToggle } from "./ThemeToggle";
import { WindowControls } from "./WindowControls";

interface AppHeaderProps {
  appInfo: AppInfo | null;
}

/**
 * The app's title bar. Replaces the native window decorations (disabled via
 * `decorations: false` in tauri.conf.json) so the app looks the same, and
 * follows the Kumo theme, on every platform. The whole bar is a Tauri drag
 * region — every non-interactive element inside it also needs
 * `data-tauri-drag-region`, since Tauri only starts a drag when the event
 * target itself carries the attribute.
 */
export function AppHeader({ appInfo }: AppHeaderProps) {
  return (
    <Surface
      as="header"
      data-tauri-drag-region
      className="flex h-11 shrink-0 select-none items-center justify-between border-b border-kumo-hairline bg-kumo-elevated pl-3"
    >
      <div data-tauri-drag-region className="flex items-center gap-2.5">
        <span
          data-tauri-drag-region
          className="flex h-6 w-6 items-center justify-center rounded-md bg-kumo-brand text-white"
        >
          <ShieldCheck size={16} weight="duotone" aria-hidden />
        </span>
        <Text data-tauri-drag-region variant="heading" as="h1">
          Check DNS Block
        </Text>
        {appInfo ? <Badge variant="teal-subtle">v{appInfo.version}</Badge> : null}
      </div>

      <div className="flex h-full items-center gap-1 pr-1">
        <LanguageMenu />
        <ThemeToggle />
        <span className="mx-1 h-5 w-px bg-kumo-hairline" aria-hidden />
        <WindowControls />
      </div>
    </Surface>
  );
}
