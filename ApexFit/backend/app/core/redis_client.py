"""Redis client singleton for caching and leaderboards."""

from __future__ import annotations

import logging

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

_redis: aioredis.Redis | None = None


async def init_redis(url: str) -> None:
    """Create the global async Redis connection."""
    global _redis  # noqa: PLW0603
    _redis = aioredis.from_url(url, decode_responses=True)
    logger.info("Redis connected: %s", url.split("@")[-1] if "@" in url else url)


async def close_redis() -> None:
    """Gracefully close the Redis connection."""
    global _redis  # noqa: PLW0603
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        logger.info("Redis connection closed")


def get_redis() -> aioredis.Redis:
    """Return the current Redis client; raises if not initialised."""
    if _redis is None:
        raise RuntimeError("Redis has not been initialised — call init_redis() first")
    return _redis
