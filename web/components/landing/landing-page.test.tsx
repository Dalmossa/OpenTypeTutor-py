import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LandingPage } from '@/components/landing/landing-page';

describe('LandingPage (UI-UX-SRD §4)', () => {
  it('mostra hero com headline e CTAs principais', () => {
    render(<LandingPage authenticated={false} />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Digite melhor. Aprenda pelo desempenho observado.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: 'Começar agora' }).every((link) => link.getAttribute('href') === '/register'),
    ).toBe(true);
    expect(screen.getAllByRole('link', { name: 'Entrar' }).every((link) => link.getAttribute('href') === '/login')).toBe(
      true,
    );
  });

  it('apresenta as seções O que é, Como funciona e Métricas (RN36)', () => {
    render(<LandingPage authenticated={false} />);

    expect(screen.getByRole('heading', { name: 'O que é o OpenType Tutor?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Como funciona?' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acompanhe por números claros' })).toBeInTheDocument();
    expect(screen.getAllByText('PPM').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Proximidade da maestria')).toBeInTheDocument();
  });

  it('exibe a jornada das 7 fases (RN25) com nomes pt-BR', () => {
    render(<LandingPage authenticated={false} />);

    expect(screen.getByRole('heading', { name: 'A jornada de aprendizagem' })).toBeInTheDocument();
    for (const phase of [
      'Ergonomia',
      'Linha Inicial',
      'Linhas Superior e Inferior',
      'Fixação de Palavras',
      'Acentuação',
      'Textos Longos',
      'Teclado Numérico',
    ]) {
      expect(screen.getByRole('heading', { name: phase })).toBeInTheDocument();
    }
  });

  it('apresenta a seção Sobre o OpenType Tutor (não "Quem Somos")', () => {
    render(<LandingPage authenticated={false} />);

    expect(screen.getByText('Sobre o OpenType Tutor')).toBeInTheDocument();
    expect(screen.queryByText('Quem Somos')).not.toBeInTheDocument();
  });
});