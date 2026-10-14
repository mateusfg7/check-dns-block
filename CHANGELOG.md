# check-dns-block

## 0.2.0

### Minor Changes

- 8455675: Implement real DNS block checking: paste domains/IPs, resolve them against a configurable
  target DNS and reference DNS (via `hickory-resolver`), classify each result
  (`BLOQUEADO`/`NÃO BLOQUEADO`/`NÃO RESOLVE`/`SEM RESPOSTA`/`NÃO EXISTE`, plus `REVERSO
  OK`/`SEM REVERSO` for pasted IPs), and stream progress to the UI. Adds the "Mostrar só
  bloqueados" filter, "Copiar resultado" (TSV to clipboard), "Salvar CSV…" and "Salvar
  evidência…" exports.
- 20ab47a: Scaffold Check DNS Block: a Tauri + Rust + React app shell, Kumo-based UI layout, CI (lint,
  typecheck, test, build) and the Changesets release workflow. No DNS checking logic yet.
