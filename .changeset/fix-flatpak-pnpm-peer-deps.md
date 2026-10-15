---
"check-dns-block": patch
---

Fixed the Flatpak build's offline pnpm install failing on packages with peer dependencies (e.g.
`@cloudflare/kumo`) with `[ERR_PNPM_NO_OFFLINE_TARBALL] ... missing from the store`: the generated
offline store was in an older format (v10) than pnpm 11 actually uses (v11), and even once matched,
packages pnpm resolves by a peer-qualified id needed their store entry indexed under that id too.
