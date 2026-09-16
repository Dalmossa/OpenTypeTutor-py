import { SessionId } from '../value-objects/SessionId.js';
import { PedagogicalPhase } from '../value-objects/PedagogicalPhase.js';

export interface ProgressCardProps {
  id?: SessionId;
  userId: SessionId;
  date: Date;
  phase: PedagogicalPhase;
  lessonNumber: number;
  insecureKeys: string[];
  discomfortReported: boolean;
  discomfortDetail?: string;
  nextSessionNote: string;
  previousBackspaceCount: number;
  currentBackspaceCount: number;
}

export interface ProgressCardDTO {
  id: string;
  userId: string;
  date: string;
  phase: string;
  lessonNumber: number;
  insecureKeys: string[];
  discomfortReported: boolean;
  discomfortDetail: string | null;
  nextSessionNote: string;
  previousBackspaceCount: number;
  currentBackspaceCount: number;
}

interface ProgressCardInternalProps {
  id: SessionId;
  userId: SessionId;
  date: Date;
  phase: PedagogicalPhase;
  lessonNumber: number;
  insecureKeys: string[];
  discomfortReported: boolean;
  discomfortDetail: string | null;
  nextSessionNote: string;
  previousBackspaceCount: number;
  currentBackspaceCount: number;
}

export class ProgressCard {
  readonly id: SessionId;
  readonly userId: SessionId;
  readonly date: Date;
  readonly phase: PedagogicalPhase;
  readonly lessonNumber: number;
  readonly insecureKeys: string[];
  readonly discomfortReported: boolean;
  readonly discomfortDetail: string | null;
  readonly nextSessionNote: string;
  readonly previousBackspaceCount: number;
  readonly currentBackspaceCount: number;

  private constructor(props: ProgressCardInternalProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.date = props.date;
    this.phase = props.phase;
    this.lessonNumber = props.lessonNumber;
    this.insecureKeys = [...props.insecureKeys];
    this.discomfortReported = props.discomfortReported;
    this.discomfortDetail = props.discomfortDetail;
    this.nextSessionNote = props.nextSessionNote;
    this.previousBackspaceCount = props.previousBackspaceCount;
    this.currentBackspaceCount = props.currentBackspaceCount;
  }

  static create(props: ProgressCardProps): ProgressCard {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    if (!(props.phase instanceof PedagogicalPhase)) {
      throw new Error('Fase pedagógica inválida');
    }

    if (props.lessonNumber < 1) {
      throw new Error('Número da lição deve ser maior ou igual a 1');
    }

    if (props.previousBackspaceCount < 0) {
      throw new Error('Contagem anterior de backspaces não pode ser negativa');
    }

    if (props.currentBackspaceCount < 0) {
      throw new Error('Contagem atual de backspaces não pode ser negativa');
    }

    return new ProgressCard({
      id: props.id ?? SessionId.create(),
      userId: props.userId,
      date: props.date,
      phase: props.phase,
      lessonNumber: props.lessonNumber,
      insecureKeys: [...props.insecureKeys],
      discomfortReported: props.discomfortReported,
      discomfortDetail: props.discomfortDetail ?? null,
      nextSessionNote: props.nextSessionNote,
      previousBackspaceCount: props.previousBackspaceCount,
      currentBackspaceCount: props.currentBackspaceCount,
    });
  }

  static createInitial(userId: SessionId): ProgressCard {
    return ProgressCard.create({
      userId,
      date: new Date(),
      phase: PedagogicalPhase.create('ERGONOMICS_SETUP'),
      lessonNumber: 1,
      insecureKeys: [],
      discomfortReported: false,
      nextSessionNote: 'Iniciar check-in ergonômico e Lição 1 (asdfg)',
      previousBackspaceCount: 0,
      currentBackspaceCount: 0,
    });
  }

  advanceLesson(nextLessonNumber: number, nextPhase: PedagogicalPhase, backspaceCount: number, insecureKeys: string[], nextSessionNote: string): ProgressCard {
    return new ProgressCard({
      ...this.toInternalProps(),
      id: SessionId.create(),
      date: new Date(),
      phase: nextPhase,
      lessonNumber: nextLessonNumber,
      insecureKeys: [...insecureKeys],
      previousBackspaceCount: this.currentBackspaceCount,
      currentBackspaceCount: backspaceCount,
      nextSessionNote,
    });
  }

  repeatLesson(backspaceCount: number, insecureKeys: string[], discomfortReported: boolean, discomfortDetail: string | undefined, nextSessionNote: string): ProgressCard {
    return new ProgressCard({
      ...this.toInternalProps(),
      id: SessionId.create(),
      date: new Date(),
      insecureKeys: [...insecureKeys],
      discomfortReported,
      discomfortDetail: discomfortDetail ?? null,
      previousBackspaceCount: this.currentBackspaceCount,
      currentBackspaceCount: backspaceCount,
      nextSessionNote,
    });
  }

  // RN26 - Critério de avanço: (a) backspaces ≤ tentativa anterior, (b) sem desconforto, (c) não olha teclado
  canAdvance(confirmsNoLookingAtKeyboard: boolean): boolean {
    const conditionA = this.currentBackspaceCount <= this.previousBackspaceCount;
    const conditionB = !this.discomfortReported;
    const conditionC = confirmsNoLookingAtKeyboard;
    return conditionA && conditionB && conditionC;
  }

  // RN29 - Deve variar exercício antes de repetir idêntico
  // Retorna true se qualquer critério de avanço falhar (exceto desconforto, que é tratado pela engine)
  shouldVaryExercise(confirmsNoLookingAtKeyboard: boolean): boolean {
    const conditionA = this.currentBackspaceCount <= this.previousBackspaceCount;
    const conditionC = confirmsNoLookingAtKeyboard;
    // Se desconforto foi relatado, a engine já trata como pause_discomfort
    // Aqui verificamos apenas as condições A e C
    return !(conditionA && conditionC);
  }

  toInternalProps(): ProgressCardInternalProps {
    return {
      id: this.id,
      userId: this.userId,
      date: this.date,
      phase: this.phase,
      lessonNumber: this.lessonNumber,
      insecureKeys: [...this.insecureKeys],
      discomfortReported: this.discomfortReported,
      discomfortDetail: this.discomfortDetail,
      nextSessionNote: this.nextSessionNote,
      previousBackspaceCount: this.previousBackspaceCount,
      currentBackspaceCount: this.currentBackspaceCount,
    };
  }

  equals(other: ProgressCard): boolean {
    return this.id.equals(other.id);
  }

  toDTO(): ProgressCardDTO {
    return {
      id: this.id.value,
      userId: this.userId.value,
      date: this.date.toISOString(),
      phase: this.phase.value,
      lessonNumber: this.lessonNumber,
      insecureKeys: [...this.insecureKeys],
      discomfortReported: this.discomfortReported,
      discomfortDetail: this.discomfortDetail,
      nextSessionNote: this.nextSessionNote,
      previousBackspaceCount: this.previousBackspaceCount,
      currentBackspaceCount: this.currentBackspaceCount,
    };
  }

  toJSON(): ProgressCardDTO {
    return this.toDTO();
  }

  // Formato "Cartão de Progresso" para colar na próxima sessão (Prompt §43-50)
  toProgressCardString(): string {
    const lines = [
      `CARTÃO DE PROGRESSO — ${this.date.toLocaleDateString('pt-BR')}`,
      `Fase: ${this.phase.value} | Lição: ${String(this.lessonNumber)}`,
      `Teclas ainda inseguras: ${this.insecureKeys.length > 0 ? this.insecureKeys.join(', ') : 'nenhuma'}`,
      `Desconforto relatado nesta sessão: ${this.discomfortReported ? `sim — ${this.discomfortDetail ?? 'não especificado'}` : 'não'}`,
      `Observação para a próxima sessão: ${this.nextSessionNote}`,
    ];
    return lines.join('\n');
  }
}