import { describe, expect, it, vi } from "vitest";

import type { ApiClient } from "@/services/api-client";
import { UserController } from "./user-controller";

function makeApiClient(): {
  getMe: ReturnType<typeof vi.fn>;
  updateLayout: ReturnType<typeof vi.fn>;
} {
  return {
    getMe: vi.fn(),
    updateLayout: vi.fn(),
  };
}

describe("UserController (UI-UX-SRD §6.7, TASK-057)", () => {
  it("delega getSession para GET /users/me com o token", async () => {
    const api = makeApiClient();
    const me = {
      id: "u1",
      name: "Teste",
      email: "t@t.com",
      createdAt: "2026-09-01",
      activeLayout: "ABNT2",
      currentLevel: 1,
    };
    api.getMe.mockResolvedValue(me);

    const controller = new UserController(api as unknown as ApiClient);
    await expect(controller.getSession("token-abc")).resolves.toEqual(me);
    expect(api.getMe).toHaveBeenCalledWith("token-abc");
  });

  it("delega updateLayout para PATCH /users/me com layout e token", async () => {
    const api = makeApiClient();
    const updated = {
      userId: "u1",
      activeLayout: "US-INTERNATIONAL",
      currentLevel: 1,
    };
    api.updateLayout.mockResolvedValue(updated);

    const controller = new UserController(api as unknown as ApiClient);
    await expect(
      controller.updateLayout("US-INTERNATIONAL", "token-abc"),
    ).resolves.toEqual(updated);
    expect(api.updateLayout).toHaveBeenCalledWith(
      "US-INTERNATIONAL",
      "token-abc",
    );
  });
});
