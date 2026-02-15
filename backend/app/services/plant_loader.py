from __future__ import annotations

import threading
from pathlib import Path

from examples.project_ENGIE import prepare
from openoa.plant import PlantData

from backend.app.config import settings


_lock = threading.Lock()
_plant: PlantData | None = None


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def load_plant(force_reload: bool = False) -> PlantData:
    global _plant
    with _lock:
        if _plant is not None and not force_reload:
            return _plant

        data_path = settings.resolve_data_path(repo_root())
        _plant = prepare(path=data_path, return_value="plantdata")
        return _plant


def get_plant() -> PlantData:
    plant = _plant
    if plant is None:
        return load_plant()
    return plant


def is_plant_loaded() -> bool:
    return _plant is not None
