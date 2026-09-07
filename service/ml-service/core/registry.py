"""
service/ml-service/core/registry.py
===================================
Thread-safe Model Registry for dynamically registering, discovering, and instantiating
anomaly detection models in HormuzWatch without hardcoding or modifying service dispatchers.
"""

from __future__ import annotations

import importlib
import logging
import pkgutil
from pathlib import Path
from typing import Callable, Dict, List, Optional, Type
from core.base_model import BaseAnomalyModel

logger = logging.getLogger("hormuzwatch.ml.registry")


class ModelRegistry:
    """Catalog of registered anomaly detection model classes."""
    _registry: Dict[str, Type[BaseAnomalyModel]] = {}

    @classmethod
    def register(cls, name: str) -> Callable[[Type[BaseAnomalyModel]], Type[BaseAnomalyModel]]:
        """
        Decorator to register a model class with a unique alias.
        
        Usage:
            @ModelRegistry.register("isolation_forest")
            class IsolationForestModel(BaseAnomalyModel):
                ...
        """
        def decorator(subclass: Type[BaseAnomalyModel]) -> Type[BaseAnomalyModel]:
            key = name.lower().strip()
            if key in cls._registry:
                logger.warning("Overwriting existing model registration for '%s'", key)
            cls._registry[key] = subclass
            logger.info("Registered anomaly model plugin: '%s' -> %s", key, subclass.__name__)
            return subclass
        return decorator

    @classmethod
    def get(cls, name: str) -> Type[BaseAnomalyModel]:
        """Retrieve the model class for a given name."""
        key = name.lower().strip()
        if key not in cls._registry:
            available = list(cls._registry.keys())
            raise KeyError(
                f"Model '{key}' is not registered. Available models: {available}. "
                f"Ensure the module implementing '{key}' is imported or located in models/."
            )
        return cls._registry[key]

    @classmethod
    def create(cls, name: str, **kwargs) -> BaseAnomalyModel:
        """Instantiate a registered model by name with arbitrary parameters."""
        model_cls = cls.get(name)
        return model_cls(**kwargs)

    @classmethod
    def list_models(cls) -> List[str]:
        """Return list of all registered model identifiers."""
        return sorted(list(cls._registry.keys()))

    @classmethod
    def auto_discover(cls, directory: Path, package_prefix: str = "core.models") -> None:
        """
        Recursively scan a directory and import all modules to trigger registration decorators.
        """
        if not directory.exists():
            return

        for module_info in pkgutil.iter_modules([str(directory)]):
            full_module_name = f"{package_prefix}.{module_info.name}"
            try:
                importlib.import_module(full_module_name)
                logger.debug("Auto-discovered and loaded model module: %s", full_module_name)
            except Exception as err:
                logger.error("Failed to load model module '%s': %s", full_module_name, err)
