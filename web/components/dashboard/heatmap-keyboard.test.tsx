import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HeatmapKeyboard } from '@/components/dashboard/heatmap-keyboard';

describe('HeatmapKeyboard (RN34)', () => {
  it('mostra contagem + dias ativos no título das teclas praticadas', () => {
    render(
      <HeatmapKeyboard
        layout="ABNT2"
        heatmap={[{ logicalKey: 'a', count: 100, activeDays: 2 }]}
      />,
    );

    expect(screen.getByTestId('heat-key-a')).toHaveAttribute(
      'aria-label',
      '100 acionamentos · 2 dias ativos',
    );
  });

  it('marca teclas sem prática com o título neutro', () => {
    render(<HeatmapKeyboard layout="ABNT2" heatmap={[]} />);

    expect(screen.getByTestId('heat-key-q')).toHaveAttribute(
      'aria-label',
      'Tecla sem prática na janela',
    );
  });
});