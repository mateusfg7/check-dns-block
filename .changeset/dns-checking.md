---
"ip-block-checker": minor
---

Implement real DNS block checking: paste domains/IPs, resolve them against a configurable
target DNS and reference DNS (via `hickory-resolver`), classify each result exactly like the
original `.cmd` tool (`BLOQUEADO`/`NÃO BLOQUEADO`/`NÃO RESOLVE`/`SEM RESPOSTA`/`NÃO EXISTE`,
plus `REVERSO OK`/`SEM REVERSO` for pasted IPs), and stream progress to the UI. Adds the
"Mostrar só bloqueados" filter, "Copiar resultado" (TSV to clipboard), "Salvar CSV…" and
"Salvar evidência…" exports, matching the original tool's reports.
