"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import InfoTip from "@/components/info-tip";
import { createControllers } from "@/controllers";
import { phaseInfo } from "@/lib/pedagogical";
import { KEY_LAYOUTS, type KeyboardLayoutName } from "@/lib/virtual-keyboard";
import type { GetUserProgressDTO } from "@/models/progress";

const LAYOUT_OPTIONS: ReadonlyArray<{
  value: KeyboardLayoutName;
  label: string;
  caption: string;
}> = [
  {
    value: "ABNT2",
    label: "ABNT2",
    caption:
      "Tecla ç dedicada à direita do L, teclas mortas ´ e ~ para acentos.",
  },
  {
    value: "US-INTERNATIONAL",
    label: "US-International",
    caption: "Acentos por teclas mortas (´ ` ^ ~), sem tecla ç dedicada.",
  },
];

function LayoutPreview({ layout }: { layout: KeyboardLayoutName }): ReactNode {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col gap-1 rounded-lg border border-hairline bg-surface-1 p-3"
    >
      {KEY_LAYOUTS[layout].map((row, index) => (
        <div key={index} className="flex justify-center gap-1">
          {row.map((key) => (
            <span
              key={key}
              className={`flex h-7 items-center justify-center rounded border border-hairline bg-surface-2 text-[10px] leading-none text-ink-muted ${
                key === "Space" ? "min-w-16" : "min-w-7 px-1"
              }`}
            >
              {key === "Space" ? "" : key}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage(): ReactNode {
  const { user, accessToken: token, loading, updateLayout } = useAuth();
  const [progress, setProgress] = useState<GetUserProgressDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (loading || token === null) {
      return;
    }
    let cancelled = false;
    createControllers()
      .progress.getProgress(token)
      .then((result) => {
        if (!cancelled) {
          setProgress(result);
        }
      })
      .catch(() => {
        // perfil continua utilizável sem o progresso curricular (apenas sem fase)
      });
    return () => {
      cancelled = true;
    };
  }, [loading, token]);

  if (loading) {
    return <p className="text-ink-subtle">Carregando…</p>;
  }

  if (user === null) {
    return (
      <div className="flex flex-col gap-4 py-16 text-center">
        <p className="text-ink-muted">Você não está autenticado.</p>
        <Link
          href="/login"
          className="mx-auto rounded-md bg-primary px-4 py-2 text-white"
        >
          Entrar
        </Link>
      </div>
    );
  }

  const currentLayout = (user.activeLayout ?? "ABNT2") as KeyboardLayoutName;
  const currentPhase = progress?.currentLesson?.pedagogicalPhase ?? null;
  const phase = phaseInfo(currentPhase);

  const handleLayoutChange = async (
    layout: KeyboardLayoutName,
  ): Promise<void> => {
    if (layout === user.activeLayout) {
      return;
    }
    setSaving(true);
    setErrorMessage(null);
    try {
      await updateLayout(layout);
    } catch {
      setErrorMessage("Não foi possível alterar o layout. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-bold">Perfil</h1>

      <section className="rounded-lg border border-hairline bg-surface-1 p-5">
        <h2 className="font-display text-sm font-semibold text-ink">Conta</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Nome</dt>
            <dd className="text-ink">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">E-mail</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">Nível atual</dt>
            <dd className="text-ink">{user.currentLevel}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-subtle">
              Fuso horário
              <InfoTip text="RN37 — streaks, dias ativos e estatísticas de hoje usam o fuso do perfil (padrão America/Sao_Paulo)." />
            </dt>
            <dd className="text-ink">{user.timezone ?? "America/Sao_Paulo"}</dd>
          </div>
          {phase !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Fase da jornada</dt>
              <dd className="text-ink">{phase.label}</dd>
            </div>
          )}
          {progress !== null && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-subtle">Lições concluídas</dt>
              <dd className="text-ink">{progress.completedLessons}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rounded-lg border border-hairline bg-surface-1 p-5">
        <h2 className="font-display text-sm font-semibold text-ink">
          Layout do teclado
          <InfoTip text="RN11 — o desempenho por tecla é registrado e comparado dentro do mesmo layout; ABNT2 e US-INTERNATIONAL são trilhas isoladas." />
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {LAYOUT_OPTIONS.map((option) => {
            const selected = option.value === user.activeLayout;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => void handleLayoutChange(option.value)}
                disabled={saving}
                className={`flex-1 rounded-md border px-4 py-2 text-left text-sm font-medium ${
                  selected
                    ? "border-primary bg-chip-info-bg text-ink"
                    : "border-hairline-strong text-ink-muted hover:bg-surface-2"
                }`}
              >
                {option.label}
                <span className="mt-0.5 block text-xs font-normal text-ink-subtle">
                  {option.caption}
                </span>
              </button>
            );
          })}
        </div>
        {saving && <p className="mt-3 text-sm text-ink-subtle">Salvando…</p>}
        {errorMessage !== null && (
          <p className="mt-3 text-sm text-danger-fg">{errorMessage}</p>
        )}
        <div className="mt-4">
          <p className="text-xs text-ink-subtle">Prévia</p>
          <div className="mt-2">
            <LayoutPreview layout={currentLayout} />
          </div>
        </div>
      </section>
    </div>
  );
}
