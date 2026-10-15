import { Button, DropdownMenu } from "@cloudflare/kumo";
import { Translate } from "@phosphor-icons/react";
import { LOCALES, type Locale, useI18n } from "../i18n";

/** Lets the user switch between the app's supported languages. */
export function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger>
        <Button
          variant="ghost"
          shape="square"
          aria-label={t.language.label}
          icon={<Translate size={18} />}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.RadioGroup
          value={locale}
          onValueChange={(value) => setLocale(value as Locale)}
        >
          {LOCALES.map(({ code, nativeName }) => (
            <DropdownMenu.RadioItem key={code} value={code} closeOnClick>
              {nativeName}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}
