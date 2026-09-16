import { SessionId } from '../value-objects/SessionId.js';
import { Layout } from '../value-objects/Layout.js';

export interface UserProfileProps {
  userId: SessionId;
  activeLayout?: Layout;
  currentLevel?: number;
}

export interface UserProfileDTO {
  userId: string;
  activeLayout: string;
  currentLevel: number;
}

export class UserProfile {
  readonly userId: SessionId;
  readonly activeLayout: Layout;
  readonly currentLevel: number;

  private constructor(props: UserProfileProps) {
    this.userId = props.userId;
    this.activeLayout = props.activeLayout ?? Layout.create('ABNT2');
    this.currentLevel = props.currentLevel ?? 1;

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

    return new UserProfile(props);
  }

  changeLayout(newLayout: Layout): UserProfile {
    if (!(newLayout instanceof Layout)) {
      throw new Error('Layout inválido');
    }
    return new UserProfile({
      userId: this.userId,
      activeLayout: newLayout,
      currentLevel: this.currentLevel,
    });
  }

  advanceLevel(): UserProfile {
    return new UserProfile({
      userId: this.userId,
      activeLayout: this.activeLayout,
      currentLevel: this.currentLevel + 1,
    });
  }

  setLevel(level: number): UserProfile {
    if (level < 1) {
      throw new Error('Nível deve ser maior ou igual a 1');
    }
    return new UserProfile({
      userId: this.userId,
      activeLayout: this.activeLayout,
      currentLevel: level,
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
    };
  }

  toJSON(): UserProfileDTO {
    return this.toDTO();
  }
}