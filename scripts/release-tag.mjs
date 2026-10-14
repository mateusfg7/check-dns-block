#!/usr/bin/env node
// Runs `changeset tag` and then prints a `New tag: ...` line, which is the
// only signal changesets/action@v1 looks for in a custom `publish` script's
// stdout to decide a package was "published" (see its root-package code path
// in src/run.ts). Without this line, `published` never becomes `true` and the
// `bundle` job in release.yml - which needs it - never runs, so no GitHub
// Release gets created even though the version/changelog bump landed.
//
// Run as part of the `publish` step in .github/workflows/release.yml, never
// standalone in CI.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

execFileSync("pnpm", ["changeset", "tag"], { stdio: "inherit" });

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
if (!version) {
  throw new Error("Could not read version from package.json");
}

console.log(`New tag: v${version}`);
