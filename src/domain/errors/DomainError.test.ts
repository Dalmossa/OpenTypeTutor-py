import { describe, it, expect } from "vitest";
import {
  DomainError,
  InvalidSessionTransitionError,
  SessionNotOwnedError,
  ProfileNotOwnedError,
  UserAlreadyExistsError,
  InvalidCredentialsError,
  LessonNotFoundError,
  SessionNotFoundError,
  SessionAlreadyCompletedError,
} from "./DomainError.js";

describe("PRD - Erros de domínio (DomainError)", () => {
  it.each([
    [
      "InvalidSessionTransitionError",
      InvalidSessionTransitionError,
      "INVALID_SESSION_TRANSITION",
      400,
    ],
    ["SessionNotOwnedError", SessionNotOwnedError, "SESSION_NOT_OWNED", 403],
    ["ProfileNotOwnedError", ProfileNotOwnedError, "PROFILE_NOT_OWNED", 403],
    [
      "UserAlreadyExistsError",
      UserAlreadyExistsError,
      "USER_ALREADY_EXISTS",
      409,
    ],
    [
      "InvalidCredentialsError",
      InvalidCredentialsError,
      "INVALID_CREDENTIALS",
      401,
    ],
    ["LessonNotFoundError", LessonNotFoundError, "LESSON_NOT_FOUND", 404],
    ["SessionNotFoundError", SessionNotFoundError, "SESSION_NOT_FOUND", 404],
    [
      "SessionAlreadyCompletedError",
      SessionAlreadyCompletedError,
      "SESSION_ALREADY_COMPLETED",
      409,
    ],
  ] as const)(
    "%s deve expor code e statusCode corretos",
    (name, ErrorClass, code, statusCode) => {
      const error = new ErrorClass("mensagem");

      expect(error).toBeInstanceOf(DomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("mensagem");
      expect(error.name).toBe(name);
      expect(error.code).toBe(code);
      expect(error.statusCode).toBe(statusCode);
    },
  );
});
