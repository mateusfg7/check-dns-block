import { invoke } from "@tauri-apps/api/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { CheckEvent } from "./lib/types";

const invokeMock = vi.mocked(invoke);

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
  it("renders the header, DNS settings and the input area", async () => {
    render(<App />);

    expect(screen.getByText("Check DNS Block")).toBeInTheDocument();
    expect(screen.getByText("Servidor DNS a consultar:")).toBeInTheDocument();
    expect(await screen.findByLabelText("Domínios e IPs para verificar")).toBeInTheDocument();
  });

  it("only enables Verificar once something is typed", () => {
    render(<App />);
    const textarea = screen.getByLabelText("Domínios e IPs para verificar");
    const verify = screen.getByRole("button", { name: "Verificar" });

    expect(verify).toBeDisabled();
    fireEvent.change(textarea, { target: { value: "exemplo.com.br" } });
    expect(verify).toBeEnabled();
  });

  it("streams rows from the check command and filters them with 'só bloqueados'", async () => {
    mockCheck([
      { type: "started", total: 2, ignored: 0, reference: "8.8.8.8", warning: null },
      {
        type: "row",
        index: 0,
        entry: "bloqueado.com",
        kind: "domain",
        verdict: "blocked",
        targetAnswer: "não resolve (NXDOMAIN)",
        referenceAnswer: "93.184.216.34",
        checkedAt: "01/01/2024 00:00:00",
      },
      {
        type: "row",
        index: 1,
        entry: "liberado.com",
        kind: "domain",
        verdict: "not_blocked",
        targetAnswer: "93.184.216.34",
        referenceAnswer: "93.184.216.34",
        checkedAt: "01/01/2024 00:00:01",
      },
      { type: "finished" },
    ]);

    render(<App />);
    fireEvent.change(screen.getByLabelText("Domínios e IPs para verificar"), {
      target: { value: "bloqueado.com\nliberado.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));

    expect(await screen.findByText("bloqueado.com")).toBeInTheDocument();
    expect(screen.getByText("liberado.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Mostrar só bloqueados" }));

    expect(screen.getByText("bloqueado.com")).toBeInTheDocument();
    expect(screen.queryByText("liberado.com")).not.toBeInTheDocument();
  });

  it("shows the backend's error message when the check command fails", async () => {
    invokeMock.mockImplementation(async (cmd) => {
      if (cmd === "app_info") {
        return { version: "0.0.0-test", ispDns: "177.137.208.6", publicDns: "8.8.8.8" };
      }
      if (cmd === "check") {
        throw new Error("O servidor 192.0.2.1 não respondeu a consulta de teste (google.com).");
      }
      return undefined;
    });

    render(<App />);
    fireEvent.change(screen.getByLabelText("Domínios e IPs para verificar"), {
      target: { value: "exemplo.com.br" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));

    expect(await screen.findByText(/não respondeu a consulta de teste/)).toBeInTheDocument();
  });
});
