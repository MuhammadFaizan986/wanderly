from decimal import Decimal

from app.ai.llm_client import Usage

# USD per million tokens: (input, output). Cache writes bill at 1.25x input, reads at 0.1x.
PRICES: dict[str, tuple[Decimal, Decimal]] = {
    "claude-opus-5": (Decimal(5), Decimal(25)),
    "claude-opus-4-8": (Decimal(5), Decimal(25)),
    "claude-sonnet-5": (Decimal(2), Decimal(10)),
    "claude-haiku-4-5": (Decimal(1), Decimal(5)),
}
_MILLION = Decimal(1_000_000)


def cost_usd(model: str, usage: Usage) -> Decimal:
    input_price, output_price = PRICES.get(model, PRICES["claude-opus-5"])
    cost = (
        usage.input_tokens * input_price
        + usage.cache_write_tokens * input_price * Decimal("1.25")
        + usage.cache_read_tokens * input_price * Decimal("0.1")
        + usage.output_tokens * output_price
    ) / _MILLION
    return cost.quantize(Decimal("0.000001"))
