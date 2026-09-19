import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import type { MasteryState } from './KeyPerformance.js';

export interface KeyMasteryTransitionProps {
  userId: SessionId;
  logicalKey: string;
  layout: Layout;
  date: string; // YYYY-MM-DD local do usuário (RN37)
  from: MasteryState;
  to: MasteryState;
}

export interface KeyMasteryTransitionDTO {
  userId: string;
  logicalKey: string;
  layout: string;
  date: string;
  from: MasteryState;
  to: MasteryState;
}

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MASTERY_STATES: readonly MasteryState[] = [
  'UNKNOWN',
  'LEARNING',
  'CONSOLIDATING',
  'MASTERED',
  'WEAK',
];

// Registra quando o masteryState de uma tecla muda (RN09/RN10) ao fim de uma sessão —
// alimenta a timeline do dashboard sem varrer sessões por request (ADR-020).
export class KeyMasteryTransition {
  readonly userId: SessionId;
  readonly logicalKey: string;
  readonly layout: Layout;
  readonly date: string;
  readonly from: MasteryState;
  readonly to: MasteryState;

  private constructor(props: KeyMasteryTransitionProps) {
    this.userId = props.userId;
    this.logicalKey = props.logicalKey;
    this.layout = props.layout;
    this.date = props.date;
    this.from = props.from;
    this.to = props.to;
  }

  static create(props: KeyMasteryTransitionProps): KeyMasteryTransition {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }
    if (!(props.layout instanceof Layout)) {
      throw new Error('Layout inválido');
    }
    if (!props.logicalKey || props.logicalKey.length === 0) {
      throw new Error('logicalKey é obrigatório');
    }
    if (!LOCAL_DATE_PATTERN.test(props.date)) {
      throw new Error('date deve ser um dia calendário local YYYY-MM-DD (RN37)');
    }
    if (!MASTERY_STATES.includes(props.from) || !MASTERY_STATES.includes(props.to)) {
      throw new Error('masteryState inválido');
    }
    if (props.from === props.to) {
      throw new Error('Transição deve mudar o masteryState (from !== to)');
    }

    return new KeyMasteryTransition(props);
  }

  toDTO(): KeyMasteryTransitionDTO {
    return {
      userId: this.userId.value,
      logicalKey: this.logicalKey,
      layout: this.layout.value,
      date: this.date,
      from: this.from,
      to: this.to,
    };
  }

  toJSON(): KeyMasteryTransitionDTO {
    return this.toDTO();
  }
}