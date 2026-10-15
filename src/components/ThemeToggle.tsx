import { Button } from "@cloudflare/kumo";
import { Moon, Sun } from "@phosphor-icons/react";
import { useI18n } from "../i18n";
import { useTheme } from "../lib/useTheme";

export function ThemeToggle() {
  const { t } = useI18n();
  const [theme, toggle] = useTheme();

  return (
    <Button
      variant="ghost"
      shape="square"
      aria-label={theme === "dark" ? t.theme.useLight : t.theme.useDark}
      onClick={toggle}
      icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    />
  );
}
