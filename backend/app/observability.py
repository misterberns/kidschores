"""Observability plumbing: request IDs, optional JSON logging, dormant Sentry.

All three are zero-config by default:
  - Request-ID middleware always runs (accepts an incoming X-Request-ID or
    generates one, echoes it on the response, includes it in the access line).
  - LOG_FORMAT=json switches the root logger to structured JSON lines.
  - SENTRY_DSN activates Sentry error reporting; unset means the SDK is never
    initialized (ships dormant until an account/DSN exists).
"""
import json
import logging
import os
import time
import uuid
from contextvars import ContextVar

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

request_id_var: ContextVar[str] = ContextVar("request_id", default="-")

logger = logging.getLogger("kidschores.access")


class _JsonFormatter(logging.Formatter):
    """Minimal structured formatter — no extra dependency."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S%z"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_var.get(),
        }
        if record.exc_info:
            entry["exc_info"] = self.formatException(record.exc_info)
        for key in ("method", "path", "status_code", "duration_ms"):
            if hasattr(record, key):
                entry[key] = getattr(record, key)
        return json.dumps(entry, default=str)


def configure_logging() -> None:
    """Apply LOG_FORMAT=json if requested (default: leave plain logging alone)."""
    if os.environ.get("LOG_FORMAT", "").strip().lower() == "json":
        handler = logging.StreamHandler()
        handler.setFormatter(_JsonFormatter())
        root = logging.getLogger()
        root.handlers = [handler]
        root.setLevel(logging.INFO)


def init_sentry() -> bool:
    """Initialize Sentry iff SENTRY_DSN is set. Returns whether it activated."""
    dsn = os.environ.get("SENTRY_DSN", "").strip()
    if not dsn:
        return False
    import sentry_sdk

    sentry_sdk.init(
        dsn=dsn,
        environment=os.environ.get("ENVIRONMENT", "production"),
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0")),
        send_default_pii=False,
    )
    return True


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Accept/generate X-Request-ID, echo it back, and emit one access line."""

    async def dispatch(self, request: Request, call_next):
        incoming = request.headers.get("X-Request-ID", "")
        # Never trust unbounded/odd client input for a log/header field
        cleaned = "".join(c for c in incoming if c.isalnum() or c == "-")[:64]
        request_id = cleaned or uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s -> %s (%.1f ms) rid=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
