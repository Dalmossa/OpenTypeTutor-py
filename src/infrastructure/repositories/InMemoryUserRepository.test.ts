import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryUserRepository } from "./InMemoryUserRepository.js";
import { User } from "../../domain/entities/User.js";
import { Email } from "../../domain/value-objects/Email.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const EMAIL = "user@example.com";

function makeUser(id?: SessionId, email?: Email): User {
  const props: Parameters<typeof User.create>[0] = {
    name: "Test User",
    email: email ?? Email.create(EMAIL),
    passwordHash: "$2b$12$hashedpassword",
  };
  if (id !== undefined) {
    props.id = id;
  }
  return User.create(props);
}

describe("InMemoryUserRepository", () => {
  let repository: InMemoryUserRepository;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
  });

  it("retorna null quando não existe usuário", async () => {
    const user = await repository.findById(SessionId.create(USER_ID));
    expect(user).toBeNull();
  });

  it("salva e recupera usuário por id", async () => {
    const user = makeUser();
    await repository.save(user);

    const found = await repository.findById(user.id);
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(user.id.value);
    expect(found?.name).toBe(user.name);
    expect(found?.email.value).toBe(user.email.value);
  });

  it("encontra usuário por email", async () => {
    const user = makeUser();
    await repository.save(user);

    const found = await repository.findByEmail(user.email);
    expect(found).not.toBeNull();
    expect(found?.email.value).toBe(EMAIL.toLowerCase());
  });

  it("retorna null para email inexistente", async () => {
    const found = await repository.findByEmail(
      Email.create("naoexiste@example.com"),
    );
    expect(found).toBeNull();
  });

  it("existsByEmail retorna true para email existente", async () => {
    const user = makeUser();
    await repository.save(user);

    const exists = await repository.existsByEmail(user.email);
    expect(exists).toBe(true);
  });

  it("existsByEmail retorna false para email inexistente", async () => {
    const exists = await repository.existsByEmail(
      Email.create("naoexiste@example.com"),
    );
    expect(exists).toBe(false);
  });

  it("isola usuários por id", async () => {
    const otherId = SessionId.create("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d");
    await repository.save(makeUser(SessionId.create(USER_ID)));

    expect(await repository.findById(otherId)).toBeNull();
    expect(await repository.findById(SessionId.create(USER_ID))).not.toBeNull();
  });

  it("isola usuários por email (case-insensitive)", async () => {
    await repository.save(
      makeUser(undefined, Email.create("USER@EXAMPLE.COM")),
    );

    expect(
      await repository.findByEmail(Email.create("user@example.com")),
    ).not.toBeNull();
    expect(
      await repository.findByEmail(Email.create("OUTRO@EXAMPLE.COM")),
    ).toBeNull();
  });

  it("clear remove todos os usuários", async () => {
    await repository.save(makeUser());
    await repository.save(
      makeUser(
        SessionId.create("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"),
        Email.create("other@example.com"),
      ),
    );

    repository.clear();

    expect(await repository.findById(SessionId.create(USER_ID))).toBeNull();
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todos os usuários salvos", async () => {
    await repository.save(makeUser());
    await repository.save(
      makeUser(
        SessionId.create("9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"),
        Email.create("other@example.com"),
      ),
    );

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });
});
