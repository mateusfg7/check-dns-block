import { useCallback, useRef, useState } from "react";
import { check } from "./ipc";
import type { CheckEvent, CheckRow } from "./types";

export type CheckStatus = "idle" | "running" | "done" | "error";

export interface CheckState {
  status: CheckStatus;
  rows: CheckRow[];
  total: number;
  ignored: number;
  server: string;
  /** The reference DNS actually used (may differ from what was requested if it failed preflight). */
  reference: string | null;
  warning: string | null;
  error: string | null;
}

const INITIAL_STATE: CheckState = {
  status: "idle",
  rows: [],
  total: 0,
  ignored: 0,
  server: "",
  reference: null,
  warning: null,
  error: null,
};

/**
 * Drives the `check` IPC call and accumulates its streamed events into a
 * single state object the UI can render directly.
 */
export function useCheck() {
  const [state, setState] = useState<CheckState>(INITIAL_STATE);
  // Bumped on every `start`/`clear` so events from a superseded run are
  // ignored instead of clobbering a newer run's state.
  const runId = useRef(0);

  const start = useCallback(async (input: string, server: string, reference: string | null) => {
    const id = ++runId.current;
    setState({
      status: "running",
      rows: [],
      total: 0,
      ignored: 0,
      server,
      reference,
      warning: null,
      error: null,
    });

    const onEvent = (event: CheckEvent) => {
      if (runId.current !== id) {
        return;
      }
      setState((prev) => {
        switch (event.type) {
          case "started":
            return {
              ...prev,
              total: event.total,
              ignored: event.ignored,
              reference: event.reference,
              warning: event.warning,
            };
          case "row": {
            const { type: _type, ...row } = event;
            const rows = [...prev.rows, row as CheckRow].sort((a, b) => a.index - b.index);
            return { ...prev, rows };
          }
          case "finished":
            return { ...prev, status: "done" };
          default:
            return prev;
        }
      });
    };

    try {
      await check(input, server, reference, onEvent);
    } catch (err) {
      if (runId.current !== id) {
        return;
      }
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }, []);

  const clear = useCallback(() => {
    runId.current += 1;
    setState(INITIAL_STATE);
  }, []);

  return { state, start, clear };
}
