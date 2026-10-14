"""Custom application exceptions with error codes for consistent API error responses."""


class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, code: str = "INTERNAL_ERROR", status_code: int = 500):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    """Resource not found."""

    def __init__(self, resource: str, resource_id: str):
        super().__init__(
            message=f"{resource} with id '{resource_id}' does not exist",
            code=f"{resource.upper()}_NOT_FOUND",
            status_code=404,
        )


class ValidationError(AppError):
    """Business-logic validation failure."""

    def __init__(self, message: str):
        super().__init__(message=message, code="VALIDATION_ERROR", status_code=422)


class AIServiceError(AppError):
    """AI provider error (Groq/LiteLLM)."""

    def __init__(self, message: str, code: str = "AI_SERVICE_ERROR"):
        super().__init__(message=message, code=code, status_code=502)


class AITimeoutError(AIServiceError):
    """AI provider timeout."""

    def __init__(self):
        super().__init__(message="AI service timed out. Please try again.", code="AI_TIMEOUT")


class AIRateLimitError(AIServiceError):
    """AI provider rate limit hit."""

    def __init__(self):
        super().__init__(message="AI service rate limit reached. Please wait and try again.", code="AI_RATE_LIMIT")


class AIAuthError(AIServiceError):
    """AI provider authentication failure."""

    def __init__(self):
        super().__init__(message="AI service authentication failed. Check API key configuration.", code="AI_AUTH_ERROR")
