import { describe, it, expect, beforeEach } from "vitest";
import { GetAdminSettings } from "./GetAdminSettings.js";
import { UpdateAdminSettings } from "./UpdateAdminSettings.js";
import { AdminSettings } from "../../domain/entities/AdminSettings.js";
import { adaptiveParams } from "../../domain/config/adaptiveParams.js";
import type { IAdminSettingsRepository } from "../../domain/repositories/IAdminSettingsRepository.js";
import type { UpdateAdminSettingsRequestDTO } from "../dtos/AdminSettingsDTOs.js";

/**
 * RN34 - configurações administrativas.
 *
 * Estes dois casos de uso nasceram registrados só no composition root Express e
 * respondiam 404 no app de runtime (ADR-024). A cobertura que existia era de
 * *wiring*, com fakes injetados por `overrides`: provava que a rota estava
 * montada, nunca o comportamento. `GetAdminSettings` não aparecia em nenhum
 * `.test.ts` do repositório.
 *
 * O fake abaixo guarda o que foi salvo, porque o defeito que estes testes
 * precisam pegar não é "a rota responde", é "a rota responde com o valor
 * errado" — o que só aparece comparando o que entrou com o que saiu.
 */
class FakeAdminSettingsRepository implements IAdminSettingsRepository {
  stored: AdminSettings | null = null;
  saves: AdminSettings[] = [];

  // `await Promise.resolve()` nos dois: o port é assíncrono por contrato, e um
  // `async` sem `await` é `require-await` (mesmo truque do
  // `InMemoryPracticePacingRepository`).
  async find(): Promise<AdminSettings | null> {
    await Promise.resolve();
    return this.stored;
  }

  async save(settings: AdminSettings): Promise<void> {
    await Promise.resolve();
    this.stored = settings;
    this.saves.push(settings);
  }
}

const CUSTOM: UpdateAdminSettingsRequestDTO = {
  macroBreakEnabled: false,
  macroLessonsThreshold: 7,
  macroBreakDurationMs: 7200000,
  microBlockDurationMs: 600000,
  microBreakDurationMs: 90000,
};

/**
 * `adaptiveParams` é `as const`: o compilador trata as propriedades como
 * readonly **e** estreita cada uma para o literal (`3`, não `number`). Em
 * runtime é um objeto comum, não congelado — é isso que permite mover o
 * parâmetro central e observar quem o lê. O cast abaixo é o que dá essa
 * permissão; alargar só o campo que o teste move evita mexer nos outros.
 */
const mutableParams = adaptiveParams as {
  MACRO_LESSONS_THRESHOLD: number;
};

describe("RN34 - GetAdminSettings", () => {
  let repository: FakeAdminSettingsRepository;
  let getAdminSettings: GetAdminSettings;

  beforeEach(() => {
    repository = new FakeAdminSettingsRepository();
    getAdminSettings = new GetAdminSettings(repository);
  });

  it("devolve a configuração persistida, campo a campo", async () => {
    repository.stored = AdminSettings.create(CUSTOM);

    const dto = await getAdminSettings.execute();

    expect(dto).toEqual({
      macroBreakEnabled: false,
      macroLessonsThreshold: 7,
      macroBreakDurationMs: 7200000,
      microBlockDurationMs: 600000,
      microBreakDurationMs: 90000,
    });
  });

  it("a leitura não grava nada — GET não tem efeito colateral", async () => {
    repository.stored = AdminSettings.create(CUSTOM);

    await getAdminSettings.execute();

    expect(repository.saves).toHaveLength(0);
  });

  it("sem linha persistida, o fallback deriva de adaptiveParams e não de literais", async () => {
    // Este é o teste que pega a divergência de fonte única. A versão anterior
    // do caso de uso repetia os 5 valores (`true, 3, 10800000, 900000, 180000`)
    // como literais — e como os literais eram *iguais* aos do parâmetro, nenhum
    // teste de igualdade os pegaria. A forma de tornar a duplicação observável
    // é mover o parâmetro central e exigir que a resposta o siga.
    const original = adaptiveParams.MACRO_LESSONS_THRESHOLD;
    mutableParams.MACRO_LESSONS_THRESHOLD = 11;
    try {
      const dto = await getAdminSettings.execute();

      expect(dto.macroLessonsThreshold).toBe(11);
      expect(dto).toEqual(AdminSettings.create().toDTO());
    } finally {
      // `adaptiveParams` é um singleton de módulo: sem restaurar aqui, uma
      // asserção que falhe vazaria o valor 11 para os outros arquivos do worker.
      mutableParams.MACRO_LESSONS_THRESHOLD = original;
    }
  });
});

describe("RN34 - UpdateAdminSettings", () => {
  let repository: FakeAdminSettingsRepository;
  let updateAdminSettings: UpdateAdminSettings;

  beforeEach(() => {
    repository = new FakeAdminSettingsRepository();
    updateAdminSettings = new UpdateAdminSettings(repository);
  });

  it("sem linha persistida, cria a partir dos defaults de adaptiveParams e persiste", async () => {
    const dto = await updateAdminSettings.execute({ macroLessonsThreshold: 5 });

    expect(repository.saves).toHaveLength(1);
    expect(dto.macroLessonsThreshold).toBe(5);
    // Os campos não enviados vêm do default, não de zero/undefined.
    expect(dto.macroBreakEnabled).toBe(adaptiveParams.MACRO_BREAK_ENABLED);
    expect(dto.macroBreakDurationMs).toBe(
      adaptiveParams.MACRO_BREAK_DURATION_MS,
    );
    expect(dto.microBlockDurationMs).toBe(
      adaptiveParams.PRACTICE_BLOCK_DURATION_MS,
    );
    expect(dto.microBreakDurationMs).toBe(adaptiveParams.MIN_BREAK_DURATION_MS);
  });

  it("update parcial preserva os campos ausentes — PATCH não é PUT", async () => {
    repository.stored = AdminSettings.create(CUSTOM);

    const dto = await updateAdminSettings.execute({ macroLessonsThreshold: 9 });

    expect(dto.macroLessonsThreshold).toBe(9);
    expect(dto.macroBreakDurationMs).toBe(7200000);
    expect(dto.microBlockDurationMs).toBe(600000);
    expect(dto.microBreakDurationMs).toBe(90000);
  });

  it("persiste a entidade e devolve o DTO da mesma entidade", async () => {
    const dto = await updateAdminSettings.execute({ macroLessonsThreshold: 4 });

    // Se save() e o DTO viessem de cópias diferentes, a API confirmaria uma
    // escrita que o banco não tem — o mesmo defeito de "200 sem fazer nada"
    // que o ADR-024 registrou, agora dentro do caso de uso.
    //
    // A anotação explícita não é enfeite: o TypeScript estreita `stored` para
    // `null` no inicializador do campo e não revalida esse estreitamento depois
    // de uma chamada `await`, então sem ela o `?.` é lido como código morto
    // (`no-unnecessary-condition`) — e remover o `?.` esconderia justamente o
    // caso que o teste existe para provar.
    const persisted: AdminSettings | null = repository.stored;
    expect(persisted?.toDTO()).toEqual(dto);
  });

  it("macroBreakEnabled: false é um valor, não ausência — não volta ao anterior", async () => {
    repository.stored = AdminSettings.create({
      ...CUSTOM,
      macroBreakEnabled: true,
    });

    const dto = await updateAdminSettings.execute({ macroBreakEnabled: false });

    // `||` em vez de `??` no `update` da entidade devolveria `true` aqui.
    // Sem `?.` porque `stored` foi atribuído duas linhas acima: o narrowing
    // para `AdminSettings` é exato, e o `?.` aqui só mascararia o caso de o
    // caso de uso não ter gravado nada.
    expect(dto.macroBreakEnabled).toBe(false);
    expect(repository.stored.macroBreakEnabled).toBe(false);
  });

  it("update vazio {} é no-op: regrava os mesmos valores, sem zerar nada", async () => {
    repository.stored = AdminSettings.create(CUSTOM);

    const dto = await updateAdminSettings.execute({});

    expect(dto).toEqual(AdminSettings.create(CUSTOM).toDTO());
    expect(repository.saves).toHaveLength(1);
  });
});
