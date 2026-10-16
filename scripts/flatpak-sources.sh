#!/usr/bin/env bash
# Regenerates the offline dependency sources the Flatpak build needs
# (flatpak/generated-sources/{cargo,node}-sources.json) from the current
# Cargo.lock and pnpm-lock.yaml.
#
# Not committed (see .gitignore): Renovate updates the lockfiles constantly,
# and these files just restate their contents as download URLs + hashes.
# CI runs this script right before building the Flatpak (see
# .github/workflows/release.yml) instead.
#
# Requires: python3, pip, curl, and `pnpm dlx` (network access - this script
# itself is never run inside the Flatpak build sandbox).
#
# Run as `pnpm flatpak:sources`.
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
out_dir="$root_dir/flatpak/generated-sources"
mkdir -p "$out_dir"

echo "==> Installing flatpak-builder-tools generators"
pip install --quiet --upgrade \
  "git+https://github.com/flatpak/flatpak-builder-tools.git#egg=flatpak_node_generator&subdirectory=node" \
  aiohttp tomlkit
curl -sSL -o "$out_dir/flatpak-cargo-generator.py" \
  https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/master/cargo/flatpak-cargo-generator.py

echo "==> Generating cargo-sources.json from src-tauri/Cargo.lock"
python3 "$out_dir/flatpak-cargo-generator.py" \
  -o "$out_dir/cargo-sources.json" \
  "$root_dir/src-tauri/Cargo.lock"
# The generator writes the vendored-sources config as `cargo/config`, which
# modern cargo accepts but warns is deprecated in favor of `config.toml`.
python3 -c '
import json
path = "'"$out_dir"'/cargo-sources.json"
with open(path) as f:
    sources = json.load(f)
for s in sources:
    if s.get("dest") == "cargo" and s.get("dest-filename") == "config":
        s["dest-filename"] = "config.toml"
with open(path, "w") as f:
    json.dump(sources, f, indent=2)
'

echo "==> Generating node-sources.json from pnpm-lock.yaml"
# Converting to an npm lockfile (via `pnpm-lock-to-npm-lock` + the npm
# provider - what https://github.com/ndom91/gitbutler-flathub does for its
# own Tauri+pnpm build) was tried first, but the converted lockfile breaks
# `npm ci`/`npm install` on this repo's dependency tree ("must provide
# string spec" from npm's Arborist), almost certainly because of the many
# multi-platform optional native packages here (Rolldown, Lightning CSS,
# Tailwind's oxide engine). The native pnpm provider below worked instead;
# its known bugs (e.g. flatpak/flatpak-builder-tools#562) are about specific
# packages (xlsx) this project doesn't depend on.
# --pnpm-store-version v11: the generator defaults to v10 for our
# lockfileVersion (9.0), but pnpm 11's own default store (`pnpm store path`)
# is v11 - mismatched versions mean the offline install can still silently
# half-work (most packages resolve) while specific ones fail, so pin it to
# what our vendored pnpm binary (see flatpak/*.yml) actually uses.
flatpak-node-generator --no-requests-cache --pnpm-store-version v11 \
  -o "$out_dir/node-sources.json" pnpm "$root_dir/pnpm-lock.yaml"

echo "==> Done: $out_dir/{cargo,node}-sources.json"
