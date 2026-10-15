import { Badge, Button, Dialog, Link, Text } from "@cloudflare/kumo";
import { GithubLogo, Info, ShieldCheck } from "@phosphor-icons/react";
import type { MouseEvent } from "react";
import { useI18n } from "../i18n";
import { openExternal } from "../lib/ipc";
import type { AppInfo } from "../lib/types";

const REPO_URL = "https://github.com/mateusfg7/check-dns-block";
const AUTHOR_URL = "https://mateusf.com";

interface AboutDialogProps {
  appInfo: AppInfo | null;
}

/** Opens `url` in the system browser instead of navigating the app's own webview. */
function openInBrowser(url: string) {
  return (event: MouseEvent) => {
    event.preventDefault();
    openExternal(url);
  };
}

/** Title-bar dialog with the app's version, license and author credits. */
export function AboutDialog({ appInfo }: AboutDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog.Root>
      <Dialog.Trigger
        render={(props) => (
          <Button
            {...props}
            variant="ghost"
            shape="square"
            aria-label={t.about.label}
            icon={<Info size={18} />}
          />
        )}
      />
      <Dialog className="p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-kumo-brand text-white">
            <ShieldCheck size={18} weight="duotone" aria-hidden />
          </span>
          <Dialog.Title className="flex items-baseline gap-2">
            <Text variant="heading">{t.about.title}</Text>
            {appInfo ? <Badge variant="teal-subtle">v{appInfo.version}</Badge> : null}
          </Dialog.Title>
        </div>

        <Dialog.Description className="mt-3">{t.about.description}</Dialog.Description>

        <div className="mt-4 flex flex-col gap-1.5">
          <Text variant="secondary" size="sm">
            {t.about.license}
          </Text>
          <Link
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openInBrowser(AUTHOR_URL)}
          >
            {t.about.madeBy}
          </Link>
          <Link
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={openInBrowser(REPO_URL)}
            className="flex items-center gap-1.5"
          >
            <GithubLogo size={16} aria-hidden />
            {t.about.sourceCode}
          </Link>
        </div>

        <div className="mt-6 flex justify-end">
          <Dialog.Close
            render={(props) => (
              <Button {...props} variant="secondary">
                {t.about.close}
              </Button>
            )}
          />
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
