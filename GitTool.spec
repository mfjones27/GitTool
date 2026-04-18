# -*- mode: python ; coding: utf-8 -*-
# Run with: pyinstaller GitTool.spec

from PyInstaller.utils.hooks import collect_submodules, collect_data_files

# Every package that uses dynamic/lazy imports and breaks without this
hiddenimports = []
for pkg in [
    'fastapi',
    'starlette',
    'uvicorn',
    'git',
    'gitdb',
    'smmap',
    'openai',
    'httpx',
    'httpcore',
    'h11',
    'pydantic',
    'pydantic_core',
    'anyio',
    'sniffio',
    'webview',
    'clr_loader',
    'pythonnet',
    'bottle',
    'proxy_tools',
    'certifi',
    'jiter',
    'distro',
    'email.mime',
]:
    try:
        hiddenimports += collect_submodules(pkg)
    except Exception:
        pass

# Data files (SSL certs for openai/httpx, etc.)
datas = [
    ('frontend/dist', 'frontend/dist'),
    ('backend', 'backend'),
    ('assets/icon.ico', 'assets'),
]
for pkg in ['certifi', 'openai', 'httpx']:
    try:
        datas += collect_data_files(pkg)
    except Exception:
        pass

a = Analysis(
    ['main.py'],
    pathex=[],
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
    a.binaries,
    a.datas,
    [],
    name='GitTool',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    icon='assets/icon.ico',
)
