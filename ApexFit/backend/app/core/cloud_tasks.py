"""Google Cloud Tasks helper for dispatching async jobs."""

from __future__ import annotations

import json
import logging

from app.config import get_settings

logger = logging.getLogger(__name__)


async def enqueue_task(
    queue: str,
    handler_path: str,
    payload: dict,
    *,
    delay_seconds: int = 0,
) -> str | None:
    """Enqueue an HTTP task on Cloud Tasks.

    In local/dev mode this logs the payload instead of dispatching.
    Returns the task name on success, None in dev mode.
    """
    settings = get_settings()

    if not settings.is_production:
        logger.info(
            "DEV cloud-task queue=%s path=%s payload=%s",
            queue,
            handler_path,
            json.dumps(payload, default=str),
        )
        return None

    # Production path — import lazily so dev environments don't need the SDK.
    try:
        from google.cloud import tasks_v2  # type: ignore[import-untyped]
        from google.protobuf import duration_pb2, timestamp_pb2  # type: ignore[import-untyped]
    except ImportError:
        logger.error("google-cloud-tasks SDK not installed; skipping enqueue")
        return None

    client = tasks_v2.CloudTasksAsyncClient()
    parent = client.queue_path(settings.gcp_project_id, "us-central1", queue)

    task: dict = {
        "http_request": {
            "http_method": tasks_v2.HttpMethod.POST,
            "url": f"{settings.cloud_run_url}{handler_path}",
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(payload, default=str).encode(),
        },
    }

    if delay_seconds > 0:
        import datetime

        schedule_time = timestamp_pb2.Timestamp()
        schedule_time.FromDatetime(
            datetime.datetime.now(datetime.timezone.utc)
            + datetime.timedelta(seconds=delay_seconds)
        )
        task["schedule_time"] = schedule_time

    response = await client.create_task(parent=parent, task=task)
    logger.info("Enqueued task: %s", response.name)
    return response.name
