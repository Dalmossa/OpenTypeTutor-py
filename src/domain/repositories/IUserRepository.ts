import type { SessionId } from "../value-objects/SessionId.js";
import type { User } from "../entities/User.js";
import type { Email } from "../value-objects/Email.js";

export interface IUserRepository {
  save(user: User): Promise<void>;
  findById(id: SessionId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  existsByEmail(email: Email): Promise<boolean>;
  updatePassword(userId: SessionId, newPasswordHash: string): Promise<void>;
}
