from __future__ import annotations

from openai import OpenAI, OpenAIError

from app.config.settings import AppSettings
from app.utils.logger import get_logger

log = get_logger("ai.commit")

MAX_DIFF_CHARS = 12_000
SYSTEM_PROMPT = (
    "You are a concise git commit message writer. "
    "Given a diff, output ONLY a short professional commit message (1-2 lines max). "
    "Do not include markdown, quotes, or explanation."
)


def generate_commit_message(diff: str, settings: AppSettings | None = None) -> str:
    settings = settings or AppSettings.load()

    if not settings.openai_api_key:
        raise ValueError("OpenAI API key is not configured. Set it in Settings.")

    if not diff.strip():
        return "Update files"

    truncated = diff[:MAX_DIFF_CHARS]

    try:
        client = OpenAI(api_key=settings.openai_api_key, timeout=15.0)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": truncated},
            ],
            max_tokens=100,
            temperature=0.4,
        )
        msg = response.choices[0].message.content.strip()
        log.info("AI commit message: %s", msg)
        return msg
    except OpenAIError as exc:
        log.exception("OpenAI API error")
        raise RuntimeError(f"AI error: {exc}") from exc
    except Exception as exc:
        log.exception("Unexpected error generating commit message")
        raise RuntimeError(f"Failed to generate message: {exc}") from exc
