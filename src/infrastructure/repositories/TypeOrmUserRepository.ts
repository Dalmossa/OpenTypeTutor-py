import type { DataSource, Repository } from "typeorm";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { User } from "../../domain/entities/User.js";
import type { SessionId } from "../../domain/value-objects/SessionId.js";
import type { Email } from "../../domain/value-objects/Email.js";
import { Email as EmailValue } from "../../domain/value-objects/Email.js";
import { SessionId as SessionIdValue } from "../../domain/value-objects/SessionId.js";
import { User as UserValue } from "../../domain/entities/User.js";
import { UserEntity, type UserRow } from "../database/entities/index.js";
import { toIso, fromIso } from "./dateTime.js";

function toRow(user: User): UserRow {
  return {
    id: user.id.value,
    name: user.name,
    email: user.email.value,
    passwordHash: user.passwordHash,
    createdAt: toIso(user.createdAt),
    role: user.role,
  };
}

function fromRow(row: UserRow): User {
  return UserValue.create({
    id: SessionIdValue.create(row.id),
    name: row.name,
    email: EmailValue.create(row.email),
    passwordHash: row.passwordHash,
    createdAt: fromIso(row.createdAt),
    role: row.role as "user" | "admin",
  });
}

export class TypeOrmUserRepository implements IUserRepository {
  private readonly repo: Repository<UserRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserEntity);
  }

  async save(user: User): Promise<void> {
    await this.repo.save(toRow(user));
  }

  async findById(id: SessionId): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id: id.value } });
    return row === null ? null : fromRow(row);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.repo.findOne({ where: { email: email.value } });
    return row === null ? null : fromRow(row);
  }

  async existsByEmail(email: Email): Promise<boolean> {
    return (
      (await this.repo.findOne({ where: { email: email.value } })) !== null
    );
  }

  async updatePassword(
    userId: SessionId,
    newPasswordHash: string,
  ): Promise<void> {
    await this.repo.update(
      { id: userId.value },
      { passwordHash: newPasswordHash },
    );
  }
}
