import { useEffect, useState } from "react";
import { AppHeader } from "./components/AppHeader";
import { InputPanel } from "./components/InputPanel";
import { ResultsPanel } from "./components/ResultsPanel";
import { StatusBar } from "./components/StatusBar";
import { getAppInfo } from "./lib/ipc";
import type { AppInfo } from "./lib/types";

export function App() {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    getAppInfo().then(setAppInfo);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-kumo-base text-kumo-default">
      <AppHeader appInfo={appInfo} />

      <main className="grid flex-1 grid-cols-1 gap-px overflow-hidden bg-kumo-hairline lg:grid-cols-2">
        <InputPanel />
        <ResultsPanel />
      </main>

      <StatusBar total={0} blocked={0} notBlocked={0} notFound={0} />
    </div>
  );
}
