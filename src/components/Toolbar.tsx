import { Button, Switch } from "@cloudflare/kumo";
import { Broom, ClipboardText, FloppyDisk, MagnifyingGlass } from "@phosphor-icons/react";

interface ToolbarProps {
  running: boolean;
  canVerify: boolean;
  onVerify: () => void;
  onClear: () => void;
  hasResults: boolean;
  onCopy: () => void;
  onSaveCsv: () => void;
  onSaveEvidence: () => void;
  onlyBlocked: boolean;
  onOnlyBlockedChange: (value: boolean) => void;
}

/** The action row from the original tool's window: Verificar/Limpar on the
 * left, the export actions, then the "só bloqueados" filter. */
export function Toolbar({
  running,
  canVerify,
  onVerify,
  onClear,
  hasResults,
  onCopy,
  onSaveCsv,
  onSaveEvidence,
  onlyBlocked,
  onOnlyBlockedChange,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        icon={<MagnifyingGlass size={16} />}
        onClick={onVerify}
        disabled={running || !canVerify}
      >
        Verificar
      </Button>
      <Button variant="secondary" icon={<Broom size={16} />} onClick={onClear} disabled={running}>
        Limpar
      </Button>
      <Button
        variant="secondary"
        icon={<ClipboardText size={16} />}
        onClick={onCopy}
        disabled={!hasResults}
      >
        Copiar resultado
      </Button>
      <Button
        variant="secondary"
        icon={<FloppyDisk size={16} />}
        onClick={onSaveCsv}
        disabled={!hasResults}
      >
        Salvar CSV…
      </Button>
      <Button
        variant="secondary"
        icon={<FloppyDisk size={16} />}
        onClick={onSaveEvidence}
        disabled={!hasResults}
      >
        Salvar evidência…
      </Button>
      <Switch
        label="Mostrar só bloqueados"
        checked={onlyBlocked}
        onCheckedChange={onOnlyBlockedChange}
        size="sm"
      />
    </div>
  );
}
