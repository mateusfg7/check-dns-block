import { Button } from "@cloudflare/kumo";
import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "../lib/useTheme";

export function ThemeToggle() {
  const [theme, toggle] = useTheme();

  return (
    <Button
      variant="ghost"
      shape="square"
      aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}
      onClick={toggle}
      icon={theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    />
  );
}
