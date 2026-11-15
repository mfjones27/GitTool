"""Security regression tests for the local GitTool API."""
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

import main  # noqa: E402


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("gt")
    dist = tmp / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("INDEX")
    (dist / "assets" / "app.js").write_text("JS")
    (tmp / "secret.txt").write_text("TOP-SECRET")
    main._resolve_frontend = lambda: str(dist)  # point the launcher at the fake build
    app = main._patch_fastapi_static()
    c = TestClient(app, base_url="http://127.0.0.1:9876")
    c.secret_path = tmp / "secret.txt"
    return c


def test_serves_frontend_files(client):
    assert client.get("/assets/app.js").text == "JS"
    assert client.get("/some/route").text == "INDEX"


@pytest.mark.parametrize("url", ["/%2e%2e/secret.txt", "/..%2fsecret.txt", "/%2e%2e%2fsecret.txt"])
def test_parent_traversal_blocked(client, url):
    assert "TOP-SECRET" not in client.get(url).text


def test_absolute_path_blocked(client):
    r = client.get("/%2F" + str(client.secret_path).lstrip("/"))
    assert "TOP-SECRET" not in r.text


def test_other_websites_get_no_cors_access(client):
    r = client.get("/health", headers={"Origin": "https://evil.example"})
    assert r.headers.get("access-control-allow-origin") is None
    pre = client.options(
        "/repo/push-everything",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert pre.headers.get("access-control-allow-origin") is None


def test_ui_origins_allowed(client):
    for origin in ("http://127.0.0.1:9876", "http://localhost:5173"):
        r = client.get("/health", headers={"Origin": origin})
        assert r.headers.get("access-control-allow-origin") == origin


def test_non_local_host_header_rejected(client):
    r = client.get("/health", headers={"Host": "attacker.example"})
    assert r.status_code == 400
