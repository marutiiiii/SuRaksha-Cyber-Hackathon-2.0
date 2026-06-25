import os
import sys
import json
import importlib.util
from pathlib import Path
from typing import Any, Dict

OFFLINE_FOLDER_NAME = "ReguFlow-Offline-Chatbot"
_OFFLINE_MODULES: Dict[str, Any] = {}


def _get_offline_root() -> Path:
    root = Path(__file__).resolve().parents[3] / OFFLINE_FOLDER_NAME
    if not root.exists():
        raise FileNotFoundError(f"Offline folder not found: {root}")
    return root


def _load_offline_env() -> Dict[str, str]:
    env_path = _get_offline_root() / ".env"
    env = {}
    if not env_path.exists():
        return env

    with env_path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            env[key.strip()] = value.strip()
    return env


def _apply_offline_env(env_values: Dict[str, str]) -> Dict[str, str]:
    backup = {}
    for key, value in env_values.items():
        backup[key] = os.environ.get(key)
        os.environ[key] = value
    return backup


def _restore_env(backup: Dict[str, str]) -> None:
    for key, value in backup.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value


def _load_module_from_path(module_name: str, file_path: Path, sys_modules_override: Dict[str, Any] | None = None) -> Any:
    spec = importlib.util.spec_from_file_location(module_name, str(file_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot import module from {file_path}")

    module = importlib.util.module_from_spec(spec)
    saved_modules = {}
    if sys_modules_override:
        for alias, module_obj in sys_modules_override.items():
            saved_modules[alias] = sys.modules.get(alias)
            sys.modules[alias] = module_obj

    saved_path = list(sys.path)
    sys.path.insert(0, str(file_path.parent))
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path[:] = saved_path
        if sys_modules_override:
            for alias, original in saved_modules.items():
                if original is None:
                    sys.modules.pop(alias, None)
                else:
                    sys.modules[alias] = original
    return module


def _load_offline_modules() -> None:
    if _OFFLINE_MODULES:
        return

    offline_root = _get_offline_root()
    env_backup = _apply_offline_env(_load_offline_env())
    try:
        config = _load_module_from_path("offline_config", offline_root / "config.py")
        sys.modules["config"] = config

        ai_service = _load_module_from_path(
            "offline_ai_service",
            offline_root / "ai_service.py",
            {"config": config}
        )
        sys.modules["ai_service"] = ai_service

        shared_utils = _load_module_from_path("offline_shared_utils", offline_root / "shared_utils.py")
        sys.modules["shared_utils"] = shared_utils

        impact_analyzer = _load_module_from_path(
            "offline_impact_analyzer",
            offline_root / "impact_analyzer.py",
            {"config": config, "ai_service": ai_service}
        )
        sys.modules["impact_analyzer"] = impact_analyzer

        compliance_tracker = _load_module_from_path(
            "offline_compliance_tracker",
            offline_root / "compliance_tracker.py",
            {
                "config": config,
                "ai_service": ai_service,
                "shared_utils": shared_utils,
                "impact_analyzer": impact_analyzer,
            }
        )

        _OFFLINE_MODULES.update({
            "config": config,
            "ai_service": ai_service,
            "shared_utils": shared_utils,
            "impact_analyzer": impact_analyzer,
            "compliance_tracker": compliance_tracker,
        })
    finally:
        _restore_env(env_backup)


def generate_maps_from_regulation(regulation_text: str) -> list:
    _load_offline_modules()
    tracker = _OFFLINE_MODULES.get("compliance_tracker")
    if tracker is None:
        raise RuntimeError("Offline compliance tracker module did not load.")
    result = tracker.generate_maps(regulation_text)
    if not isinstance(result, list):
        raise TypeError("Offline generate_maps did not return a list.")
    return result


def get_offline_ai_status() -> dict:
    _load_offline_modules()
    ai_service = _OFFLINE_MODULES.get("ai_service")
    if ai_service is None:
        raise RuntimeError("Offline AI service module did not load.")
    return getattr(ai_service, "get_ai_backend_status", lambda: {} )()
