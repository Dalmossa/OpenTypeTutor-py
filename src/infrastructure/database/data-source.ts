import { DataSource, type MigrationInterface } from 'typeorm';
import { databaseParams } from './databaseParams.js';
import { UserEntity, UserProfileEntity, LessonEntity, TypingSessionEntity, KeyPerformanceEntity, ProgressEntity, ProgressCardEntity } from './entities/index.js';
import { InitSchema1700000000000 } from './migrations/1700000000000-InitSchema.js';
import { SeedCurriculum1700000000001 } from './migrations/1700000000001-SeedCurriculum.js';
import { SeedCurriculumLevels2and31700000000002 } from './migrations/1700000000002-SeedCurriculumLevels2and3.js';
import { SeedCursoDigitacao1700000000003 } from './migrations/1700000000003-SeedCursoDigitacao.js';
import { AddPedagogicalPhaseColumns1700000000004 } from './migrations/1700000000004-AddPedagogicalPhaseColumns.js';
import { SeedPedagogicalCurriculum1700000000005 } from './migrations/1700000000005-SeedPedagogicalCurriculum.js';
import { AddProgressCardTable1700000000006 } from './migrations/1700000000006-AddProgressCardTable.js';

type DataSourceConfig = {
  database?: string;
  migrations?: (new () => MigrationInterface)[];
};
type SqliteDatabaseHandle = { pragma(source: string): unknown };

const SCHEMA_MIGRATIONS: (new () => MigrationInterface)[] = [
  InitSchema1700000000000,
  AddPedagogicalPhaseColumns1700000000004,
  AddProgressCardTable1700000000006,
];
const ALL_MIGRATIONS: (new () => MigrationInterface)[] = [
  InitSchema1700000000000,
  SeedCurriculum1700000000001,
  SeedCurriculumLevels2and31700000000002,
  SeedCursoDigitacao1700000000003,
  AddPedagogicalPhaseColumns1700000000004,
  SeedPedagogicalCurriculum1700000000005,
  AddProgressCardTable1700000000006,
];

export function createDataSource(config?: Partial<DataSourceConfig>): DataSource {
  return new DataSource({
    type: 'better-sqlite3',
    database: config?.database ?? databaseParams.DATABASE_PATH,
    entities: [UserEntity, UserProfileEntity, LessonEntity, TypingSessionEntity, KeyPerformanceEntity, ProgressEntity, ProgressCardEntity],
    migrations: config?.migrations ?? ALL_MIGRATIONS,
    synchronize: false,
    logging: false,
    enableWAL: databaseParams.ENABLE_WAL,
    timeout: databaseParams.BUSY_TIMEOUT_MS,
    prepareDatabase: (db: SqliteDatabaseHandle) => {
      db.pragma('foreign_keys = ON');
    },
  });
}

export { SCHEMA_MIGRATIONS };