# Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning:

1. `pnpm changeset` — describe your change, pick a bump (patch/minor/major).
2. Push and merge your PR as usual. CI (`.github/workflows/ci.yml`) checks that a changeset is
   present.
3. On merge to `main`, `.github/workflows/release.yml` opens/updates a "Version Packages" PR
   that bumps `package.json`, `src-tauri/Cargo.toml` and the changelog.
4. Merging that PR tags the release and builds signed-less installers for Windows, macOS and
   Linux, attached to a draft GitHub Release.
