class AppError(Exception):
    pass

class InvalidModelConfiguration(AppError):
    pass

class NotFoundError(AppError):
    pass