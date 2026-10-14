import { Button, InputArea, Surface, Text } from "@cloudflare/kumo";
import { Broom, MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";

const PLACEHOLDER = `exemplo.com.br
192.0.2.10
outro-dominio.com`;

export function InputPanel() {
  const [value, setValue] = useState("");

  return (
    <Surface className="flex h-full flex-col gap-4 p-6">
      <div>
        <Text variant="heading" as="h2">
          Domínios e IPs
        </Text>
        <Text variant="secondary" size="sm" as="p">
          Cole um por linha. A verificação ainda não está implementada nesta etapa.
        </Text>
      </div>

      <InputArea
        value={value}
        onValueChange={setValue}
        placeholder={PLACEHOLDER}
        minRows={10}
        className="flex-1"
        aria-label="Domínios e IPs para verificar"
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="secondary"
          icon={<Broom size={16} />}
          onClick={() => setValue("")}
          disabled={value.length === 0}
        >
          Limpar
        </Button>
        {/* TODO: wire up to the Rust `check_domains` command once DNS resolution is implemented. */}
        <Button variant="primary" icon={<MagnifyingGlass size={16} />} disabled title="Em breve">
          Verificar
        </Button>
      </div>
    </Surface>
  );
}
