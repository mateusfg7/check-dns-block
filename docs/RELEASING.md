# Releasing

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning:

1. `pnpm changeset` — describe your change, pick a bump (patch/minor/major).
2. Push and merge your PR as usual. CI (`.github/workflows/ci.yml`) checks that a changeset is
   present, unless the PR only touches repo tooling (CI, docs, release scripts, lint/editor
   config), which the changelog doesn't cover.
3. On merge to `main`, `.github/workflows/release.yml` opens/updates a "Version Packages" PR
   that bumps `package.json`, `src-tauri/Cargo.toml` and the changelog.
4. Merging that PR tags the release and builds signed-less installers for Windows, macOS and
   Linux, attached to a draft GitHub Release.

## Flatpak

Every release also gets a `.flatpak` bundle, built from [`flatpak/com.mateusf.CheckDNSBlock.yml`]
(../flatpak/com.mateusf.CheckDNSBlock.yml) by the `flatpak-sources`/`flatpak`/`flatpak-release`
jobs in `release.yml`. Flathub requires building from source with no network access during the
build, so the manifest vendors every cargo/pnpm dependency as a source instead of installing them
normally; `scripts/flatpak-sources.sh` (`pnpm flatpak:sources`) regenerates that list from the
current lockfiles right before each build - it's not committed, since Renovate updates the
lockfiles constantly (see the comment at the top of that script for why).

To build and test it locally:

```bash
pnpm flatpak:sources
flatpak install flathub org.gnome.Sdk//51 \
  org.freedesktop.Sdk.Extension.node24//26.08 org.freedesktop.Sdk.Extension.rust-stable//26.08 \
  org.flatpak.Builder
flatpak run org.flatpak.Builder --force-clean --user --install --install-deps-from=flathub \
  --repo=repo flatpak/build-dir flatpak/com.mateusf.CheckDNSBlock.yml
flatpak run com.mateusf.CheckDNSBlock
```

The app itself is listed on Flathub as `com.mateusf.CheckDNSBlock` - a separate, one-time
submission to [flathub/flathub](https://github.com/flathub/flathub) using a `git`-source copy of
this manifest, not something CI does. Flathub's own buildbot rebuilds it from source on every
update once a `flathub` job (added after that initial submission is accepted) opens a PR against
[flathub/com.mateusf.CheckDNSBlock](https://github.com/flathub/com.mateusf.CheckDNSBlock) for each
new tag.
