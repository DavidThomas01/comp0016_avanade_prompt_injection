class AppError(Exception):
    pass

class InvalidModelConfiguration(AppError):
    pass

class UnknownModel(AppError):
    pass

class UnknownMitigation(AppError):
    pass

class NotFoundError(AppError):
    pass