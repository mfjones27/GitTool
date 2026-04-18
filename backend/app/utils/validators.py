from __future__ import annotations

import re
import shutil
from pathlib import Path


def is_git_installed() -> bool:
    return shutil.which("git") is not None


def is_valid_directory(path: str) -> bool:
    return Path(path).is_dir()


def is_git_repo(path: str) -> bool:
    return (Path(path) / ".git").is_dir()


_GH_URL_RE = re.compile(
    r"^https?://[^\s/]+/[^\s/]+/[^\s/]+(\.git)?/?$"
    r"|^git@[^\s:]+:[^\s/]+/[^\s/]+(\.git)?$"
)


def is_valid_remote_url(url: str) -> bool:
    return bool(_GH_URL_RE.match(url.strip()))
