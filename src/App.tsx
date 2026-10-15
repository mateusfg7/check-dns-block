import { Banner, Surface } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { errorText, I18nProvider, saveErrorText, useI18n, warningText } from "./i18n";
import { FALLBACK_APP_INFO, getAppInfo, saveTextFile } from "./lib/ipc";
import { toCsv, toEvidence, toTsv } from "./lib/report";
import type { AppInfo, SaveError } from "./lib/types";
import { useCheck } from "./lib/useCheck";

/** Normalizes a rejection from `saveTextFile` into a `SaveError`. */
function toSaveError(err: unknown): SaveError {
  return err && typeof err === "object" && "code" in err
    ? (err as SaveError)
    : { code: "write_failed", message: err instanceof Error ? err.message : String(err) };
}

const STORAGE_KEY = "check-dns-block:settings";

interface StoredSettings {
  server: string;
  compareEnabled: boolean;
  reference: string;
}

function loadSettings(): StoredSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSettings) : null;
  } catch {
    return null;
  }
}

function saveSettings(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing, quota exceeded, etc. — settings just won't persist.
  }
}

function fileTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

export function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

function AppContent() {
  const { t } = useI18n();
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const stored = useMemo(loadSettings, []);
  const [server, setServer] = useState(stored?.server ?? FALLBACK_APP_INFO.ispDns);
  const [compareEnabled, setCompareEnabled] = useState(stored?.compareEnabled ?? true);
  const [reference, setReference] = useState(stored?.reference ?? FALLBACK_APP_INFO.publicDns);
  const [input, setInput] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { state, start, clear } = useCheck();

  useEffect(() => {
    getAppInfo().then(setAppInfo);
  }, []);

  useEffect(() => {
    saveSettings({ server, compareEnabled, reference });
  }, [server, compareEnabled, reference]);

  useEffect(() => {
    if (state.status === "running") {
      setFeedback(null);
    }
  }, [state.status]);

  const running = state.status === "running";
  const hasResults = state.rows.length > 0;
  const visibleRows = onlyBlocked
    ? state.rows.filter((row) => row.verdict === "blocked")
    : state.rows;

  async function handleCopy() {
    await navigator.clipboard.writeText(toTsv(visibleRows, state.server, state.reference, t));
    setFeedback(t.status.copied(visibleRows.length));
  }

  async function handleSaveCsv() {
    try {
      const path = await saveTextFile({
        defaultName: t.files.csvName(fileTimestamp()),
        filterName: t.files.csvFilter,
        extension: "csv",
        contents: toCsv(visibleRows, state.server, state.reference, t),
        bom: true,
      });
      if (path) {
        setFeedback(t.status.savedAt(path));
      }
    } catch (err) {
      setFeedback(saveErrorText(toSaveError(err), t));
    }
  }

  async function handleSaveEvidence() {
    try {
      const path = await saveTextFile({
        defaultName: t.files.evidenceName(fileTimestamp()),
        filterName: t.files.evidenceFilter,
        extension: "txt",
        contents: toEvidence(state.rows, state.server, state.reference, new Date(), t),
      });
      if (path) {
        setFeedback(t.status.evidenceSavedAt(path));
      }
    } catch (err) {
      setFeedback(saveErrorText(toSaveError(err), t));
    }
  }

  return (
    <div className="flex h-screen flex-col bg-kumo-base text-kumo-default">
      <AppHeader appInfo={appInfo} />

      {state.error ? (
        <Banner
          variant="error"
          title={t.errors.bannerTitle}
          description={errorText(state.error, t)}
        />
      ) : state.warning ? (
        <Banner variant="alert" description={warningText(state.warning, t)} />
      ) : null}

      <main className="flex flex-1 flex-col overflow-hidden">
        <Surface className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
          <InputPanel
            server={server}
            onServerChange={setServer}
            compareEnabled={compareEnabled}
            onCompareEnabledChange={setCompareEnabled}
            reference={reference}
            onReferenceChange={setReference}
            value={input}
            onValueChange={setInput}
            running={running}
          />

          <Toolbar
            running={running}
            canVerify={input.trim().length > 0}
            onVerify={() => start(input, server, compareEnabled ? reference : null)}
            onClear={() => {
              setInput("");
              clear();
            }}
            hasResults={hasResults}
            onCopy={handleCopy}
            onSaveCsv={handleSaveCsv}
            onSaveEvidence={handleSaveEvidence}
            onlyBlocked={onlyBlocked}
            onOnlyBlockedChange={setOnlyBlocked}
          />

          <ResultsPanel
            rows={visibleRows}
            server={state.server}
            reference={state.reference}
            status={state.status}
          />
        </Surface>
      </main>

      <StatusBar
        status={state.status}
        rows={state.rows}
        total={state.total}
        ignored={state.ignored}
        feedback={feedback}
      />
    </div>
  );
}
