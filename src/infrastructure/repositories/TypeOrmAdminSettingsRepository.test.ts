import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { DataSource } from "typeorm";
import { TypeOrmAdminSettingsRepository } from "./TypeOrmAdminSettingsRepository.js";
import { createTestDataSource } from "../database/testing.js";
import { AdminSettingsEntity } from "../database/entities/index.js";
import { AdminSettings } from "../../domain/entities/AdminSettings.js";
import { adaptiveParams } from "../../domain/config/adaptiveParams.js";

/**
 * RN34 - persistência das configurações administrativas (tabela singleton).
 *
 * Este repositório é a única borda entre o caso de uso e o SQLite para as
 * configurações de pacing, e estava com 16,66% de cobertura: nenhum teste
 * escrevia e relia nada. Os casos abaixo são os que o mapeamento de coluna tem,
 * não os que o repository faria "óbvio":
 *
 * - `macroBreakEnabled` é `int` no SQLite, então o roundtrip passa por
 *   `boolean → 0/1 → boolean`. Um `true === 1` em JS é `false`, então uma
 *   coluna mapeada como boolean (e o TypeORM faz isso se o schema mudar)
 *   devolveria `false` para sempre, sem erro em lugar nenhum.
 * - `toRow` fixa `id: 1`. Se `save` virasse `insert`, cada atualização
 *   criaria uma linha e `find` leria a primeira — a configuração antiga,
 *   para sempre, com 200 em toda resposta.
 */
describe("RN34 - TypeOrmAdminSettingsRepository", () => {
  let dataSource: DataSource;
  let repository: TypeOrmAdminSettingsRepository;

  const rows = () => dataSource.getRepository(AdminSettingsEntity);

  beforeEach(async () => {
    dataSource = await createTestDataSource();
    repository = new TypeOrmAdminSettingsRepository(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it("a migração de schema já semeia a linha singleton — find não devolve null", async () => {
    // A `AddAdminSettingsTable` faz CREATE **e** INSERT, e está em
    // `SCHEMA_MIGRATIONS` (a lista "só schema"). Efeito colateral: o ramo
    // `find() === null` de `GetAdminSettings` é inalcançável em qualquer banco
    // migrado, inclusive nos testes. Pinado aqui para que uma mudança nessa
    // migração apareça como quebra de contrato, não como código morto
    // descoberto por acaso.
    const found = await repository.find();

    expect(found).not.toBeNull();
    expect(found?.toDTO()).toEqual({
      macroBreakEnabled: true,
      macroLessonsThreshold: 3,
      macroBreakDurationMs: 10800000,
      microBlockDurationMs: 900000,
      microBreakDurationMs: 180000,
    });
  });

  it("roundtrip preserva os cinco campos, inclusive valores fora do default", async () => {
    const changed = AdminSettings.create({
      macroBreakEnabled: false,
      macroLessonsThreshold: 7,
      macroBreakDurationMs: 7200000,
      microBlockDurationMs: 600000,
      microBreakDurationMs: 90000,
    });

    await repository.save(changed);
    const found = await repository.find();

    expect(found?.toDTO()).toEqual(changed.toDTO());
  });

  it("macroBreakEnabled: false sobrevive ao ciclo boolean → 0/1 → boolean", async () => {
    // O `false` é o valor que o roundtrip pode perder: `0` lido de volta como
    // `0 === 1` dá `false` (certo), mas um mapeamento por truthiness invertido,
    // ou um `!!row.macroBreakEnabled` com coluna invertida, daria `true`.
    await repository.save(AdminSettings.create({ macroBreakEnabled: false }));

    const found = await repository.find();
    const raw = await rows().findOne({ where: { id: 1 } });

    expect(raw?.macroBreakEnabled).toBe(0);
    expect(found?.macroBreakEnabled).toBe(false);
  });

  it("save atualiza a linha existente em vez de inserir uma segunda", async () => {
    const before = await rows().count();

    await repository.save(AdminSettings.create({ macroLessonsThreshold: 5 }));
    await repository.save(AdminSettings.create({ macroLessonsThreshold: 6 }));

    expect(await rows().count()).toBe(before);
    expect((await repository.find())?.macroLessonsThreshold).toBe(6);
  });

  it("save cria o singleton quando a tabela está vazia", async () => {
    await rows().delete({ id: 1 });
    expect(await repository.find()).toBeNull();

    await repository.save(AdminSettings.create({ macroLessonsThreshold: 2 }));

    expect((await repository.find())?.macroLessonsThreshold).toBe(2);
    expect(await rows().count()).toBe(1);
  });

  it("find devolve null quando não há linha nenhuma", async () => {
    await rows().delete({ id: 1 });

    expect(await repository.find()).toBeNull();
  });

  it("a linha semeada é uma cópia de adaptiveParams, não uma referência", async () => {
    // Este teste registra o que a tabela **é** hoje: os valores de
    // `adaptiveParams` materializados no momento da migração. Mudar
    // `MACRO_LESSONS_THRESHOLD` no código não muda a linha — e, como nada
    // consome a linha, também não muda o comportamento (ver a dívida
    // registrada em `PracticePacing.test.ts`).
    const persisted = (await repository.find())?.macroLessonsThreshold;

    expect(persisted).toBe(3);
    // A igualdade com o parâmetro é o que *parece* de single source na prática. Se
    // alguém mudar o parâmetro sem versionar migração, esta asserção quebra
    // e aponta a segunda fonte de verdade em vez de deixá-la silenciosa.
    expect(persisted).toBe(adaptiveParams.MACRO_LESSONS_THRESHOLD);
  });
});
