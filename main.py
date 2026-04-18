"""GitTool — desktop app entry point.

Serves the React frontend + FastAPI backend in one process,
then opens a native window via pywebview.
"""
from __future__ import annotations

import sys
import time
import ctypes
import threading
from pathlib import Path

import uvicorn
import webview

HOST = "127.0.0.1"
PORT = 9876

def _resolve_frontend() -> str:
    """Return the path to the built React dist folder."""
    if getattr(sys, "frozen", False):
        base = Path(sys._MEIPASS)
    else:
        base = Path(__file__).parent
    return str(base / "frontend" / "dist")


def _patch_fastapi_static():
    """Mount the React build as static files on the FastAPI app."""
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    if getattr(sys, "frozen", False):
        sys.path.insert(0, str(Path(sys._MEIPASS) / "backend"))

    from server import app

    dist = _resolve_frontend()

    @app.get("/{full_path:path}")
    async def _spa_fallback(full_path: str):
        """Serve React static files; fall back to index.html for SPA routing."""
        file = Path(dist) / full_path
        if file.is_file():
            return FileResponse(str(file))
        return FileResponse(str(Path(dist) / "index.html"))

    app.mount("/assets", StaticFiles(directory=str(Path(dist) / "assets")), name="static")
    return app


def _run_server(app):
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")


def main():
    app = _patch_fastapi_static()

    server_thread = threading.Thread(target=_run_server, args=(app,), daemon=True)
    server_thread.start()
    time.sleep(0.8)

    if getattr(sys, "frozen", False):
        icon_path = str(Path(sys._MEIPASS) / "assets" / "icon.ico")
    else:
        icon_path = str(Path(__file__).parent / "assets" / "icon.ico")

    window = webview.create_window(
        "GitTool",
        f"http://{HOST}:{PORT}",
        width=1100,
        height=700,
        min_size=(800, 550),
    )

    def _set_icon():
        """Apply .ico to the window and taskbar via Win32 API."""
        time.sleep(0.5)
        try:
            user32 = ctypes.windll.user32
            LR_LOADFROMFILE = 0x00000010
            LR_DEFAULTSIZE = 0x00000040
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
            pass

    threading.Thread(target=_set_icon, daemon=True).start()
    webview.start()


if __name__ == "__main__":
    main()
