import type { DataSource, Repository } from 'typeorm';
import type { IUserProfileRepository } from '../../domain/repositories/IUserProfileRepository.js';
import type { UserProfile } from '../../domain/entities/UserProfile.js';
import type { SessionId } from '../../domain/value-objects/SessionId.js';
import { SessionId as SessionIdValue } from '../../domain/value-objects/SessionId.js';
import { Layout as LayoutValue } from '../../domain/value-objects/Layout.js';
import { UserProfile as UserProfileValue } from '../../domain/entities/UserProfile.js';
import { UserProfileEntity, type UserProfileRow } from '../database/entities/index.js';

function toRow(profile: UserProfile): UserProfileRow {
  return {
    userId: profile.userId.value,
    activeLayout: profile.activeLayout.value,
    currentLevel: profile.currentLevel,
  };
}

function fromRow(row: UserProfileRow): UserProfile {
  return UserProfileValue.create({
    userId: SessionIdValue.create(row.userId),
    activeLayout: LayoutValue.create(row.activeLayout),
    currentLevel: row.currentLevel,
  });
}

export class TypeOrmUserProfileRepository implements IUserProfileRepository {
  private readonly repo: Repository<UserProfileRow>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserProfileEntity);
  }

  async save(profile: UserProfile): Promise<void> {
    await this.repo.save(toRow(profile));
  }

  async findByUserId(userId: SessionId): Promise<UserProfile | null> {
    const row = await this.repo.findOne({ where: { userId: userId.value } });
    return row === null ? null : fromRow(row);
  }
}