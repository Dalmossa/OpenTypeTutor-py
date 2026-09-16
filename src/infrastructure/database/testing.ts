import type { DataSource } from 'typeorm';
import { createDataSource, SCHEMA_MIGRATIONS } from './data-source.js';

export async function createTestDataSource(): Promise<DataSource> {
  const dataSource = createDataSource({ database: ':memory:', migrations: SCHEMA_MIGRATIONS });
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'each' });
  return dataSource;
}

export async function createSeededTestDataSource(): Promise<DataSource> {
  const dataSource = createDataSource({ database: ':memory:' });
  await dataSource.initialize();
  await dataSource.runMigrations({ transaction: 'each' });
  return dataSource;
}