"""Plant data loading service - loads La Haute Borne dataset as singleton."""

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from openoa.plant import PlantData

_plant_data: "PlantData | None" = None


def get_data_path() -> Path:
    """Get the absolute path to the La Haute Borne data directory."""
    # When running from backend/, we need to find examples/data/la_haute_borne
    # The backend runs from repo root in Docker, so we look for examples relative to cwd
    import sys

    # Find the openoa package location to get repo root
    try:
        import examples

        examples_dir = Path(examples.__file__).parent
        return examples_dir / "data" / "la_haute_borne"
    except ImportError:
        # Fallback: assume we're in repo root
        return Path(__file__).resolve().parent.parent.parent.parent / "examples" / "data" / "la_haute_borne"


def load_plant() -> "PlantData | None":
    """Load the La Haute Borne plant data. Returns the PlantData singleton."""
    global _plant_data
    if _plant_data is not None:
        return _plant_data

    try:
        from examples.project_ENGIE import prepare

        data_path = get_data_path()
        _plant_data = prepare(path=str(data_path), return_value="plantdata")
        return _plant_data
    except Exception as e:
        raise RuntimeError(f"Failed to load plant data: {e}") from e


def get_plant() -> "PlantData | None":
    """Get the loaded plant data. Returns None if not yet loaded."""
    return _plant_data


def is_loaded() -> bool:
    """Check if plant data has been loaded."""
    return _plant_data is not None
