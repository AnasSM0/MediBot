
import logging
import json
import sys
import contextvars
from datetime import datetime
from typing import Any, Dict, Optional

# Context variable to store request ID
_request_id_ctx_var: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "request_id", default=None
)

def get_request_id() -> Optional[str]:
    return _request_id_ctx_var.get()

def set_request_id(request_id: str):
    _request_id_ctx_var.set(request_id)

class JSONFormatter(logging.Formatter):
    """
    Formatter to output logs in JSON format.
    """
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "request_id": get_request_id(),
        }

        # Include any extra attributes passed with `extra={...}`
        if hasattr(record, "props"):
            log_data.update(record.props)

        # Include exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)

def setup_logger(name: str) -> logging.Logger:
    """
    Setup a logger with JSON formatter.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    logger.propagate = False # Prevent double logging if root logger is configured

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
    
    return logger

# Global instance for quick access
root_logger = setup_logger("medibot")
