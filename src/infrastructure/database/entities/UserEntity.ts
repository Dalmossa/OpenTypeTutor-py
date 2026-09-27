import { EntitySchema } from "typeorm";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  role: string;
}

export const UserEntity = new EntitySchema<UserRow>({
  name: "UserEntity",
  tableName: "users",
  columns: {
    id: { type: "text", primary: true },
    name: { type: "text", nullable: false },
    email: { type: "text", nullable: false, unique: true },
    passwordHash: { type: "text", nullable: false },
    createdAt: { type: "text", nullable: false },
    role: { type: "text", nullable: false, default: "user" },
  },
});
