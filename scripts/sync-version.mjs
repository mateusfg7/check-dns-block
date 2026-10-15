#!/usr/bin/env node
// Keeps `src-tauri/Cargo.toml`'s version and the Flatpak metainfo's release
// list in sync with `package.json` after `changeset version` bumps it.
// `tauri.conf.json` already points at `../package.json` for its version, so
// it needs no update here.
//
// Run as part of `pnpm run version` (see package.json), never standalone in CI.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const pkgPath = new URL("../package.json", import.meta.url);
const cargoTomlPath = new URL("../src-tauri/Cargo.toml", import.meta.url);
const metainfoPath = new URL("../flatpak/com.mateusf.CheckDNSBlock.metainfo.xml", import.meta.url);

const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
if (!version) {
  throw new Error("Could not read version from package.json");
}

const cargoToml = readFileSync(cargoTomlPath, "utf8");
const versionLine = /^version = "[^"]*"/m;
if (!versionLine.test(cargoToml)) {
  throw new Error('Could not find a `version = "..."` line in src-tauri/Cargo.toml');
}

writeFileSync(cargoTomlPath, cargoToml.replace(versionLine, `version = "${version}"`));
console.log(`Synced src-tauri/Cargo.toml version to ${version}`);

// Refresh Cargo.lock's entry for this package without touching dependencies.
execFileSync("cargo", ["update", "--workspace", "--offline"], {
  cwd: `${rootDir}/src-tauri`,
  stdio: "inherit",
});

// Prepend a <release> entry to the Flatpak metainfo, which is what Flathub
// shows as the app's release history. Skipped if this version is already
// the latest entry, so reruns (e.g. a second `pnpm run version`) stay a no-op.
const metainfo = readFileSync(metainfoPath, "utf8");
const releasesOpenTag = /<releases>\n/;
const latestVersion = metainfo.match(/<releases>\s*<release version="([^"]*)"/)?.[1];
if (latestVersion !== version) {
  const today = new Date().toISOString().slice(0, 10);
  const release =
    `    <release version="${version}" date="${today}">\n` +
    `      <url>https://github.com/mateusfg7/check-dns-block/releases/tag/v${version}</url>\n` +
    `    </release>\n`;
  if (!releasesOpenTag.test(metainfo)) {
    throw new Error("Could not find a <releases>\\n tag in the Flatpak metainfo");
  }
  writeFileSync(metainfoPath, metainfo.replace(releasesOpenTag, `<releases>\n${release}`));
  console.log(`Added a Flatpak metainfo release entry for ${version}`);
}
