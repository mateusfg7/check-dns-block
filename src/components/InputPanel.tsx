import { Input, InputArea, Switch, Text } from "@cloudflare/kumo";

const PLACEHOLDER = `exemplo.com.br
192.0.2.10
outro-dominio.com`;

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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Text variant="body" size="sm">
            Servidor DNS a consultar:
          </Text>
          <Input
            aria-label="Servidor DNS a consultar"
            value={server}
            onChange={(e) => onServerChange(e.target.value)}
            disabled={running}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            label="Comparar com DNS público:"
            checked={compareEnabled}
            onCheckedChange={onCompareEnabledChange}
            disabled={running}
          />
          <Input
            aria-label="DNS público de comparação"
            value={reference}
            onChange={(e) => onReferenceChange(e.target.value)}
            disabled={running || !compareEnabled}
            className="w-36"
          />
        </div>
      </div>

      <Text variant="secondary" size="sm" as="p">
        Cole abaixo os domínios e/ou IPs (um por linha, ou separados por espaço, vírgula ou ponto e
        vírgula):
      </Text>

      <InputArea
        value={value}
        onValueChange={onValueChange}
        placeholder={PLACEHOLDER}
        rows={5}
        disabled={running}
        aria-label="Domínios e IPs para verificar"
      />
    </div>
  );
}
