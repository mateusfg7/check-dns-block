import { Banner, Surface } from "@cloudflare/kumo";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";
import { FALLBACK_APP_INFO, getAppInfo, saveTextFile } from "./lib/ipc";
import { toCsv, toEvidence, toTsv } from "./lib/report";
import type { AppInfo } from "./lib/types";
import { useCheck } from "./lib/useCheck";

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
    await navigator.clipboard.writeText(toTsv(visibleRows, state.server, state.reference));
    setFeedback(`${visibleRows.length} linhas copiadas para a área de transferência.`);
  }

  async function handleSaveCsv() {
    const path = await saveTextFile({
      defaultName: `bloqueio-dns-${fileTimestamp()}.csv`,
      filterName: "CSV",
      extension: "csv",
      contents: toCsv(visibleRows, state.server, state.reference),
      bom: true,
    });
    if (path) {
      setFeedback(`Salvo em ${path}`);
    }
  }

  async function handleSaveEvidence() {
    const path = await saveTextFile({
      defaultName: `evidencia-bloqueio-dns-${fileTimestamp()}.txt`,
      filterName: "Texto",
      extension: "txt",
      contents: toEvidence(state.rows, state.server, state.reference, new Date()),
    });
    if (path) {
      setFeedback(`Evidência salva em ${path}`);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-kumo-base text-kumo-default">
      <AppHeader appInfo={appInfo} />

      {state.error ? (
        <Banner variant="error" title="Não foi possível verificar" description={state.error} />
      ) : state.warning ? (
        <Banner variant="alert" description={state.warning} />
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
