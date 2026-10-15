---
"check-dns-block": patch
---

Fixed the Flatpak build's offline pnpm install still hitting the network: since pnpm 11, `.npmrc`
only reads auth/registry settings and `minimumReleaseAge` (package publish-age checking) defaults
to 24h, neither of which `--offline` was skipping. `storeDir` now goes in `pnpm-workspace.yaml`
(where pnpm 11 actually reads it) and `minimumReleaseAge` is disabled for this build.
