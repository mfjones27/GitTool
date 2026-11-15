"""Smoke test: open/init a repo, stage, commit and read status through the API."""
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from server import app  # noqa: E402


def test_init_stage_commit_status(tmp_path, monkeypatch):
    monkeypatch.setenv("GIT_AUTHOR_NAME", "Test")
    monkeypatch.setenv("GIT_AUTHOR_EMAIL", "test@example.com")
    monkeypatch.setenv("GIT_COMMITTER_NAME", "Test")
    monkeypatch.setenv("GIT_COMMITTER_EMAIL", "test@example.com")
    (tmp_path / "hello.txt").write_text("hi\n")
    c = TestClient(app, base_url="http://127.0.0.1:9876")

    r = c.post("/repo/open", json={"path": str(tmp_path), "init_if_needed": True})
    assert r.status_code == 200, r.text
    assert c.post("/repo/stage-all").status_code == 200
    r = c.post("/repo/commit", json={"message": "first commit"})
    assert r.status_code == 200, r.text
    assert r.json()["sha"]

    status = c.get("/repo/status")
    assert status.status_code == 200, status.text
    assert c.get("/branches").status_code == 200
