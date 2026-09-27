import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import { User } from "../../domain/entities/User.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";
import type { Email } from "../../domain/value-objects/Email.js";

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
    await Promise.resolve();
  }

  async findById(id: SessionId): Promise<User | null> {
    await Promise.resolve();
    return this.users.get(id.value) ?? null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    await Promise.resolve();
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return user;
      }
    }
    return null;
  }

  async existsByEmail(email: Email): Promise<boolean> {
    await Promise.resolve();
    for (const user of this.users.values()) {
      if (user.email.equals(email)) {
        return true;
      }
    }
    return false;
  }

  async updatePassword(
    userId: SessionId,
    newPasswordHash: string,
  ): Promise<void> {
    await Promise.resolve();
    const user = this.users.get(userId.value);
    if (!user) return;
    // User é imutável - cria nova instância com novo passwordHash
    const updated = User.create({
      id: user.id,
      name: user.name,
      email: user.email,
      passwordHash: newPasswordHash,
      createdAt: user.createdAt,
    });
    this.users.set(userId.value, updated);
  }

  clear(): void {
    this.users.clear();
  }

  getAll(): User[] {
    return Array.from(this.users.values());
  }
}
