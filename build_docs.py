#!/usr/bin/env python3
"""Discover and build Sphinx docsets in this monorepo.

A "docset" is any folder in the repo that contains a ``conf.py`` (searched
recursively, so docsets may be nested e.g. ``reference-architecture/MI3XX``).
This script finds them automatically, so adding a new docset folder requires
no changes to tasks.json or to this script.

Usage:
    python build_docs.py --list
        Print every discovered docset (name + path), one per line.

    python build_docs.py --all [--clean]
        Build every discovered docset.

    python build_docs.py --docset <name> [--clean]
        Build a single docset by folder name (e.g. "docs").

    python build_docs.py --file <path> [--clean]
        Build whichever docset the given file lives in. Used by the VS Code
        "Build Docs" task with ${file} so Ctrl+B builds the docset you're
        currently editing.

Each docset builds into its own namespaced output + doctree cache under
    <repo>/.vscode/build/<docset>/{html,doctrees}
so docsets never clobber each other or share a (project-specific) doctree
cache.

Exit codes:
    0  success
    1  usage / discovery error (e.g. file not under any docset)
    N  the underlying sphinx-build exit code on build failure
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path


# Repo root = the directory containing this script.
REPO_ROOT = Path(__file__).resolve().parent
BUILD_ROOT = REPO_ROOT / ".vscode" / "build"

# Folders that can never be docsets even if they somehow contain a conf.py.
IGNORE_DIRS = {".git", ".vscode", ".venv", "venv", "node_modules", "__pycache__"}


def _docset_name(src: Path, taken: set[str]) -> str:
    """Pick a unique docset name for a source dir.

    Prefer the folder's own basename (e.g. "docs", "MI3XX"). If that collides
    with an already-claimed name, fall back to the repo-relative path with the
    OS separator replaced by "-" (e.g. "reference-architecture-MI3XX") so every
    docset stays addressable on the CLI and gets its own build output dir.
    """
    name = src.name
    if name not in taken:
        return name
    return "-".join(src.relative_to(REPO_ROOT).parts)


def discover_docsets() -> dict[str, Path]:
    """Return {docset_name: source_dir} for every folder holding a conf.py.

    Walks the repo recursively (not just top-level children) so docsets may be
    nested, e.g. ``reference-architecture/MI3XX/conf.py``. Ignored folders are
    pruned, and once a folder is identified as a docset we do not descend into
    it (a docset never contains another docset). Sorted for stable ordering.
    """
    docsets: dict[str, Path] = {}
    for dirpath, dirnames, filenames in os.walk(REPO_ROOT):
        # Prune ignored dirs in place so os.walk never descends into them.
        dirnames[:] = sorted(d for d in dirnames if d not in IGNORE_DIRS)
        if "conf.py" in filenames:
            src = Path(dirpath)
            docsets[_docset_name(src, set(docsets))] = src
            # Don't look for docsets nested inside this one.
            dirnames[:] = []
    return dict(sorted(docsets.items()))


def docset_for_file(file_path: Path, docsets: dict[str, Path]) -> str | None:
    """Return the docset name that ``file_path`` belongs to, or None."""
    try:
        resolved = file_path.resolve()
    except OSError:
        return None
    for name, src in docsets.items():
        try:
            resolved.relative_to(src.resolve())
            return name
        except ValueError:
            continue
    return None


def build_one(name: str, src: Path, clean: bool) -> int:
    """Build a single docset with Sphinx. Returns the sphinx-build exit code."""
    out_html = BUILD_ROOT / name / "html"
    out_doctrees = BUILD_ROOT / name / "doctrees"

    if clean:
        target = BUILD_ROOT / name
        if target.exists():
            print(f"[clean] removing {target}")
            shutil.rmtree(target, ignore_errors=True)

    out_html.mkdir(parents=True, exist_ok=True)
    out_doctrees.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, "-m", "sphinx",
        "-j", "auto",
        "-T",
        "-b", "html",
        "-d", str(out_doctrees),
        "-D", "language=en",
        str(src),
        str(out_html),
    ]
    print(f"[build] {name}: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(REPO_ROOT))
    if result.returncode == 0:
        print(f"[build] {name}: OK -> {out_html}")
    else:
        print(f"[build] {name}: FAILED (exit {result.returncode})", file=sys.stderr)
    return result.returncode


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list", action="store_true", help="List discovered docsets and exit.")
    group.add_argument("--list-names", action="store_true",
                       help="Print 'all' then each docset name, one per line (for pickers).")
    group.add_argument("--all", action="store_true", help="Build every docset.")
    group.add_argument("--docset", metavar="NAME", help="Build a single docset by folder name.")
    group.add_argument("--file", metavar="PATH", help="Build the docset containing this file.")
    parser.add_argument("--clean", action="store_true", help="Remove the docset's build output first.")
    args = parser.parse_args(argv)

    docsets = discover_docsets()

    if args.list_names:
        print("all")
        for name in docsets:
            print(name)
        return 0

    if args.list:
        if not docsets:
            print("(no docsets found — no top-level folder contains a conf.py)")
            return 0
        for name, src in docsets.items():
            print(f"{name}\t{src}")
        return 0

    if not docsets:
        print("Error: no docsets found (no top-level folder contains a conf.py).", file=sys.stderr)
        return 1

    if args.all:
        rc = 0
        for name, src in docsets.items():
            rc = build_one(name, src, args.clean) or rc
        return rc

    if args.docset:
        if args.docset == "all":
            rc = 0
            for name, src in docsets.items():
                rc = build_one(name, src, args.clean) or rc
            return rc
        if args.docset not in docsets:
            print(f"Error: '{args.docset}' is not a docset. Known: {', '.join(docsets) or '(none)'}",
                  file=sys.stderr)
            return 1
        return build_one(args.docset, docsets[args.docset], args.clean)

    if args.file:
        name = docset_for_file(Path(args.file), docsets)
        if name is None:
            print(f"Error: '{args.file}' is not inside any docset.\n"
                  f"Open a file under one of: {', '.join(docsets)}", file=sys.stderr)
            return 1
        return build_one(name, docsets[name], args.clean)

    return 0  # unreachable (group is required)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))