# -*- mode: python ; coding: utf-8 -*-
# Run with: pyinstaller GitTool.spec

import os
from PyInstaller.utils.hooks import collect_submodules, collect_data_files

# Spec-file directory; ensures the build works no matter the current CWD.
ROOT = os.path.abspath(os.path.dirname(SPEC))


def _p(*parts: str) -> str:
    return os.path.join(ROOT, *parts)


# Every package that uses dynamic/lazy imports and breaks without this
hiddenimports: list[str] = []
for pkg in [
    "fastapi",
    "starlette",
    "uvicorn",
    "git",
    "gitdb",
    "smmap",
    "openai",
    "httpx",
    "httpcore",
    "h11",
    "pydantic",
    "pydantic_core",
    "anyio",
    "sniffio",
    "webview",
    "clr_loader",
    "pythonnet",
    "bottle",
    "proxy_tools",
    "certifi",
    "jiter",
    "distro",
    "email.mime",
]:
    try:
        hiddenimports += collect_submodules(pkg)
    except Exception:
        pass

# Data files (SSL certs for openai/httpx, etc.)
datas = [
    (_p("frontend", "dist"), os.path.join("frontend", "dist")),
    (_p("backend"), "backend"),
    (_p("assets", "icon.ico"), "assets"),
]
for pkg in ["certifi", "openai", "httpx"]:
    try:
        datas += collect_data_files(pkg)
    except Exception:
        pass

a = Analysis(
    [_p("main.py")],
    pathex=[ROOT],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="GitTool",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    icon=_p("assets", "icon.ico"),
)

coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=False,
    name="GitTool",
)
