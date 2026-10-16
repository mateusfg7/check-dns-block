---
"check-dns-block": patch
---

Fixed the Flatpak build failing with a YAML "duplicated mapping key" error: the build-command that
writes pnpm's offline store settings to `pnpm-workspace.yaml` now strips any existing copies of
those settings before appending, so it's safe to run against an already-mutated file (e.g. if
flatpak-builder reuses a module's build directory across runs).
