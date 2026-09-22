import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryUserProfileRepository } from "./InMemoryUserProfileRepository.js";
import { UserProfile } from "../../domain/entities/UserProfile.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const OTHER_USER_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";

function makeProfile(
  userId?: SessionId,
  layout: Layout = Layout.create("ABNT2"),
  level = 1,
): UserProfile {
  return UserProfile.create({
    userId: userId ?? SessionId.create(USER_ID),
    activeLayout: layout,
    currentLevel: level,
  });
}

describe("InMemoryUserProfileRepository", () => {
  let repository: InMemoryUserProfileRepository;

  beforeEach(() => {
    repository = new InMemoryUserProfileRepository();
  });

  it("retorna null quando não existe perfil", async () => {
    const profile = await repository.findByUserId(
      SessionId.create("550e8400-e29b-41d4-a716-446655440099"),
    );
    expect(profile).toBeNull();
  });

  it("salva e recupera perfil por userId", async () => {
    const profile = makeProfile();
    await repository.save(profile);

    const found = await repository.findByUserId(profile.userId);
    expect(found).not.toBeNull();
    expect(found?.userId.equals(profile.userId)).toBe(true);
    expect(found?.activeLayout.equals(profile.activeLayout)).toBe(true);
    expect(found?.currentLevel).toBe(profile.currentLevel);
  });

  it("um usuário só tem um perfil (sobrescreve ao salvar novamente)", async () => {
    const userId = SessionId.create(USER_ID);
    const profile1 = makeProfile(userId, Layout.create("ABNT2"), 1);
    await repository.save(profile1);

    const profile2 = makeProfile(userId, Layout.create("US-INTERNATIONAL"), 5);
    await repository.save(profile2);

    const found = await repository.findByUserId(userId);
    expect(found).not.toBeNull();
    expect(found?.activeLayout.value).toBe("US-INTERNATIONAL");
    expect(found?.currentLevel).toBe(5);
  });

  it("isola perfis por usuário", async () => {
    await repository.save(
      makeProfile(SessionId.create(USER_ID), Layout.create("ABNT2"), 1),
    );
    await repository.save(
      makeProfile(
        SessionId.create(OTHER_USER_ID),
        Layout.create("US-INTERNATIONAL"),
        3,
      ),
    );

    const user1 = await repository.findByUserId(SessionId.create(USER_ID));
    const user2 = await repository.findByUserId(
      SessionId.create(OTHER_USER_ID),
    );

    expect(user1?.activeLayout.value).toBe("ABNT2");
    expect(user1?.currentLevel).toBe(1);
    expect(user2?.activeLayout.value).toBe("US-INTERNATIONAL");
    expect(user2?.currentLevel).toBe(3);
  });

  it("clear remove todos os perfis", async () => {
    await repository.save(makeProfile());
    await repository.save(makeProfile(SessionId.create(OTHER_USER_ID)));

    repository.clear();

    expect(await repository.findByUserId(SessionId.create(USER_ID))).toBeNull();
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todos os perfis salvos", async () => {
    await repository.save(makeProfile());
    await repository.save(makeProfile(SessionId.create(OTHER_USER_ID)));

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });
});
