from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("OPENOA_APP_NAME", "OpenOA Web API")
    app_env: str = os.getenv("OPENOA_ENV", "development")
    cors_origins_raw: str = os.getenv("OPENOA_CORS_ORIGINS", "*")
    data_path: str = os.getenv("OPENOA_DATA_PATH", "examples/data/la_haute_borne")
    scada_max_points: int = int(os.getenv("OPENOA_SCADA_MAX_POINTS", "5000"))
    default_aep_num_sim: int = int(os.getenv("OPENOA_DEFAULT_AEP_NUM_SIM", "60"))

    @property
    def cors_origins(self) -> list[str]:
        values = [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]
        return values or ["*"]

    def resolve_data_path(self, repo_root: Path) -> Path:
        data_path = Path(self.data_path)
        if data_path.is_absolute():
            return data_path
        return (repo_root / data_path).resolve()


settings = Settings()
