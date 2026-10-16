# check-dns-block

## 0.4.4

### Patch Changes

- b2ca915: Fixed the Flatpak build failing with a YAML "duplicated mapping key" error: the build-command that
  writes pnpm's offline store settings to `pnpm-workspace.yaml` now strips any existing copies of
  those settings before appending, so it's safe to run against an already-mutated file (e.g. if
  flatpak-builder reuses a module's build directory across runs).

## 0.4.3

### Patch Changes

- 6d18098: Fixed the Flatpak build's offline pnpm install failing on packages with peer dependencies (e.g.
  `@cloudflare/kumo`) with `[ERR_PNPM_NO_OFFLINE_TARBALL] ... missing from the store`: the generated
  offline store was in an older format (v10) than pnpm 11 actually uses (v11), and even once matched,
  packages pnpm resolves by a peer-qualified id needed their store entry indexed under that id too.

## 0.4.2

### Patch Changes

- 64faa2b: Fixed the Flatpak build's offline pnpm install still hitting the network: since pnpm 11, `.npmrc`
  only reads auth/registry settings and `minimumReleaseAge` (package publish-age checking) defaults
  to 24h, neither of which `--offline` was skipping. `storeDir` now goes in `pnpm-workspace.yaml`
  (where pnpm 11 actually reads it) and `minimumReleaseAge` is disabled for this build.

## 0.4.1

### Patch Changes

- 1cd29c7: Fixed the Flatpak build failing on its first step: the vendored pnpm release tarball carries macOS
  file ownership that an unprivileged `tar` inside the build sandbox couldn't apply.

## 0.4.0

### Minor Changes

- 71c9da2: Added Flatpak packaging. Every release now also attaches a `.flatpak` bundle, and the app is
  submitted to Flathub as `com.mateusf.CheckDNSBlock`.

## 0.3.0

### Minor Changes

- 7341276: Added an About dialog (in the title bar) with the app's license, author credits and a link to
  the source code. The project is now MIT licensed.
- 11d57bf: Replaced the native window decorations with a custom title bar that follows the app's light/dark theme and looks the same on Windows, macOS and Linux. Also replaced the placeholder Tauri icon with a proper app icon.
- 742ad53: Added multi-language support: English (default), Português (Brasil) and Español, switchable from
  the title bar. The language is detected from the OS on first launch and the choice is remembered
  afterwards. Exported CSV/evidence files and their default file names now follow the selected
  language.

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
