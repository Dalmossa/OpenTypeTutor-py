export abstract class DomainError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidSessionTransitionError extends DomainError {
  readonly code = 'INVALID_SESSION_TRANSITION';
  readonly statusCode = 400;
  constructor(message: string) {
    super(message);
  }
}

export class SessionNotOwnedError extends DomainError {
  readonly code = 'SESSION_NOT_OWNED';
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
  }
}

export class ProfileNotOwnedError extends DomainError {
  readonly code = 'PROFILE_NOT_OWNED';
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
  }
}

export class InsufficientSessionDataError extends DomainError {
  readonly code = 'INSUFFICIENT_SESSION_DATA';
  readonly statusCode = 422;
  constructor(message: string) {
    super(message);
  }
}

export class UserAlreadyExistsError extends DomainError {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = 'INVALID_CREDENTIALS';
  readonly statusCode = 401;
  constructor(message: string) {
    super(message);
  }
}

export class LessonNotFoundError extends DomainError {
  readonly code = 'LESSON_NOT_FOUND';
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
  }
}

export class UserNotFoundError extends DomainError {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
  }
}

export class SessionNotFoundError extends DomainError {
  readonly code = 'SESSION_NOT_FOUND';
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
  }
}

export class SessionAlreadyCompletedError extends DomainError {
  readonly code = 'SESSION_ALREADY_COMPLETED';
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
  }
}

export class DiscomfortSignaledError extends DomainError {
  readonly code = 'DISCOMFORT_SIGNALED';
  readonly statusCode = 422;
  constructor(message: string) {
    super(message);
  }
}

export class BreakRequiredError extends DomainError {
  readonly code = 'BREAK_REQUIRED';
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
  }
}