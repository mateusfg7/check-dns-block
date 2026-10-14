import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("renders the header and both panels", async () => {
    render(<App />);

    expect(screen.getByText("Verifica Bloqueio DNS")).toBeInTheDocument();
    expect(screen.getByText("Domínios e IPs")).toBeInTheDocument();
    expect(await screen.findByText("Resultado")).toBeInTheDocument();
  });

  it("keeps the Verificar button disabled (DNS logic not implemented yet)", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Verificar" })).toBeDisabled();
  });
});
