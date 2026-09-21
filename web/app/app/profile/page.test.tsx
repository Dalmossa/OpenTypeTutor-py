import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { GetUserProgressDTO } from "@/models/progress";
import ProfilePage from "./page";

const user = {
  id: "u1",
  name: "Teste",
  email: "t@t.com",
  createdAt: "2026-09-01",
  activeLayout: "ABNT2",
  currentLevel: 3,
  timezone: "America/New_York",
};

const progress: GetUserProgressDTO = {
  currentLevel: 3,
  completedLessons: 12,
  lastCompletedAt: "2026-09-20",
  currentLesson: {
    id: "l7",
    level: 3,
    title: "Lição 7",
    content: "texto",
    targetKeys: [],
    difficulty: "GUIDED",
    type: "PRACTICE",
    layout: "ABNT2",
    pedagogicalPhase: "ACCENTUATION",
    lessonInPhase: 2,
  },
  levelCompletionRate: 0.6,
};

const mockControllers = {
  user: { updateLayout: vi.fn() },
  progress: { getProgress: vi.fn().mockResolvedValue(progress) },
};

vi.mock("@/controllers", () => ({
  createControllers: () => mockControllers,
}));

const mockUpdateLayout = vi
  .fn()
  .mockResolvedValue({
    userId: "u1",
    activeLayout: "US-INTERNATIONAL",
    currentLevel: 3,
  });

vi.mock("@/components/auth-provider", () => ({
  useAuth: () => ({
    user,
    accessToken: "token-abc",
    loading: false,
    refresh: vi.fn(),
    updateLayout: mockUpdateLayout,
  }),
}));

describe("ProfilePage (UI-UX-SRD §6.7)", () => {
  it("exibe dados da conta vindos do contexto de autenticação", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Teste")).toBeInTheDocument();
    expect(screen.getByText("t@t.com")).toBeInTheDocument();
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
    expect(screen.getByText("America/New_York")).toBeInTheDocument();
  });

  it("exibe a fase da jornada e as lições concluídas a partir do progresso", async () => {
    render(<ProfilePage />);
    await screen.findByText("Acentuação");
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("mostra na prévia a tecla ç do ABNT2 e permite trocar para US-INTERNATIONAL", async () => {
    render(<ProfilePage />);
    expect(mockControllers.progress.getProgress).toHaveBeenCalledWith(
      "token-abc",
    );

    const usOption = screen.getByRole("button", { name: /US-International/i });
    fireEvent.click(usOption);

    await waitFor(() => {
      expect(mockUpdateLayout).toHaveBeenCalledWith("US-INTERNATIONAL");
    });
    await waitFor(() => {
      expect(screen.queryByText("Salvando…")).toBeNull();
    });
  });

  it("não chama PATCH se o layout já é o ativo", () => {
    render(<ProfilePage />);
    const abnt2 = screen.getByRole("button", { name: /ABNT2/i });
    fireEvent.click(abnt2);
    expect(mockUpdateLayout).not.toHaveBeenCalled();
  });

  it("exibe mensagem de erro quando a troca de layout falha", async () => {
    mockUpdateLayout.mockRejectedValueOnce(new Error("falha"));
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole("button", { name: /US-International/i }));
    expect(
      await screen.findByText(
        "Não foi possível alterar o layout. Tente novamente.",
      ),
    ).toBeInTheDocument();
  });
});
