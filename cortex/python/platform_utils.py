"""
Platform Utilities for Cross-Platform Compatibility
Handles platform detection and path resolution for Windows, macOS, and Linux
"""

import platform
import os
from pathlib import Path


def get_platform() -> str:
    """
    Detect current operating system
    
    Returns:
        str: 'windows', 'macos', or 'linux'
    """
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    if system == "windows":
        return "windows"
    return "linux"


def get_models_dir() -> Path:
    """
    Get platform-specific models directory
    
    Unified storage: ~/Luca/models
    """
    return Path(os.path.expanduser("~")) / "Luca" / "models"


def get_python_executable() -> str:
    """
    Get platform-specific Python command
    
    Returns:
        str: Python executable name
    """
    return "python" if get_platform() == "windows" else "python3"


def ensure_dir_exists(path: Path) -> None:
    """
    Ensure directory exists, create if needed
    
    Args:
        path: Directory path to ensure exists
    """
    path.mkdir(parents=True, exist_ok=True)
