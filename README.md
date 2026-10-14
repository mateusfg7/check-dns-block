<!-- TODO: replace `mateusfg7/ip-block-checker` below with the real GitHub slug once this repo has a remote. -->

# Verifica Bloqueio DNS

[![CI](https://github.com/mateusfg7/ip-block-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/mateusfg7/ip-block-checker/actions/workflows/ci.yml)
[![Release](https://github.com/mateusfg7/ip-block-checker/actions/workflows/release.yml/badge.svg)](https://github.com/mateusfg7/ip-block-checker/actions/workflows/release.yml)

Cross-platform rewrite of the original `Verifica-Bloqueio-DNS.cmd` (Windows-only) tool, which
checks whether a list of domains/IPs is blocked on a given DNS server by comparing its answers
against a public DNS server.

Built with [Tauri 2](https://tauri.app), Rust, React and [Kumo](https://github.com/cloudflare/kumo).

<!-- TODO: swap in a real screenshot once `pnpm tauri dev` has been visually checked. -->
<!-- ![Verifica Bloqueio DNS screenshot](./docs/screenshot.png) -->

## Status

The window workflow from the original `.cmd` tool is implemented: paste domains/IPs, resolve
them against a configurable target DNS and reference DNS, and export the results.

| Feature (from the original `.cmd` tool) | Status |
| --- | --- |
| App shell: header, input/results panes, status bar | ✅ done |
| CI: lint, typecheck, tests, debug build | ✅ done |
| Release: Changesets version PR → tagged draft release w/ installers | ✅ done |
| Paste domains/IPs and resolve against the target + public DNS | ✅ done |
| Classify each result: `BLOQUEADO` / `NÃO BLOQUEADO` / `NÃO EXISTE` / `NÃO RESOLVE` / `SEM RESPOSTA` | ✅ done |
| Reverse (PTR) lookup for pasted IPs — `REVERSO OK` / `SEM REVERSO` | ✅ done |
| "Mostrar só bloqueados" filter | ✅ done |
| "Copiar resultado" — copy the visible rows as TSV | ✅ done |
| "Salvar CSV…" — export a `;`-delimited CSV | ✅ done |
| "Salvar evidência…" — export a timestamped TXT report | ✅ done |
| Configurable DNS servers (defaults to `177.137.208.6` / `8.8.8.8`) | ✅ done |
| Command-line mode (`<app> lista.txt [dns]`) | 🗒️ planned |

## Requirements

- [Node.js](https://nodejs.org) LTS and [pnpm](https://pnpm.io) (`corepack enable` picks up the
  pinned version from `packageManager` in `package.json`)
- [Rust](https://www.rust-lang.org/tools/install) (stable)
- Platform prerequisites from the [Tauri docs](https://tauri.app/start/prerequisites/) — on
  Fedora/RHEL that's `webkit2gtk4.1-devel gtk3-devel libappindicator-gtk3-devel librsvg2-devel
  openssl-devel`; on Debian/Ubuntu `libwebkit2gtk-4.1-dev libgtk-3-dev libappindicator3-dev
  librsvg2-dev patchelf libssl-dev`.

## Development

```bash
pnpm install
pnpm tauri dev      # launches the desktop app with hot reload
```

Other useful commands:

```bash
pnpm lint           # Biome check
pnpm typecheck      # tsc --noEmit
pnpm test           # Vitest (frontend)
pnpm build          # production frontend build
pnpm tauri build    # production desktop bundle

cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

## Releases

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning:

1. `pnpm changeset` — describe your change, pick a bump (patch/minor/major).
2. Push and merge your PR as usual. CI (`.github/workflows/ci.yml`) checks that a changeset is
   present.
3. On merge to `main`, `.github/workflows/release.yml` opens/updates a "Version Packages" PR
   that bumps `package.json`, `src-tauri/Cargo.toml` and the changelog.
4. Merging that PR tags the release and builds signed-less installers for Windows, macOS and
   Linux, attached to a draft GitHub Release.

## Project layout

```
src/            React frontend (components/, lib/)
src-tauri/      Rust backend (Tauri commands, app config)
.github/        CI and release workflows
.changeset/     Pending changesets
```
