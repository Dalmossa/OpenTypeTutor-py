import type { SessionId } from '../value-objects/SessionId.js';
import type { UserProfile } from '../entities/UserProfile.js';

export interface IUserProfileRepository {
  save(profile: UserProfile): Promise<void>;
  findByUserId(userId: SessionId): Promise<UserProfile | null>;
}