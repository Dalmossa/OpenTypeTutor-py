import type { ReactNode } from 'react';
import Link from 'next/link';

import { PhaseJourney } from './phase-journey';
import { ThemeToggle } from '@/components/theme-toggle';

// Landing Page (UI-UX-SRD §4, DESIGN.md tokens). Componente presentacional pf.
// O roteamento / → /login,/register → /app é separado (§3.2); nenhuma RN é
// reimplementada aqui (ADR-018). pt-BR em todos os textos (ADR-011).

interface LandingPageProps {
  authenticated: boolean;
}

const HERO_SUBHEAD =
  'Treinador adaptativo de digitação para ABNT2 e US-INTERNATIONAL: o sistema observa precisão, velocidade e latência por tecla e adapta o treino à sua evolução.';

const FEATURES: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Ambiente de aprendizagem',
    body: 'Prática guiada de digitação, do básico à fluidez — em qualquer layout.',
  },
  {
    title: 'Treinamento adaptativo',
    body: 'As próximas atividades nascem do que você errou, não do que você declara.',
  },
  {
    title: 'Mensurável',
    body: 'Velocidade, precisão, latência e proximidade da maestria, sempre visíveis.',
  },
];

const STEPS: ReadonlyArray<{ title: string; body: string }> = [
  { title: 'Você digita', body: 'Sessões guiadas em fases pedagógicas.' },
  { title: 'O sistema observa', body: 'Por tecla: acurácia, latência e recência.' },
  { title: 'O treino se adapta', body: 'Lições de reforço nas teclas que precisam de prática.' },
  { title: 'Você evolui e mensura', body: 'Dashboard, mapa de calor e proximidade da maestria.' },
];

const ADAPTIVE: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: 'Reforço individual por tecla',
    body: 'Cada tecla tem desempenho próprio; o reforço entra nos pools entre fracas, em consolidação e dominadas.',
  },
  {
    title: 'Maestria explícita',
    body: 'Uma tecla é dominada com precisão ≥ 95%, 30 tentativas e latência média ≤ 500ms em 3 sessões consecutivas.',
  },
  {
    title: 'Correção que ensina',
    body: 'Corrigir um erro não gera um segundo erro; o comportamento é observado, não punido.',
  },
];

const METRICS: ReadonlyArray<{ name: string; meaning: string }> = [
  { name: 'PPM', meaning: 'palavras por minuto úteis' },
  { name: 'Precisão', meaning: 'acertos sobre o que foi digitado' },
  { name: 'Latência média', meaning: 'velocidade de resposta por tecla' },
  { name: 'Proximidade da maestria', meaning: 'a que distância cada tecla está de ser dominada' },
];

const AUDIENCE: ReadonlyArray<string> = [
  'Quem está aprendendo digitação do zero e quer método — especialmente em português (acentuação, ABNT2, US-INTERNATIONAL).',
  'Quem já digita, mas quer corrigir vícios e ganhar precisão.',
  'Quem prioriza saúde durante a prática: ergonomia e pausas preventivas.',
];

function buttonPrimary(): string {
  return 'rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover focus:outline-2 focus:outline-offset-2 focus:outline-primary-focus';
}

function buttonSecondary(): string {
  return 'rounded-md border border-hairline-strong bg-surface-1 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-2 focus:outline-2 focus:outline-offset-2 focus:outline-primary-focus';
}

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }): ReactNode {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-[0.08em] text-ink-subtle">{eyebrow}</p>
      <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink">{title}</h2>
    </div>
  );
}

export function LandingPage({ authenticated }: LandingPageProps): ReactNode {
  return (
    <main className="bg-canvas text-ink">
      {/* top-nav (DESIGN.md) */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-display text-base font-semibold tracking-tight text-ink">
            OpenType Tutor
          </Link>
          <nav className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className={buttonSecondary()}>
              Entrar
            </Link>
            <Link href="/register" className={buttonPrimary()}>
              Começar agora
            </Link>
          </nav>
        </div>
      </header>

      {/* §4.1 Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-20">
        <div className="text-center">
          <p className="text-[13px] font-medium uppercase tracking-[0.4px] text-primary">
            OPEN TYPE TUTOR
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl font-display text-5xl font-semibold leading-[1.05] tracking-[-0.03em] text-ink md:text-6xl lg:text-7xl">
            Digite melhor. Aprenda pelo desempenho observado.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-ink-muted">
            {HERO_SUBHEAD}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className={buttonPrimary()}>
              Começar agora
            </Link>
            <Link href="/login" className={buttonSecondary()}>
              Entrar
            </Link>
          </div>
        </div>

        {/* product-screenshot-card (DESIGN.md) — mockup estático do dashboard */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-hairline bg-surface-1 p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {['PPM', 'Precisão', 'Latência', 'Maestria'].map((label) => (
              <div key={label} className="rounded-lg border border-hairline bg-surface-2 p-4">
                <p className="text-xs text-ink-subtle">{label}</p>
                <p className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">—</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex h-32 items-end gap-2 rounded-lg border border-hairline bg-canvas p-4">
            {[3, 5, 4, 6, 5, 7, 6, 8, 7, 9].map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-sm bg-primary/40"
                style={{ height: `${height * 10}%` }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* §4.2 O que é */}
      <section className="border-t border-hairline bg-surface-1/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="O que é" title="O que é o OpenType Tutor?" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-hairline bg-surface-1 p-6">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §4.3 Como funciona */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Como funciona" title="Como funciona?" />
          <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-hairline bg-surface-1 p-6">
                <p className="text-sm font-medium text-primary">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-2 font-display text-base font-semibold tracking-tight text-ink">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* §4.4 Método — 7 fases (RN25) */}
      <section className="border-t border-hairline bg-surface-1/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Método" title="A jornada de aprendizagem" />
          <p className="mx-auto mt-4 max-w-2xl text-ink-muted">
            Um currículo em 7 fases: cada uma constrói a próxima, do primeiro caractere à fluidez
            em textos longos.
          </p>
          <div className="mt-10">
            <PhaseJourney />
          </div>
        </div>
      </section>

      {/* §4.5 Aprendizagem adaptativa */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Adaptação" title="Aprendizagem adaptativa" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {ADAPTIVE.map((item) => (
              <div key={item.title} className="rounded-xl border border-hairline bg-surface-1 p-6">
                <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §4.6 Métricas */}
      <section className="border-t border-hairline bg-surface-1/40 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Métricas" title="Acompanhe por números claros" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <div key={metric.name} className="rounded-xl border border-hairline bg-surface-1 p-6">
                <p className="font-display text-2xl font-semibold tracking-tight text-ink">
                  {metric.name}
                </p>
                <p className="mt-2 text-sm text-ink-muted">{metric.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* §4.7 Para quem */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHeading eyebrow="Para quem" title="Para quem é?" />
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {AUDIENCE.map((audience, i) => (
              <li key={i} className="rounded-xl border border-hairline bg-surface-1 p-6 tracking-wide">
                <p className="text-sm leading-relaxed text-ink-muted">{audience}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* §4.8 Sobre */}
      <section className="border-t border-hairline bg-surface-1/40 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-ink-subtle">
            Sobre o OpenType Tutor
          </p>
          <blockquote className="mt-4 font-display text-2xl font-medium leading-snug tracking-tight text-ink">
            O OpenType Tutor é um ambiente de aprendizagem de digitação desenvolvido para
            transformar a prática do teclado em um processo progressivo, mensurável e adaptativo.
          </blockquote>
          <p className="mt-6 leading-relaxed text-ink-muted">
            O sistema acompanha o desempenho durante as sessões, identifica quais teclas precisam
            de mais prática e adapta as próximas atividades ao desempenho observado — permitindo
            que o treinamento acompanhe a evolução de cada aluno.
          </p>
          <p className="mt-4 leading-relaxed text-ink-muted">
            O treino respeita o layout do seu teclado (ABNT2 ou US-INTERNATIONAL) e independe do
            nível declarado: é o desempenho observado que orienta a próxima atividade.
          </p>
        </div>
      </section>

      {/* §4.9 CTA final */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="rounded-xl border border-hairline bg-surface-1 p-12 text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Comece sua jornada de digitação.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-ink-muted">
              Sem declaração de nível: o treino começa com o que você realmente digita.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className={buttonPrimary()}>
                Começar agora
              </Link>
              {authenticated && (
                <Link href="/app" className={buttonSecondary()}>
                  Ver a área do aluno
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* footer (DESIGN.md) */}
      <footer className="border-t border-hairline py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-sm text-ink-subtle sm:flex-row">
          <span>OpenType Tutor — treinador de digitação adaptativo.</span>
          <span>pt-BR · ABNT2 · US-INTERNATIONAL</span>
        </div>
      </footer>
    </main>
  );
}