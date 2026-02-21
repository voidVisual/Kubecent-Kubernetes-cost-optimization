#!/usr/bin/env python
"""Run the FastAPI application."""

import sys
import subprocess

result = subprocess.run(
    [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
    cwd=__file__[:-7]  # Get the directory of this script
)
sys.exit(result.returncode)
