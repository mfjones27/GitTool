from __future__ import annotations

import json
from pathlib import Path
from dataclasses import dataclass, field, asdict

CONFIG_DIR = Path.home() / ".gittool"
CONFIG_FILE = CONFIG_DIR / "config.json"

DEFAULTS = {
    "openai_api_key": "",
    "ai_enabled": True,
    "default_branch": "main",
    "recent_repos": [],
}


@dataclass
class AppSettings:
    openai_api_key: str = ""
    ai_enabled: bool = True
    default_branch: str = "main"
    recent_repos: list[str] = field(default_factory=list)

    # ---- persistence ----

    @classmethod
    def load(cls) -> "AppSettings":
        if CONFIG_FILE.exists():
            try:
                data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
                merged = {**DEFAULTS, **data}
                return cls(**{k: merged[k] for k in DEFAULTS})
            except (json.JSONDecodeError, TypeError):
                pass
        return cls()

    def save(self) -> None:
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        CONFIG_FILE.write_text(
            json.dumps(asdict(self), indent=2), encoding="utf-8"
        )

    # ---- helpers ----

    def add_recent_repo(self, path: str) -> None:
        path = str(Path(path).resolve())
        if path in self.recent_repos:
            self.recent_repos.remove(path)
        self.recent_repos.insert(0, path)
        self.recent_repos = self.recent_repos[:10]
        self.save()
