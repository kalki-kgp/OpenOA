from __future__ import annotations

import asyncio
import json
import threading
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Callable
from uuid import uuid4


_lock = threading.Lock()
_cache: dict[str, Any] = {}
_task_index_by_key: dict[str, str] = {}
_aep_tasks: dict[str, dict[str, Any]] = {}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _stable_hash(data: dict[str, Any]) -> str:
    payload = json.dumps(data, sort_keys=True, default=str)
    return sha256(payload.encode("utf-8")).hexdigest()


def build_cache_key(namespace: str, params: dict[str, Any]) -> str:
    return f"{namespace}:{_stable_hash(params)}"


def run_cached(namespace: str, params: dict[str, Any], compute: Callable[[], Any]) -> Any:
    key = build_cache_key(namespace, params)
    with _lock:
        if key in _cache:
            return _cache[key]

    result = compute()

    with _lock:
        _cache[key] = result

    return result


async def submit_aep_task(params: dict[str, Any], compute: Callable[[], Any]) -> tuple[str, str]:
    key = build_cache_key("aep", params)

    with _lock:
        if key in _cache:
            task_id = _task_index_by_key.get(key)
            if task_id is None:
                task_id = str(uuid4())
                _task_index_by_key[key] = task_id
                _aep_tasks[task_id] = {
                    "task_id": task_id,
                    "status": "completed",
                    "result": _cache[key],
                    "error": None,
                    "updated_at": _now_iso(),
                }
            return task_id, "completed"

        existing_task_id = _task_index_by_key.get(key)
        if existing_task_id:
            task = _aep_tasks.get(existing_task_id)
            if task and task["status"] in {"running", "completed"}:
                return existing_task_id, task["status"]

        task_id = str(uuid4())
        _task_index_by_key[key] = task_id
        _aep_tasks[task_id] = {
            "task_id": task_id,
            "status": "running",
            "result": None,
            "error": None,
            "updated_at": _now_iso(),
        }

    async def _runner() -> None:
        try:
            result = await asyncio.to_thread(compute)
            with _lock:
                _cache[key] = result
                _aep_tasks[task_id].update(
                    {
                        "status": "completed",
                        "result": result,
                        "error": None,
                        "updated_at": _now_iso(),
                    }
                )
        except Exception as exc:  # pragma: no cover
            with _lock:
                _aep_tasks[task_id].update(
                    {
                        "status": "failed",
                        "result": None,
                        "error": str(exc),
                        "updated_at": _now_iso(),
                    }
                )

    asyncio.create_task(_runner())
    return task_id, "running"


def get_aep_task(task_id: str) -> dict[str, Any] | None:
    with _lock:
        task = _aep_tasks.get(task_id)
        if not task:
            return None
        return dict(task)
