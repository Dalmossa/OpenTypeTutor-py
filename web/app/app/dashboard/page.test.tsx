import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  GetDashboardHabitsResponseDTO,
  GetDashboardMasteryResponseDTO,
  GetDashboardProximityResponseDTO,
} from '@/models/dashboard';

const habits: GetDashboardHabitsResponseDTO = {
  kpis: {
    netWpm: 40.5,
    accuracy: 0.95,
    averageLatencyMs: 250,
    sessionsCompleted: 12,
    daysActive: 5,
    keysPracticed: 4,
  },
  trend: [
    { date: '2026-08-01', netWpm: 30, accuracy: 0.9, averageLatencyMs: 300, sessionsCompleted: 2 },
    { date: '2026-08-02', netWpm: 32, accuracy: 0.92, averageLatencyMs: 290, sessionsCompleted: 1 },
  ],
  heatmap: [{ logicalKey: 'a', count: 100, activeDays: 2 }],
};

const mastery: GetDashboardMasteryResponseDTO = {
  transitions: [{ logicalKey: 'a', date: '2026-08-02', from: 'LEARNING', to: 'MASTERED' }],
  countsByState: { UNKNOWN: 1, LEARNING: 1, CONSOLIDATING: 1, MASTERED: 1, WEAK: 0 },
};

const proximity: GetDashboardProximityResponseDTO = {
  keys: [
    { logicalKey: 'a', mpi: 0.75, band: 'próximo' },
    { logicalKey: 'q', mpi: 0.1, band: 'longe' },
  ],
};

const mockDashboard = {
  getHabits: vi.fn().mockResolvedValue(habits),
  getMastery: vi.fn().mockResolvedValue(mastery),
  getProximity: vi.fn().mockResolvedValue(proximity),
};

vi.mock('@/controllers', () => ({
  createControllers: () => ({ dashboard: mockDashboard }),
}));

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Teste', email: 't@t.com', createdAt: '', activeLayout: 'ABNT2', currentLevel: 1 },
    accessToken: 'token-abc',
    loading: false,
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({
    children,
  }: {
    children?: import('react').ReactNode;
  }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children?: import('react').ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

import DashboardPage from './page';

describe('DashboardPage (TASK-098, 8 widgets)', () => {
  beforeEach(() => {
    mockDashboard.getHabits.mockClear();
    mockDashboard.getMastery.mockClear();
    mockDashboard.getProximity.mockClear();
  });

  it('renderiza os 6 cards de KPI (janela 30d)', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Indicadores')).toBeInTheDocument());
    expect(screen.getByText('PPM médio')).toBeInTheDocument();
    expect(screen.getByText('40.5')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
    expect(screen.getByText('250 ms')).toBeInTheDocument();
    expect(screen.getByText('Sessões concluídas')).toBeInTheDocument();
    expect(screen.getByText('Dias ativos')).toBeInTheDocument();
    expect(screen.getByText('Teclas praticadas')).toBeInTheDocument();
  });

  it('renderiza as 3 linhas de evolução (PPM, precisão, latência) com seletor 7/30/90', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Evolução diária (RN35)')).toBeInTheDocument());
    expect(screen.getByText('PPM (palavras por minuto)')).toBeInTheDocument();
    expect(screen.getByText('Precisão', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('Latência média', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7d' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '30d' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '90d' })).toBeInTheDocument();
  });

  it('renderiza o teclado heatmap (RN34) com as teclas praticadas', async () => {
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText('Intensidade de prática por tecla (RN34 · janela 7d)')).toBeInTheDocument(),
    );
    expect(screen.getByTestId('heat-key-a')).toHaveAttribute(
      'aria-label',
      '100 acionamentos · 2 dias ativos',
    );
  });

  it('renderiza a lista de proximidade (RN36) com faixa + MPI', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Proximidade à maestria (RN36)')).toBeInTheDocument());
    expect(screen.getByText('próximo')).toBeInTheDocument();
    expect(screen.getByText('longe')).toBeInTheDocument();
  });

  it('renderiza a distribuição de estados e a timeline de transições', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(screen.getByText('Distribuição de estados')).toBeInTheDocument());
    // "Dominado" aparece legitimanmente em dois widgets (estado MASTERED na
    // distribuição e na transição → MASTERED), então usamos getAllByText.
    expect(screen.getAllByText('Dominado').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Linha do tempo de maestria (RN36)')).toBeInTheDocument();
  });

  it('chama as 3 rotas do dashboard via controller com o token', async () => {
    render(<DashboardPage />);

    await waitFor(() => expect(mockDashboard.getHabits).toHaveBeenCalledWith('token-abc'));
    await waitFor(() => expect(mockDashboard.getMastery).toHaveBeenCalledWith('token-abc'));
    await waitFor(() => expect(mockDashboard.getProximity).toHaveBeenCalledWith('token-abc'));
  });
});