import { SessionId } from "../value-objects/SessionId.js";
import { Email } from "../value-objects/Email.js";

export type UserRole = "user" | "admin";

export interface UserProps {
  id?: SessionId;
  name: string;
  email: Email;
  passwordHash: string;
  createdAt?: Date;
  role?: UserRole;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: UserRole;
}

export class User {
  readonly id: SessionId;
  readonly name: string;
  readonly email: Email;
  readonly passwordHash: string;
  readonly createdAt: Date;
  readonly role: UserRole;

  private constructor(props: UserProps) {
    this.id = props.id ?? SessionId.create();
    this.name = props.name.trim();
    this.email = props.email;
    this.passwordHash = props.passwordHash;
    this.createdAt = props.createdAt ?? new Date();
    this.role = props.role ?? "user";
  }

  static create(props: UserProps): User {
    if (!props.name || !props.name.trim()) {
      throw new Error("Nome é obrigatório");
    }

    if (!props.passwordHash) {
      throw new Error("Password hash é obrigatório");
    }

    if (!(props.email instanceof Email)) {
      throw new Error("Email inválido");
    }

    return new User(props);
  }

  equals(other: User): boolean {
    return this.id.equals(other.id);
  }

  toDTO(): UserDTO {
    return {
      id: this.id.value,
      name: this.name,
      email: this.email.value,
      createdAt: this.createdAt.toISOString(),
      role: this.role,
    };
  }

  toJSON(): UserDTO {
    return this.toDTO();
  }
}
