import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ThemeProvider, THEME_STORAGE_KEY } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';

function renderToggle(): void {
  render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    delete document.documentElement.dataset.theme;
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  });

  it('inicia em dark (default) com aria-label para ativar o claro', () => {
    renderToggle();
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
  });

  it('alterna data-theme no DocumentElement e persiste no localStorage', () => {
    renderToggle();
    const button = screen.getByRole('button', { name: 'Ativar tema claro' });

    fireEvent.click(button);

    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ativar tema escuro' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Ativar tema claro' })).toBeInTheDocument();
  });

  it('respeita preferência persistida em light ao montar', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    renderToggle();
    expect(screen.getByRole('button', { name: 'Ativar tema escuro' })).toBeInTheDocument();
  });
});