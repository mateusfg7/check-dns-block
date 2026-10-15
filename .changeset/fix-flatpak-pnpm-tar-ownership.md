---
"check-dns-block": patch
---

Fixed the Flatpak build failing on its first step: the vendored pnpm release tarball carries macOS
file ownership that an unprivileged `tar` inside the build sandbox couldn't apply.
