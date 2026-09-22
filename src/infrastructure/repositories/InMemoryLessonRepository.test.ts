import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLessonRepository } from "./InMemoryLessonRepository.js";
import { Lesson } from "../../domain/entities/Lesson.js";
import { SessionId } from "../../domain/value-objects/SessionId.js";
import { Layout } from "../../domain/value-objects/Layout.js";

const LESSON_ID = "550e8400-e29b-41d4-a716-446655440001";
const LAYOUT = Layout.create("ABNT2");
const OTHER_LAYOUT = Layout.create("US-INTERNATIONAL");

function makeLesson(
  id?: SessionId,
  level = 1,
  type: Lesson["type"] = "INTRODUCTION",
  layout: Layout = LAYOUT,
): Lesson {
  const props: Parameters<typeof Lesson.create>[0] = {
    level,
    title: `Lesson ${String(level)}`,
    content: "Lesson content",
    targetKeys: ["a", "s", "d", "f"],
    difficulty: "GUIDED",
    type,
    layout,
  };
  if (id !== undefined) {
    props.id = id;
  }
  return Lesson.create(props);
}

describe("InMemoryLessonRepository", () => {
  let repository: InMemoryLessonRepository;

  beforeEach(() => {
    repository = new InMemoryLessonRepository();
  });

  it("retorna null quando não existe lição", async () => {
    const lesson = await repository.findById(SessionId.create(LESSON_ID));
    expect(lesson).toBeNull();
  });

  it("salva e recupera lição por id", async () => {
    const lesson = makeLesson();
    await repository.save(lesson);

    const found = await repository.findById(lesson.id);
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(lesson.id.value);
    expect(found?.title).toBe(lesson.title);
    expect(found?.level).toBe(lesson.level);
    expect(found?.layout.equals(lesson.layout)).toBe(true);
  });

  it("findByLevelAndLayout retorna lições do nível e layout", async () => {
    await repository.save(makeLesson(undefined, 1, "INTRODUCTION", LAYOUT));
    await repository.save(makeLesson(undefined, 1, "PRACTICE", LAYOUT));
    await repository.save(makeLesson(undefined, 2, "INTRODUCTION", LAYOUT));
    await repository.save(
      makeLesson(undefined, 1, "INTRODUCTION", OTHER_LAYOUT),
    );

    const level1Abnt2 = await repository.findByLevelAndLayout(1, LAYOUT);
    expect(level1Abnt2).toHaveLength(2);

    const level2Abnt2 = await repository.findByLevelAndLayout(2, LAYOUT);
    expect(level2Abnt2).toHaveLength(1);

    const level1Us = await repository.findByLevelAndLayout(1, OTHER_LAYOUT);
    expect(level1Us).toHaveLength(1);
  });

  it("findByLevelAndTypeAndLayout retorna lições filtradas por tipo", async () => {
    await repository.save(makeLesson(undefined, 1, "INTRODUCTION", LAYOUT));
    await repository.save(makeLesson(undefined, 1, "PRACTICE", LAYOUT));
    await repository.save(makeLesson(undefined, 1, "REINFORCEMENT", LAYOUT));

    const intro = await repository.findByLevelAndTypeAndLayout(
      1,
      "INTRODUCTION",
      LAYOUT,
    );
    expect(intro).toHaveLength(1);
    const introLesson = intro[0] as Lesson;
    expect(introLesson.type).toBe("INTRODUCTION");

    const practice = await repository.findByLevelAndTypeAndLayout(
      1,
      "PRACTICE",
      LAYOUT,
    );
    expect(practice).toHaveLength(1);
    const practiceLesson = practice[0] as Lesson;
    expect(practiceLesson.type).toBe("PRACTICE");
  });

  it("findByLevelAndTypeAndLayout retorna array vazio para tipo inexistente", async () => {
    await repository.save(makeLesson(undefined, 1, "INTRODUCTION", LAYOUT));

    const result = await repository.findByLevelAndTypeAndLayout(
      1,
      "ASSESSMENT",
      LAYOUT,
    );
    expect(result).toHaveLength(0);
  });

  it("findAll retorna todas as lições", async () => {
    await repository.save(makeLesson(undefined, 1, "INTRODUCTION", LAYOUT));
    await repository.save(makeLesson(undefined, 2, "PRACTICE", LAYOUT));
    await repository.save(
      makeLesson(undefined, 1, "INTRODUCTION", OTHER_LAYOUT),
    );

    const all = await repository.findAll();
    expect(all).toHaveLength(3);
  });

  it("clear remove todas as lições", async () => {
    await repository.save(makeLesson());
    await repository.save(makeLesson(undefined, 2, "PRACTICE", OTHER_LAYOUT));

    repository.clear();

    expect(await repository.findAll()).toHaveLength(0);
    expect(repository.getAll()).toHaveLength(0);
  });

  it("getAll retorna todas as lições salvas", async () => {
    await repository.save(makeLesson());
    await repository.save(makeLesson(undefined, 2, "PRACTICE", OTHER_LAYOUT));

    const all = repository.getAll();
    expect(all).toHaveLength(2);
  });

  it("isola lições por layout", async () => {
    await repository.save(makeLesson(undefined, 1, "INTRODUCTION", LAYOUT));
    await repository.save(
      makeLesson(undefined, 1, "INTRODUCTION", OTHER_LAYOUT),
    );

    const abnt2 = await repository.findByLevelAndLayout(1, LAYOUT);
    const us = await repository.findByLevelAndLayout(1, OTHER_LAYOUT);

    expect(abnt2).toHaveLength(1);
    expect(us).toHaveLength(1);
    const abnt2Lesson = abnt2[0] as Lesson;
    const usLesson = us[0] as Lesson;
    expect(abnt2Lesson.layout.value).toBe("ABNT2");
    expect(usLesson.layout.value).toBe("US-INTERNATIONAL");
  });
});
