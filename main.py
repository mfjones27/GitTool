"""GitTool — desktop app entry point.

Serves the React frontend + FastAPI backend in one process,
then opens a native window via pywebview.
"""
from __future__ import annotations

import ctypes
import io
import os
import subprocess
import sys
import threading
import time
import traceback
from pathlib import Path

HOST = "127.0.0.1"
PORT = 9876


def _app_dir() -> Path:
    """Directory next to the running exe (or project root in dev)."""
    if getattr(sys, "frozen", False):
        return Path(sys.executable).parent
    return Path(__file__).parent


def _setup_logging() -> Path:
    """Redirect stdout/stderr to a log file.

    Required when built with console=False: otherwise sys.stdout/stderr
    are None and any print/log from uvicorn/pywebview crashes the process.
    """
    log_path = _app_dir() / "gittool.log"
    try:
        log_file = open(log_path, "w", encoding="utf-8", buffering=1)
    except OSError:
        log_file = io.StringIO()
    sys.stdout = log_file
    sys.stderr = log_file
    return log_path


def _hide_subprocess_windows() -> None:
    """Force every subprocess (ours + GitPython's) to hide its console window.

    Without this, each `git` invocation flashes a cmd.exe window because the
    app is built with console=False and children inherit no console.
    """
    if sys.platform != "win32":
        return
    CREATE_NO_WINDOW = 0x08000000
    _original = subprocess.Popen.__init__

    def _patched(self, *args, **kwargs):  # type: ignore[no-redef]
        kwargs["creationflags"] = kwargs.get("creationflags", 0) | CREATE_NO_WINDOW
        _original(self, *args, **kwargs)

    subprocess.Popen.__init__ = _patched  # type: ignore[method-assign]


def _resolve_frontend() -> str:
    if getattr(sys, "frozen", False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).parent
    return str(base / "frontend" / "dist")


def _patch_fastapi_static():
    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    if getattr(sys, "frozen", False):
        sys.path.insert(0, str(Path(sys._MEIPASS) / "backend"))

    from server import app

    dist = _resolve_frontend()

    @app.get("/{full_path:path}")
    async def _spa_fallback(full_path: str):
        file = Path(dist) / full_path
        if file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(Path(dist) / "index.html"))

    app.mount(
        "/assets",
        StaticFiles(directory=str(Path(dist) / "assets")),
        name="static",
    )
    return app


def _run_server(app) -> None:
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


def _set_window_icon(icon_path: str) -> None:
    time.sleep(0.5)
    try:
        user32 = ctypes.windll.user32
        LR_LOADFROMFILE = 0x00000010
        IMAGE_ICON = 1
        WM_SETICON = 0x0080
        ICON_SMALL = 0
        ICON_BIG = 1

        ico_big = user32.LoadImageW(0, icon_path, IMAGE_ICON, 48, 48, LR_LOADFROMFILE)
        ico_small = user32.LoadImageW(0, icon_path, IMAGE_ICON, 16, 16, LR_LOADFROMFILE)

        hwnd = user32.FindWindowW(None, "GitTool")
        if hwnd:
            user32.SendMessageW(hwnd, WM_SETICON, ICON_BIG, ico_big)
            user32.SendMessageW(hwnd, WM_SETICON, ICON_SMALL, ico_small)
    except Exception:
        traceback.print_exc()


def main() -> None:
    # Pinned taskbar shortcuts launch from C:\Windows\System32 — normalize cwd.
    os.chdir(_app_dir())

    import webview

    app = _patch_fastapi_static()

    server_thread = threading.Thread(target=_run_server, args=(app,), daemon=True)
    server_thread.start()
    time.sleep(0.8)

    if getattr(sys, "frozen", False):
        icon_path = str(Path(sys._MEIPASS) / "assets" / "icon.ico")
    else:
        icon_path = str(Path(__file__).parent / "assets" / "icon.ico")

    webview.create_window(
        "GitTool",
        f"http://{HOST}:{PORT}",
        width=1100,
        height=700,
        min_size=(800, 550),
    )

    threading.Thread(target=_set_window_icon, args=(icon_path,), daemon=True).start()
    webview.start()


if __name__ == "__main__":
    _hide_subprocess_windows()
    log_path = _setup_logging()
    try:
        main()
    except Exception:
        traceback.print_exc()
        try:
            ctypes.windll.user32.MessageBoxW(
                0,
                f"GitTool failed to start.\n\nSee log:\n{log_path}",
                "GitTool",
                0x10,
            )
        except Exception:
            pass
        raise
