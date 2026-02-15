"""Custom exception classes and FastAPI exception handlers."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, code: str = "APP_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource", identifier: str = ""):
        detail = f"{resource} not found"
        if identifier:
            detail = f"{resource} '{identifier}' not found"
        super().__init__(detail, code="NOT_FOUND", status_code=404)


class ConflictError(AppError):
    def __init__(self, message: str = "Resource already exists"):
        super().__init__(message, code="CONFLICT", status_code=409)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, code="FORBIDDEN", status_code=403)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, code="VALIDATION_ERROR", status_code=422)


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(
        _request: Request, exc: Exception
    ) -> JSONResponse:
        logger.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "Internal server error", "code": "INTERNAL_ERROR"},
        )
