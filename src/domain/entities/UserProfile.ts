import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';
import { Timezone, DEFAULT_TIMEZONE } from '../value-objects/Timezone.js';

export interface UserProfileProps {
  userId: SessionId;
  activeLayout?: Layout;
  currentLevel?: number;
  timezone?: string; // IANA (RN37), default America/Sao_Paulo
}

export interface UserProfileDTO {
  userId: string;
  activeLayout: string;
  currentLevel: number;
  timezone: string;
}

export class UserProfile {
  readonly userId: SessionId;
  readonly activeLayout: Layout;
  readonly currentLevel: number;
  readonly timezone: string;

  private constructor(props: UserProfileProps) {
    this.userId = props.userId;
    this.activeLayout = props.activeLayout ?? Layout.create('ABNT2');
    this.currentLevel = props.currentLevel ?? 1;
    // RN37 - default do produto: America/Sao_Paulo
    this.timezone = props.timezone ?? DEFAULT_TIMEZONE;

    if (this.currentLevel < 1) {
      throw new Error('Nível deve ser maior ou igual a 1');
    }
  }

  static create(props: UserProfileProps): UserProfile {
    if (!(props.userId instanceof SessionId)) {
      throw new Error('userId inválido');
    }

    if (props.activeLayout !== undefined && !(props.activeLayout instanceof Layout)) {
      throw new Error('Layout inválido');
    }

    if (props.timezone !== undefined) {
      Timezone.create({ value: props.timezone });
    }

    return new UserProfile(props);
  }

  changeLayout(newLayout: Layout): UserProfile {
    if (!(newLayout instanceof Layout)) {
      throw new Error('Layout inválido');
    }
    return UserProfile.create({
      userId: this.userId,
      activeLayout: newLayout,
      currentLevel: this.currentLevel,
      timezone: this.timezone,
    });
  }

  advanceLevel(): UserProfile {
    return UserProfile.create({
      userId: this.userId,
      activeLayout: this.activeLayout,
      currentLevel: this.currentLevel + 1,
      timezone: this.timezone,
    });
  }

  setLevel(level: number): UserProfile {
    if (level < 1) {
      throw new Error('Nível deve ser maior ou igual a 1');
    }
    return UserProfile.create({
      userId: this.userId,
      activeLayout: this.activeLayout,
      currentLevel: level,
      timezone: this.timezone,
    });
  }

  // RN37 - atualiza o fuso horário do usuário (nome IANA)
  withTimezone(timezone: string): UserProfile {
    Timezone.create({ value: timezone });
    return UserProfile.create({
      userId: this.userId,
      activeLayout: this.activeLayout,
      currentLevel: this.currentLevel,
      timezone,
    });
  }

  equals(other: UserProfile): boolean {
    return this.userId.equals(other.userId);
  }

  toDTO(): UserProfileDTO {
    return {
      userId: this.userId.value,
      activeLayout: this.activeLayout.value,
      currentLevel: this.currentLevel,
      timezone: this.timezone,
    };
  }

  toJSON(): UserProfileDTO {
    return this.toDTO();
  }
}