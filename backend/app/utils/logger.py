from __future__ import annotations

import logging
from pathlib import Path

LOG_DIR = Path.home() / ".gittool"
LOG_FILE = LOG_DIR / "app.log"


def get_logger(name: str = "gittool") -> logging.Logger:
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)
        fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
        fh.setLevel(logging.DEBUG)
        fmt = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    return logger
