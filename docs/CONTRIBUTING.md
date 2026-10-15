# Contributing

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

## Project layout

```
src/            React frontend (components/, lib/, i18n/)
src-tauri/      Rust backend (Tauri commands, app config)
.github/        CI and release workflows
.changeset/     Pending changesets
docs/           Contribution and release docs
```

## Adding a language

The UI, exports and file names are all driven by `src/i18n/`:

1. Add `src/i18n/locales/<code>.ts`, typed as `Messages` (from `./en`) so a missing key fails
   `pnpm typecheck`.
2. Register it in `LOCALES` and `MESSAGES` in `src/i18n/index.tsx`.
3. If the language should be auto-detected from the OS, extend `detectLocale` in the same file.

## Submitting changes

1. Open a PR against `main` as usual.
2. Run `pnpm changeset` to describe your change and pick a version bump
   (patch/minor/major) — CI (`.github/workflows/ci.yml`) fails PRs missing one.
3. Once merged, see [RELEASING.md](./RELEASING.md) for what happens next.
