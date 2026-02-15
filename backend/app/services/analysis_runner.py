"""Analysis runner service - runs OpenOA analyses with caching."""

import hashlib
import json
import uuid
from typing import Any

# Cache for analysis results - keyed by hash of params
_analysis_cache: dict[str, dict[str, Any]] = {}

# AEP task storage for async polling
_aep_tasks: dict[str, dict[str, Any]] = {}


def _cache_key(analysis_type: str, params: dict[str, Any]) -> str:
    """Generate cache key from analysis type and params."""
    key_str = analysis_type + json.dumps(params, sort_keys=True)
    return hashlib.sha256(key_str.encode()).hexdigest()


def get_cached(analysis_type: str, params: dict[str, Any]) -> dict[str, Any] | None:
    """Get cached analysis result if available."""
    key = _cache_key(analysis_type, params)
    return _analysis_cache.get(key)


def set_cached(analysis_type: str, params: dict[str, Any], result: dict[str, Any]) -> None:
    """Store analysis result in cache."""
    key = _cache_key(analysis_type, params)
    _analysis_cache[key] = result


def create_aep_task() -> str:
    """Create a new AEP task and return its ID."""
    task_id = str(uuid.uuid4())
    _aep_tasks[task_id] = {"status": "pending", "results": None, "error": None}
    return task_id


def get_aep_task(task_id: str) -> dict[str, Any] | None:
    """Get AEP task status and results."""
    return _aep_tasks.get(task_id)


def update_aep_task(task_id: str, status: str, results: dict | None = None, error: str | None = None) -> None:
    """Update AEP task with results."""
    if task_id in _aep_tasks:
        _aep_tasks[task_id] = {"status": status, "results": results, "error": error}
