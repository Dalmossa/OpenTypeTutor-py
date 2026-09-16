const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SessionId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value.toLowerCase();
  }

  static create(value?: string): SessionId {
    if (value === undefined) {
      return new SessionId(crypto.randomUUID());
    }

    if (typeof value !== 'string' || value === '' || !UUID_REGEX.test(value)) {
      throw new Error('SessionId inválido');
    }

    return new SessionId(value);
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}