import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import type { UserProfile } from '../../domain/entities/UserProfile.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  private profiles = new Map<string, UserProfile>();

  async save(profile: UserProfile): Promise<void> {
    this.profiles.set(profile.userId.value, profile);
    await Promise.resolve();
  }

  async findByUserId(userId: SessionId): Promise<UserProfile | null> {
    await Promise.resolve();
    return this.profiles.get(userId.value) ?? null;
  }

  clear(): void {
    this.profiles.clear();
  }

  getAll(): UserProfile[] {
    return Array.from(this.profiles.values());
  }
}