#!/usr/bin/env node
// Keeps `src-tauri/Cargo.toml`'s version in sync with `package.json` after
// `changeset version` bumps it. `tauri.conf.json` already points at
// `../package.json` for its version, so it needs no update here.
//
// Run as part of `pnpm run version` (see package.json), never standalone in CI.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const pkgPath = new URL("../package.json", import.meta.url);
const cargoTomlPath = new URL("../src-tauri/Cargo.toml", import.meta.url);

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
