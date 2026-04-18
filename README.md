# GitTool

A Windows desktop app that simplifies Git workflows with a futuristic React UI and Python backend.

## Architecture

```
git_tool/
  main.py              ← entry point (pywebview + FastAPI)
  backend/
    server.py          ← FastAPI API server
    app/               ← git ops, AI, config, utils
  frontend/
    src/               ← React + TypeScript source
    dist/              ← built static files (served by FastAPI)
  assets/
    icon.ico           ← app icon
```

**How it works:** Python runs a FastAPI server that serves both the REST API and the React static build. `pywebview` opens a native Windows window pointing at `localhost:9876`. PyInstaller bundles everything into a single `.exe`.

## Requirements

- Python 3.10+
- Node.js 20+ (for building the frontend)
- Git installed and in PATH

## Setup

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run build && cd ..
```

## Run (development)

```bash
python main.py
```

## Build .exe

```bash
pyinstaller --onefile --noconsole --name GitTool --icon=assets\icon.ico --add-data "frontend/dist;frontend/dist" --add-data "backend;backend" --add-data "assets/icon.ico;assets" --hidden-import=uvicorn.logging --hidden-import=uvicorn.protocols.http --hidden-import=uvicorn.protocols.http.auto --hidden-import=uvicorn.protocols.websockets --hidden-import=uvicorn.protocols.websockets.auto --hidden-import=uvicorn.lifespan --hidden-import=uvicorn.lifespan.on main.py
```

The executable will be at `dist/GitTool.exe`.

## Features

- **Dashboard** — branch, sync status, file changes, last commit, AI insights panel
- **Repo Setup Wizard** — 4-step guided flow: folder → remote → commit → push
- **Branch Management** — create, switch, rename, delete with animations
- **AI Commit Messages** — OpenAI-powered commit message generation from diffs
- **Push Everything** — one-click stage + AI commit + push
- **Command Palette** — Ctrl+K quick navigation
- **Settings** — OpenAI key, AI toggle, default branch, recent repos

## Configuration

Settings stored in `~/.gittool/config.json`. Logs written to `~/.gittool/app.log`.
