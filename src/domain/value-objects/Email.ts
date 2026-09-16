const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): Email {
    if (typeof value !== 'string') {
      throw new Error('Email inválido');
    }

    const normalized = value.trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error('Email inválido');
    }

    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}