<div align="center">

# Check DNS Block

[![CI](https://github.com/mateusfg7/check-dns-block/actions/workflows/ci.yml/badge.svg)](https://github.com/mateusfg7/check-dns-block/actions/workflows/ci.yml)
[![Release](https://github.com/mateusfg7/check-dns-block/actions/workflows/release.yml/badge.svg)](https://github.com/mateusfg7/check-dns-block/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

Cross-platform desktop app that checks whether a list of domains/IPs is blocked on a given
DNS server, by comparing its answers against a reference DNS server.

Built with [Tauri 2](https://tauri.app), Rust, React and [Kumo](https://github.com/cloudflare/kumo).

![Check DNS Block screenshot placeholder](./docs/screenshot.png)

</div>

## Features

- 🔎 Paste domains and/or IPs and resolve them against a configurable target DNS and reference DNS
- 🚦 Classify each result: `BLOCKED` / `NOT BLOCKED` / `NOT FOUND` / `NOT RESOLVED` / `NO RESPONSE`
- 🔁 Reverse (PTR) lookup for pasted IPs — `REVERSE OK` / `NO REVERSE`
- 🧹 "Show only blocked" filter to show only blocked entries
- 📋 Copy results to the clipboard as TSV
- 💾 Export a `;`-delimited CSV or a timestamped evidence report
- 🌐 Available in English, Português (Brasil) and Español
- 🌗 Light/dark theme, with a custom title bar on every platform

## Installation

Download the build for your platform from the
[latest release](https://github.com/mateusfg7/check-dns-block/releases/latest).

### Windows

Run the `..._x64-setup.exe` installer (or `..._x64_en-US.msi`) and follow the prompts.

### macOS

Open the `..._universal.dmg` (works on both Apple Silicon and Intel) and drag
**Check DNS Block** into Applications. The app isn't signed/notarized, so macOS will refuse to
open it the first time ("cannot be opened because it is from an unidentified developer") —
right-click (or Control-click) the app and choose **Open** once to get past that.

### Linux

- **Flatpak (any distro)**: `flatpak install flathub com.mateusf.CheckDNSBlock`, or install the
  `.flatpak` file from the release with `flatpak install ./check-dns-block_<version>_x86_64.flatpak`
- **Debian / Ubuntu**: `sudo apt install ./Check.DNS.Block_<version>_amd64.deb`
- **Fedora / openSUSE / RHEL**: `sudo dnf install ./Check.DNS.Block-<version>-1.x86_64.rpm`
- **Any distro**: download the `.AppImage`, then
  `chmod +x Check.DNS.Block_<version>_amd64.AppImage && ./Check.DNS.Block_<version>_amd64.AppImage`

## Building from source

```bash
pnpm install
pnpm tauri dev      # launches the desktop app with hot reload
```

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for build requirements, the full
development command reference and the project layout.

## Contributing

Contributions are welcome! See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) to get set up,
and [docs/RELEASING.md](./docs/RELEASING.md) for how versioning and releases work.

## License

[MIT](./LICENSE) © Mateus Felipe Gonçalves

Made by [Mateus Felipe Gonçalves](https://mateusf.com)
