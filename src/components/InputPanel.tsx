import { Input, InputArea, Switch, Text } from "@cloudflare/kumo";
import { useI18n } from "../i18n";

interface InputPanelProps {
  server: string;
  onServerChange: (value: string) => void;
  compareEnabled: boolean;
  onCompareEnabledChange: (value: boolean) => void;
  reference: string;
  onReferenceChange: (value: string) => void;
  value: string;
  onValueChange: (value: string) => void;
  running: boolean;
}

export function InputPanel({
  server,
  onServerChange,
  compareEnabled,
  onCompareEnabledChange,
  reference,
  onReferenceChange,
  value,
  onValueChange,
  running,
}: InputPanelProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Text variant="body" size="sm">
            {t.input.serverLabel}
          </Text>
          <Input
            aria-label={t.input.serverAriaLabel}
            value={server}
            onChange={(e) => onServerChange(e.target.value)}
            disabled={running}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            label={t.input.compareLabel}
            checked={compareEnabled}
            onCheckedChange={onCompareEnabledChange}
            disabled={running}
          />
          <Input
            aria-label={t.input.referenceAriaLabel}
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            disabled={running || !compareEnabled}
            className="w-36"
          />
        </div>
      </div>

      <Text variant="secondary" size="sm" as="p">
        {t.input.hint}
      </Text>

      <InputArea
        value={value}
        onValueChange={onValueChange}
        placeholder={t.input.placeholder}
        rows={5}
        disabled={running}
        aria-label={t.input.textareaAriaLabel}
      />
    </div>
  );
}
