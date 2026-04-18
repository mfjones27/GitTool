from __future__ import annotations

import subprocess
from dataclasses import dataclass, field
from pathlib import Path

from git import Repo, InvalidGitRepositoryError, GitCommandError

from app.utils.logger import get_logger

log = get_logger("git.ops")


# ── result dataclasses ──────────────────────────────────────────────

@dataclass
class StatusResult:
    branch: str = ""
    modified: list[str] = field(default_factory=list)
    staged: list[str] = field(default_factory=list)
    untracked: list[str] = field(default_factory=list)
    last_commit: str = ""
    ahead: int = 0
    behind: int = 0


@dataclass
class BranchInfo:
    name: str
    is_current: bool = False


# ── helpers ─────────────────────────────────────────────────────────

def _repo(path: str) -> Repo:
    return Repo(path)


def _run_git(args: list[str], cwd: str) -> str:
    """Subprocess fallback for operations GitPython can't handle cleanly."""
    result = subprocess.run(
        ["git", *args],
        cwd=cwd,
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        raise GitCommandError(args, result.returncode, result.stderr.strip())
    return result.stdout.strip()


# ── init / clone ────────────────────────────────────────────────────

def init_repo(path: str) -> Repo:
    log.info("Initialising repo at %s", path)
    repo = Repo.init(path)
    return repo


def open_repo(path: str) -> Repo:
    return Repo(path)


# ── remote ──────────────────────────────────────────────────────────

def add_remote(path: str, url: str, name: str = "origin") -> None:
    repo = _repo(path)
    if name in [r.name for r in repo.remotes]:
        repo.delete_remote(name)
    repo.create_remote(name, url)
    log.info("Remote '%s' set to %s", name, url)


def get_remote_url(path: str, name: str = "origin") -> str | None:
    repo = _repo(path)
    for r in repo.remotes:
        if r.name == name:
            return r.url
    return None


# ── branch ──────────────────────────────────────────────────────────

def list_branches(path: str) -> list[BranchInfo]:
    repo = _repo(path)
    current = repo.active_branch.name if not repo.head.is_detached else ""
    return [
        BranchInfo(name=b.name, is_current=(b.name == current))
        for b in repo.branches
    ]


def create_branch(path: str, name: str) -> None:
    repo = _repo(path)
    repo.create_head(name)
    log.info("Created branch '%s'", name)


def switch_branch(path: str, name: str) -> None:
    repo = _repo(path)
    repo.heads[name].checkout()
    log.info("Switched to branch '%s'", name)


def rename_branch(path: str, old_name: str, new_name: str) -> None:
    repo = _repo(path)
    repo.heads[old_name].rename(new_name)
    log.info("Renamed branch '%s' -> '%s'", old_name, new_name)


def delete_branch(path: str, name: str) -> None:
    repo = _repo(path)
    repo.delete_head(name, force=True)
    log.info("Deleted branch '%s'", name)


def ensure_branch(path: str, name: str) -> None:
    """Create or rename the current branch to *name*."""
    repo = _repo(path)
    if not repo.heads:
        # No commits yet – the branch name is set on first commit
        return
    current = repo.active_branch.name
    if current != name:
        if name in [h.name for h in repo.heads]:
            repo.heads[name].checkout()
        else:
            repo.active_branch.rename(name)
    log.info("Branch ensured as '%s'", name)


# ── staging ─────────────────────────────────────────────────────────

def stage_files(path: str, files: list[str]) -> None:
    repo = _repo(path)
    repo.index.add(files)


def stage_all(path: str) -> None:
    _run_git(["add", "-A"], cwd=path)


def unstage_files(path: str, files: list[str]) -> None:
    repo = _repo(path)
    try:
        repo.index.reset(paths=files)
    except GitCommandError:
        _run_git(["reset", "HEAD", "--", *files], cwd=path)


# ── commit ──────────────────────────────────────────────────────────

def commit(path: str, message: str) -> str:
    repo = _repo(path)
    c = repo.index.commit(message)
    log.info("Committed %s: %s", c.hexsha[:8], message)
    return c.hexsha


# ── push ────────────────────────────────────────────────────────────

def push(path: str, remote: str = "origin", branch: str | None = None, set_upstream: bool = False) -> str:
    """Push using subprocess so that credential helpers work normally."""
    repo = _repo(path)
    branch = branch or repo.active_branch.name
    args = ["push"]
    if set_upstream:
        args += ["-u"]
    args += [remote, branch]
    output = _run_git(args, cwd=path)
    log.info("Pushed %s to %s/%s", path, remote, branch)
    return output


# ── status / diff ───────────────────────────────────────────────────

def status(path: str) -> StatusResult:
    repo = _repo(path)
    res = StatusResult()

    try:
        res.branch = repo.active_branch.name
    except TypeError:
        res.branch = "(detached)"

    # staged (diff against HEAD, or empty tree if no commits)
    try:
        diff_staged = repo.index.diff("HEAD")
    except Exception:
        diff_staged = repo.index.diff(None)
    res.staged = [d.a_path or d.b_path for d in diff_staged]

    # unstaged working-tree changes
    diff_unstaged = repo.index.diff(None)
    res.modified = [d.a_path or d.b_path for d in diff_unstaged]

    res.untracked = repo.untracked_files

    # last commit
    try:
        res.last_commit = repo.head.commit.message.strip()
    except ValueError:
        res.last_commit = "(no commits yet)"

    # ahead / behind
    try:
        tracking = repo.active_branch.tracking_branch()
        if tracking:
            ahead = list(repo.iter_commits(f"{tracking}..HEAD"))
            behind = list(repo.iter_commits(f"HEAD..{tracking}"))
            res.ahead = len(ahead)
            res.behind = len(behind)
    except Exception:
        pass

    return res


def diff_text(path: str, staged: bool = False) -> str:
    args = ["diff"]
    if staged:
        args.append("--cached")
    try:
        return _run_git(args, cwd=path)
    except Exception:
        return ""
