from __future__ import annotations

from contextlib import asynccontextmanager
from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.git import operations as git_ops
from app.git import ignore_manager
from app.ai.commit_generator import generate_commit_message
from app.config.settings import AppSettings
from app.utils import validators
from app.utils.logger import get_logger

log = get_logger("server")

# ── app state ───────────────────────────────────────────────────────

_current_repo: str = ""


def _require_repo() -> str:
    if not _current_repo:
        raise HTTPException(400, "No repository is open. Open one first via POST /repo/open.")
    return _current_repo


# ── lifespan ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("GitTool backend starting")
    yield
    log.info("GitTool backend shutting down")


# ── FastAPI instance ────────────────────────────────────────────────

app = FastAPI(title="GitTool API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── request / response models ──────────────────────────────────────

class OpenRepoRequest(BaseModel):
    path: str
    init_if_needed: bool = False

class RemoteRequest(BaseModel):
    url: str
    name: str = "origin"

class BranchRequest(BaseModel):
    name: str

class RenameBranchRequest(BaseModel):
    old_name: str
    new_name: str

class StageRequest(BaseModel):
    files: list[str]

class CommitRequest(BaseModel):
    message: str

class PushRequest(BaseModel):
    remote: str = "origin"
    branch: str | None = None
    set_upstream: bool = False

class SettingsUpdate(BaseModel):
    openai_api_key: str | None = None
    ai_enabled: bool | None = None
    default_branch: str | None = None


# ── health ──────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "git_installed": validators.is_git_installed()}


# ── repo open / init ────────────────────────────────────────────────

@app.post("/repo/open")
def repo_open(req: OpenRepoRequest):
    global _current_repo
    if not validators.is_valid_directory(req.path):
        raise HTTPException(400, f"Not a valid directory: {req.path}")

    is_repo = validators.is_git_repo(req.path)
    if not is_repo and req.init_if_needed:
        git_ops.init_repo(req.path)
        is_repo = True
    elif not is_repo:
        raise HTTPException(400, "Directory is not a git repo. Set init_if_needed=true to initialize.")

    _current_repo = req.path
    settings = AppSettings.load()
    settings.add_recent_repo(req.path)
    return {"path": req.path, "initialized": not validators.is_git_repo(req.path) if req.init_if_needed else False}


# ── status ──────────────────────────────────────────────────────────

@app.get("/repo/status")
def repo_status():
    path = _require_repo()
    try:
        st = git_ops.status(path)
        return asdict(st)
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── remote ──────────────────────────────────────────────────────────

@app.post("/repo/remote")
def set_remote(req: RemoteRequest):
    path = _require_repo()
    if not validators.is_valid_remote_url(req.url):
        raise HTTPException(400, "Invalid remote URL")
    try:
        git_ops.add_remote(path, req.url, req.name)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.get("/repo/remote")
def get_remote():
    path = _require_repo()
    url = git_ops.get_remote_url(path)
    return {"url": url}


# ── branches ────────────────────────────────────────────────────────

@app.get("/branches")
def list_branches():
    path = _require_repo()
    try:
        branches = git_ops.list_branches(path)
        return [asdict(b) for b in branches]
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/branches/create")
def create_branch(req: BranchRequest):
    path = _require_repo()
    try:
        git_ops.create_branch(path, req.name)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/branches/switch")
def switch_branch(req: BranchRequest):
    path = _require_repo()
    try:
        git_ops.switch_branch(path, req.name)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/branches/rename")
def rename_branch(req: RenameBranchRequest):
    path = _require_repo()
    try:
        git_ops.rename_branch(path, req.old_name, req.new_name)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/branches/delete")
def delete_branch(req: BranchRequest):
    path = _require_repo()
    try:
        git_ops.delete_branch(path, req.name)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/branches/ensure")
def ensure_branch(req: BranchRequest):
    path = _require_repo()
    try:
        git_ops.ensure_branch(path, req.name)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── staging ─────────────────────────────────────────────────────────

@app.post("/repo/stage")
def stage_files(req: StageRequest):
    path = _require_repo()
    try:
        git_ops.stage_files(path, req.files)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/repo/stage-all")
def stage_all():
    path = _require_repo()
    try:
        git_ops.stage_all(path)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/repo/unstage")
def unstage_files(req: StageRequest):
    path = _require_repo()
    try:
        git_ops.unstage_files(path, req.files)
        return {"ok": True}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── commit ──────────────────────────────────────────────────────────

@app.post("/repo/commit")
def do_commit(req: CommitRequest):
    path = _require_repo()
    try:
        sha = git_ops.commit(path, req.message)
        return {"sha": sha}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── push ────────────────────────────────────────────────────────────

@app.post("/repo/push")
def do_push(req: PushRequest):
    path = _require_repo()
    try:
        output = git_ops.push(path, req.remote, req.branch, req.set_upstream)
        return {"output": output}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── diff ────────────────────────────────────────────────────────────

@app.get("/repo/diff")
def get_diff(staged: bool = False):
    path = _require_repo()
    return {"diff": git_ops.diff_text(path, staged=staged)}


# ── AI commit message ──────────────────────────────────────────────

@app.post("/ai/commit-message")
def ai_commit_message():
    path = _require_repo()
    settings = AppSettings.load()
    if not settings.ai_enabled:
        raise HTTPException(400, "AI features are disabled in settings.")
    try:
        diff = git_ops.diff_text(path, staged=True)
        if not diff:
            diff = git_ops.diff_text(path, staged=False)
        msg = generate_commit_message(diff, settings)
        return {"message": msg}
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── settings ────────────────────────────────────────────────────────

@app.get("/settings")
def get_settings():
    s = AppSettings.load()
    return {
        "openai_api_key": "••••" + s.openai_api_key[-4:] if len(s.openai_api_key) > 4 else "",
        "openai_api_key_set": bool(s.openai_api_key),
        "ai_enabled": s.ai_enabled,
        "default_branch": s.default_branch,
        "recent_repos": s.recent_repos,
    }


@app.put("/settings")
def update_settings(req: SettingsUpdate):
    s = AppSettings.load()
    if req.openai_api_key is not None:
        s.openai_api_key = req.openai_api_key
    if req.ai_enabled is not None:
        s.ai_enabled = req.ai_enabled
    if req.default_branch is not None:
        s.default_branch = req.default_branch
    s.save()
    return {"ok": True}


# ── smart ignore ────────────────────────────────────────────────────

@app.get("/repo/ignore/preview")
def ignore_preview():
    path = _require_repo()
    try:
        plan = ignore_manager.preview(path)
        return asdict(plan)
    except Exception as exc:
        raise HTTPException(500, str(exc))


@app.post("/repo/ignore/apply")
def ignore_apply():
    path = _require_repo()
    try:
        plan = ignore_manager.apply(path)
        return asdict(plan)
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── push everything (convenience) ──────────────────────────────────

@app.post("/repo/push-everything")
def push_everything():
    path = _require_repo()
    try:
        ignore_plan = ignore_manager.apply(path)
        git_ops.stage_all(path)
        settings = AppSettings.load()
        diff = git_ops.diff_text(path, staged=True)
        if diff and settings.ai_enabled and settings.openai_api_key:
            msg = generate_commit_message(diff, settings)
        else:
            msg = "Update files"
        sha = git_ops.commit(path, msg)
        output = git_ops.push(path, set_upstream=True)
        return {
            "sha": sha,
            "push_output": output,
            "message": msg,
            "ignore": asdict(ignore_plan),
        }
    except Exception as exc:
        raise HTTPException(500, str(exc))


# ── entry point ─────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=9876, reload=False)
