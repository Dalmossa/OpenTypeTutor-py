import { createDataSource } from './data-source.js';

async function main(): Promise<void> {
  const dataSource = createDataSource();
  await dataSource.initialize();
  const executed = await dataSource.runMigrations({ transaction: 'each' });
  for (const migration of executed) {
    process.stdout.write(`[migrate] ${migration.name}\n`);
  }
  await dataSource.destroy();
}

main().catch((error: unknown) => {
  process.stderr.write(`[migrate] falha: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});