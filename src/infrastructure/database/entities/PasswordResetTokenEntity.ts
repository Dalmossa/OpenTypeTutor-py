import { EntitySchema } from "typeorm";

export interface PasswordResetTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

// Token de recuperação de senha (uso único, expira em 1h)
export const PasswordResetTokenEntity = new EntitySchema<PasswordResetTokenRow>(
  {
    name: "PasswordResetTokenEntity",
    tableName: "password_reset_tokens",
    columns: {
      id: { type: "text", primary: true },
      userId: { type: "text", nullable: false },
      tokenHash: { type: "text", nullable: false },
      expiresAt: { type: "text", nullable: false },
      usedAt: { type: "text", nullable: true },
      createdAt: { type: "text", nullable: false },
    },
    indices: [
      { name: "IDX_password_reset_tokens_userId", columns: ["userId"] },
      { name: "IDX_password_reset_tokens_expiresAt", columns: ["expiresAt"] },
    ],
  },
);
