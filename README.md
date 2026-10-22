<div align="center">

# Check DNS Block

[![CI](https://github.com/mateusfg7/check-dns-block/actions/workflows/ci.yml/badge.svg)](https://github.com/mateusfg7/check-dns-block/actions/workflows/ci.yml)
[![Release](https://github.com/mateusfg7/check-dns-block/actions/workflows/release.yml/badge.svg)](https://github.com/mateusfg7/check-dns-block/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**A cross-platform desktop app for checking whether domains or IPs are blocked on a given DNS
server.**

Built with [Tauri 2](https://tauri.app), Rust, React and [Kumo](https://github.com/cloudflare/kumo).

![Check DNS Block screenshot](./docs/screenshot.png)

</div>

## What it does

Paste a list of domains and/or IPs, point Check DNS Block at a **target DNS server** (e.g. your
ISP's resolver, or a corporate/government one you want to audit) and, optionally, a **reference
DNS server** you trust (8.8.8.8 by default). The app resolves every entry against both and
compares the answers: an entry gets flagged as blocked if the target's response differs
meaningfully from the reference's, or doesn't come back at all.

This is the kind of check you'd run to confirm ISP- or network-level DNS filtering/censorship, to
audit a firewall's DNS rules, or just to troubleshoot "why can't I reach this site from this
network" without digging through `dig`/`nslookup` output by hand.

> [!TIP]
> You don't need any network/firewall access beyond normal DNS queries: the app just sends
> ordinary DNS requests to the two servers you configure and diffs the results.

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

Every [release](https://github.com/mateusfg7/check-dns-block/releases/latest) publishes installers
for Windows, macOS and Linux. Pick your platform below; each command assumes you've already
downloaded the matching file from that release page.

### Windows

Run the installer and follow the prompts:

```powershell
.\Check.DNS.Block_<version>_x64-setup.exe
```

An MSI (`Check.DNS.Block_<version>_x64_en-US.msi`) is also published, if your organization
prefers installing via Group Policy or another MSI-based workflow.

### macOS

```bash
# Open the universal .dmg (Apple Silicon + Intel) and drag the app into Applications
open Check.DNS.Block_<version>_universal.dmg
```

> [!IMPORTANT]
> The app isn't signed/notarized, so macOS will refuse to open it the first time with *"cannot be
> opened because it is from an unidentified developer."* Right-click (or Control-click) the app in
> Applications and choose **Open** once. macOS will remember your choice after that.

### Linux

| Distro family            | Command |
| ------------------------- | ------- |
| Debian / Ubuntu            | `sudo apt install ./Check.DNS.Block_<version>_amd64.deb` |
| Fedora / openSUSE / RHEL   | `sudo dnf install ./Check.DNS.Block-<version>-1.x86_64.rpm` |
| Any distro (Flatpak)       | `flatpak install ./check-dns-block_<version>_x86_64.flatpak` |
| Any distro (AppImage)      | see below |

For the AppImage, mark it executable before running it:

```bash
chmod +x Check.DNS.Block_<version>_amd64.AppImage
./Check.DNS.Block_<version>_amd64.AppImage
```

> [!NOTE]
> A Flathub listing (`flatpak install flathub com.mateusf.CheckDNSBlock`) is in the works. For
> now, install the `.flatpak` file from the release page as shown above.

## Building from source

```bash
git clone https://github.com/mateusfg7/check-dns-block.git
cd check-dns-block
pnpm install
pnpm tauri dev      # launches the desktop app with hot reload
```

See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) for build requirements (Node, Rust, platform
packages), the full development command reference and the project layout.

## Contributing

Contributions are welcome! See [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) to get set up,
and [docs/RELEASING.md](./docs/RELEASING.md) for how versioning, releases and the Flatpak build
work.

## License

[MIT](./LICENSE) © Mateus Felipe Gonçalves

Made by [Mateus Felipe Gonçalves](https://mateusf.com)

Inspired by a Windows `.bat` project by [João Gabriel](https://github.com/sloplott/)
