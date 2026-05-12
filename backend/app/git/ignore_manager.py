"""Smart .gitignore management.

Detects project type, maintains a managed block inside .gitignore with
sensible defaults, and untracks files that shouldn't be in version control
(e.g. dist/, build/, .venv/, node_modules/, .env, *.exe).
"""
from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from app.utils.logger import get_logger

log = get_logger("git.ignore")

BEGIN_MARKER = "# >>> GitTool managed ignores >>>"
END_MARKER = "# <<< GitTool managed ignores <<<"

UNIVERSAL_PATTERNS: list[str] = [
    # OS
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    # Editors / IDEs
    ".vscode/",
    ".idea/",
    "*.swp",
    "*.swo",
    "*~",
    # Secrets / env
    ".env",
    ".env.*",
    "!.env.example",
    "*.pem",
    "*.key",
    "credentials.json",
    "secrets.json",
    # Logs
    "*.log",
    "logs/",
    # Generic build outputs
    "dist/",
    "build/",
    "out/",
    # Desktop binaries / installers
    "*.exe",
    "*.msi",
    "*.dmg",
    "*.app",
]

LANGUAGE_PATTERNS: dict[str, list[str]] = {
    "python": [
        "__pycache__/",
        "*.py[cod]",
        "*$py.class",
        ".Python",
        "*.egg-info/",
        "*.egg",
        ".venv/",
        "venv/",
        "env/",
        "ENV/",
        ".pytest_cache/",
        ".mypy_cache/",
        ".ruff_cache/",
        ".tox/",
        ".coverage",
        "htmlcov/",
        "pip-log.txt",
        "pip-delete-this-directory.txt",
    ],
    "node": [
        "node_modules/",
        ".next/",
        ".nuxt/",
        ".cache/",
        ".parcel-cache/",
        ".turbo/",
        ".vite/",
        "dist-ssr/",
        "*.local",
        "npm-debug.log*",
        "yarn-debug.log*",
        "yarn-error.log*",
        "pnpm-debug.log*",
    ],
    "rust": [
        "target/",
    ],
    "go": [
        "*.test",
        "*.out",
    ],
    "java": [
        "*.class",
        "*.jar",
        "*.war",
        "target/",
        ".gradle/",
    ],
}


@dataclass
class IgnorePlan:
    patterns: list[str] = field(default_factory=list)
    languages: list[str] = field(default_factory=list)
    gitignore_updated: bool = False
    tracked_matches: list[str] = field(default_factory=list)
    untracked: list[str] = field(default_factory=list)


def detect_languages(repo: Path) -> list[str]:
    langs: list[str] = []
    is_python = (
        (repo / "pyproject.toml").exists()
        or (repo / "requirements.txt").exists()
        or (repo / "setup.py").exists()
        or (repo / "Pipfile").exists()
        or any(repo.glob("*.py"))
    )
    if is_python:
        langs.append("python")
    if (repo / "package.json").exists():
        langs.append("node")
    if (repo / "Cargo.toml").exists():
        langs.append("rust")
    if (repo / "go.mod").exists():
        langs.append("go")
    if (
        (repo / "pom.xml").exists()
        or (repo / "build.gradle").exists()
        or (repo / "build.gradle.kts").exists()
    ):
        langs.append("java")
    return langs


def _compose_patterns(repo: Path) -> tuple[list[str], list[str]]:
    seen: set[str] = set()
    out: list[str] = []
    for p in UNIVERSAL_PATTERNS:
        if p not in seen:
            seen.add(p)
            out.append(p)
    langs = detect_languages(repo)
    for lang in langs:
        for p in LANGUAGE_PATTERNS.get(lang, []):
            if p not in seen:
                seen.add(p)
                out.append(p)
    return out, langs


def _render_block(patterns: list[str]) -> str:
    body = "\n".join(patterns)
    return (
        f"{BEGIN_MARKER}\n"
        f"# Auto-managed by GitTool. Edits inside this block may be overwritten.\n"
        f"# Add your own patterns outside this block.\n"
        f"{body}\n"
        f"{END_MARKER}\n"
    )


def _update_gitignore(repo: Path, patterns: list[str]) -> bool:
    gitignore = repo / ".gitignore"
    existing = gitignore.read_text(encoding="utf-8") if gitignore.exists() else ""
    new_block = _render_block(patterns)

    if BEGIN_MARKER in existing and END_MARKER in existing:
        start = existing.index(BEGIN_MARKER)
        end = existing.index(END_MARKER) + len(END_MARKER)
        after = existing[end:]
        if after.startswith("\n"):
            after = after[1:]
        updated = existing[:start] + new_block + after
    else:
        sep = "" if not existing or existing.endswith("\n") else "\n"
        updated = (existing + sep + "\n" + new_block) if existing else new_block

    if updated == existing:
        return False
    gitignore.write_text(updated, encoding="utf-8")
    return True


def _split_nul(data: bytes) -> list[bytes]:
    """Split NUL-separated git output, dropping empty trailing entry."""
    return [chunk for chunk in data.split(b"\x00") if chunk]


def _decode_path(raw: bytes) -> str:
    """Decode a raw git pathname, preserving any control bytes (e.g. CR)."""
    return raw.decode("utf-8", errors="surrogateescape")


def _tracked_matches(repo: Path) -> list[str]:
    """Return tracked files that the current .gitignore would ignore.

    Uses ``-z`` (NUL-separated, raw bytes) for both reads and writes so that
    pathnames containing control characters (e.g. a stray CR in a Windows
    ``__pycache__`` entry) survive without C-style quoting.
    """
    ls = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=str(repo),
        capture_output=True,
        timeout=30,
    )
    if ls.returncode != 0 or not ls.stdout:
        return []

    tracked = _split_nul(ls.stdout)
    if not tracked:
        return []

    proc = subprocess.run(
        ["git", "check-ignore", "--no-index", "-z", "--stdin"],
        cwd=str(repo),
        input=b"\x00".join(tracked),
        capture_output=True,
        timeout=30,
    )
    # 0 = some ignored, 1 = none ignored, >1 = error
    if proc.returncode not in (0, 1):
        return []
    return [_decode_path(p) for p in _split_nul(proc.stdout)]


def preview(path: str) -> IgnorePlan:
    """Compute patterns and which tracked files would be untracked.

    Writes the managed block to .gitignore (harmless, idempotent) so that
    `git check-ignore` reflects the plan. Does NOT run `git rm --cached`.
    """
    repo = Path(path)
    patterns, langs = _compose_patterns(repo)
    updated = _update_gitignore(repo, patterns)
    matches = _tracked_matches(repo)
    return IgnorePlan(
        patterns=patterns,
        languages=langs,
        gitignore_updated=updated,
        tracked_matches=matches,
    )


def apply(path: str) -> IgnorePlan:
    """Update .gitignore and untrack any already-tracked files that match."""
    repo = Path(path)
    patterns, langs = _compose_patterns(repo)
    updated = _update_gitignore(repo, patterns)
    matches = _tracked_matches(repo)

    untracked: list[str] = []
    if matches:
        proc = subprocess.run(
            ["git", "rm", "-r", "--cached", "--quiet", "--", *matches],
            cwd=str(repo),
            capture_output=True,
            text=True,
            timeout=60,
        )
        if proc.returncode == 0:
            untracked = matches
            log.info("Untracked %d files via smart ignore", len(matches))
        else:
            err = (proc.stderr or proc.stdout or "").strip() or "unknown error"
            log.warning("git rm --cached failed: %s", err)
            raise RuntimeError(f"git rm --cached failed: {err}")

    return IgnorePlan(
        patterns=patterns,
        languages=langs,
        gitignore_updated=updated,
        tracked_matches=matches,
        untracked=untracked,
    )
