class AppError(Exception):
    pass


class InvalidModelConfiguration(AppError):
    pass


class UnknownModel(AppError):
    pass


class UnknownMitigation(AppError):
    pass


class UnknownProvider(AppError):
    pass


class UnknownRunner(AppError):
    pass


class NotFoundError(AppError):
    pass


class EnhancementValidationError(Exception):
    pass


class UnsafePromptError(Exception):
    pass