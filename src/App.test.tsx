import { invoke } from "@tauri-apps/api/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { Answer, CheckEvent } from "./lib/types";
import { mockTauriWindow } from "./test/setup";

const invokeMock = vi.mocked(invoke);

const ok = (...value: string[]): Answer => ({ type: "ok", value });

/** Mocks the `check` command to synchronously stream the given events. */
function mockCheck(events: CheckEvent[]) {
  invokeMock.mockImplementation(async (cmd, args) => {
    if (cmd === "app_info") {
      return { version: "0.0.0-test", ispDns: "177.137.208.6", publicDns: "8.8.8.8" };
    }
    if (cmd === "check") {
      // biome-ignore lint/suspicious/noExplicitAny: test-only access to the mocked Channel.
      const channel = (args as any).onEvent;
      for (const event of events) {
        channel.onmessage(event);
      }
      return undefined;
    }
    return undefined;
  });
}

beforeEach(() => {
  localStorage.clear();
  invokeMock.mockReset();
  mockCheck([]);
});

describe("App", () => {
  it("renders the header, DNS settings and the input area, in English by default", async () => {
    render(<App />);

    expect(screen.getByText("Check DNS Block")).toBeInTheDocument();
    expect(screen.getByText("DNS server to query:")).toBeInTheDocument();
    expect(await screen.findByLabelText("Domains and IPs to check")).toBeInTheDocument();
  });

  it("only enables Check once something is typed", () => {
    render(<App />);
    const textarea = screen.getByLabelText("Domains and IPs to check");
    const verify = screen.getByRole("button", { name: "Check" });

    expect(verify).toBeDisabled();
    fireEvent.change(textarea, { target: { value: "example.com" } });
    expect(verify).toBeEnabled();
  });

  it("streams rows from the check command and filters them with 'show only blocked'", async () => {
    mockCheck([
      { type: "started", total: 2, ignored: 0, reference: "8.8.8.8", warning: null },
      {
        type: "row",
        index: 0,
        entry: "blocked.com",
        kind: "domain",
        verdict: "blocked",
        targetAnswer: { type: "nx_domain" },
        referenceAnswer: ok("93.184.216.34"),
        checkedAt: Date.UTC(2024, 0, 1),
      },
      {
        type: "row",
        index: 1,
        entry: "allowed.com",
        kind: "domain",
        verdict: "not_blocked",
        targetAnswer: ok("93.184.216.34"),
        referenceAnswer: ok("93.184.216.34"),
        checkedAt: Date.UTC(2024, 0, 1, 0, 0, 1),
      },
      { type: "finished" },
    ]);

    render(<App />);
    fireEvent.change(screen.getByLabelText("Domains and IPs to check"), {
      target: { value: "blocked.com\nallowed.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("blocked.com")).toBeInTheDocument();
    expect(screen.getByText("allowed.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Show only blocked" }));

    expect(screen.getByText("blocked.com")).toBeInTheDocument();
    expect(screen.queryByText("allowed.com")).not.toBeInTheDocument();
  });

  it("shows the backend's error message when the check command fails", async () => {
    invokeMock.mockImplementation(async (cmd) => {
      if (cmd === "app_info") {
        return { version: "0.0.0-test", ispDns: "177.137.208.6", publicDns: "8.8.8.8" };
      }
      if (cmd === "check") {
        throw { code: "server_unreachable", server: "192.0.2.1", control: "google.com" };
      }
      return undefined;
    });

    render(<App />);
    fireEvent.change(screen.getByLabelText("Domains and IPs to check"), {
      target: { value: "example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText(/did not respond to the test query/)).toBeInTheDocument();
  });

  it("renders the custom title bar's window controls and wires them to the Tauri window", async () => {
    render(<App />);

    expect(await screen.findByRole("button", { name: "Minimize" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Maximize" })).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeButton);

    expect(mockTauriWindow.close).toHaveBeenCalledOnce();
  });

  it("switches the UI to Português (Brasil) via the language menu and persists the choice", async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Change language" }));
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Português (Brasil)" }));

    expect(await screen.findByRole("button", { name: "Verificar" })).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.lang).toBe("pt-BR"));
    expect(localStorage.getItem("check-dns-block.locale")).toBe("pt-BR");
  });

  it("starts in Spanish when the OS language is Spanish and nothing was stored", async () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["es-ES"]);

    render(<App />);

    // "Limpiar" (es) is distinct from "Limpar" (pt-BR) and "Clear" (en).
    expect(await screen.findByRole("button", { name: "Limpiar" })).toBeInTheDocument();
  });
});
