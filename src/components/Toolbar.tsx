import { Button, Switch } from "@cloudflare/kumo";
import { Broom, ClipboardText, FloppyDisk, MagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "../i18n";

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

/** The action row: Check/Clear on the left, the export actions, then
 * the "only blocked" filter. */
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
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="primary"
        icon={<MagnifyingGlass size={16} />}
        onClick={onVerify}
        disabled={running || !canVerify}
      >
        {t.toolbar.verify}
      </Button>
      <Button variant="secondary" icon={<Broom size={16} />} onClick={onClear} disabled={running}>
        {t.toolbar.clear}
      </Button>
      <Button
        variant="secondary"
        icon={<ClipboardText size={16} />}
        onClick={onCopy}
        disabled={!hasResults}
      >
        {t.toolbar.copyResult}
      </Button>
      <Button
        variant="secondary"
        icon={<FloppyDisk size={16} />}
        onClick={onSaveCsv}
        disabled={!hasResults}
      >
        {t.toolbar.saveCsv}
      </Button>
      <Button
        variant="secondary"
        icon={<FloppyDisk size={16} />}
        onClick={onSaveEvidence}
        disabled={!hasResults}
      >
        {t.toolbar.saveEvidence}
      </Button>
      <Switch
        label={t.toolbar.onlyBlocked}
        checked={onlyBlocked}
        onCheckedChange={onOnlyBlockedChange}
        size="sm"
      />
    </div>
  );
}
