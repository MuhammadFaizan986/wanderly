from datetime import date
from functools import cache
from pathlib import Path

PROMPTS_DIR = Path(__file__).parent
SYSTEM_PROMPT_VERSION = "system_v2"


@cache
def _template(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.md").read_text()


def system_prompt(today: date | None = None) -> str:
    # The date changes once a day, so the cached prompt prefix stays stable within a day.
    today = today or date.today()
    return _template(SYSTEM_PROMPT_VERSION).format(today=today.strftime("%A, %d %B %Y"))
