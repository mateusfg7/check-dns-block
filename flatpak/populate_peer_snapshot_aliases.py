#!/usr/bin/env python3
"""Duplicates pnpm store v11 index entries under their peer-qualified keys.

`populate_pnpm_store.py` (from flatpak-node-generator) indexes every package
by `<integrity>\t<name>@<version>` - a bare id with no peer-dependency
context. That matches pnpm's own `pickStoreIndexKey()` for most packages,
but not for one with peer dependencies pnpm actually has to resolve: pnpm's
`pkgId` for those is the full peer-qualified `snapshots:` key from
pnpm-lock.yaml (e.g. `@cloudflare/kumo@2.14.0(react@19.3.1)...`), not the
bare `name@version`. Without a matching index row under that id, `pnpm
install --offline` reports the package "missing from the store" even though
its content is present under the bare id.

This has no effect on packages without peer deps (there's no snapshot key
to alias), so it's safe to always run.
"""

import re
import sqlite3
import sys

SNAPSHOT_KEY_RE = re.compile(r"^  '?([^'\n]+?\([^\n]*\))'?:\s*$")


def peer_qualified_snapshot_keys(lockfile_path: str) -> list[str]:
    """Returns every `snapshots:` section key that has a peer-dep qualifier."""
    with open(lockfile_path, encoding="utf-8") as f:
        lines = f.read().splitlines()

    try:
        start = next(i for i, line in enumerate(lines) if line == "snapshots:")
    except StopIteration:
        return []

    keys = []
    for line in lines[start + 1 :]:
        if line and not line.startswith(" "):
            break  # next top-level section
        match = SNAPSHOT_KEY_RE.match(line)
        if match:
            keys.append(match.group(1))
    return keys


def bare_id(snapshot_key: str) -> str:
    """`name@version(peer@spec)...` -> `name@version`."""
    return snapshot_key.split("(", 1)[0]


def main(lockfile_path: str, store_dir: str) -> None:
    snapshot_keys = peer_qualified_snapshot_keys(lockfile_path)
    if not snapshot_keys:
        return

    db = sqlite3.connect(f"{store_dir}/v11/index.db")
    rows = db.execute("SELECT key, data FROM package_index").fetchall()
    # pkgId is everything after the first tab; integrity (before the tab)
    # never contains one (see store/index/src/index.ts's storeIndexKey doc).
    by_pkg_id = {key.split("\t", 1)[1]: (key, data) for key, data in rows if "\t" in key}

    added = 0
    for snapshot_key in snapshot_keys:
        match = by_pkg_id.get(bare_id(snapshot_key))
        if match is None:
            continue  # not a registry package this store covers (e.g. a workspace link)
        base_key, data = match
        integrity = base_key.split("\t", 1)[0]
        alias_key = f"{integrity}\t{snapshot_key}"
        db.execute(
            "INSERT OR REPLACE INTO package_index (key, data) VALUES (?, ?)",
            (alias_key, data),
        )
        added += 1

    db.commit()
    db.close()
    print(f"Added {added} peer-qualified store index alias(es)", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <pnpm-lock.yaml> <store-dir>", file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])
