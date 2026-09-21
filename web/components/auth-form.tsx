"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  loginAction,
  registerAction,
  type AuthActionResult,
} from "@/app/actions/auth";

type Mode = "login" | "register";

// FormData.get retorna FormDataEntryValue (string | File); só textos são aceitos aqui,
// o que evita a stringificação padrão do Object (no-base-to-string).
function readField(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

export function AuthForm({ mode }: { mode: Mode }): ReactNode {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = readField(formData, "email");
    const password = readField(formData, "password");
    const name = readField(formData, "name");

    const result: AuthActionResult =
      mode === "login"
        ? await loginAction({ email, password })
        : await registerAction({ name, email, password });

    if (result.ok) {
      router.replace("/app");
      router.refresh();
      return;
    }
    setError(result.error.message);
    setPending(false);
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="w-full max-w-sm space-y-4"
    >
      {mode === "register" && (
        <label className="block">
          <span className="text-sm font-medium text-ink-muted">Nome</span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            className="mt-1 w-full rounded-md border border-hairline-strong bg-surface-1 px-3 py-2"
          />
        </label>
      )}
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">E-mail</span>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-hairline-strong bg-surface-1 px-3 py-2"
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-ink-muted">Senha</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-md border border-hairline-strong bg-surface-1 px-3 py-2"
        />
      </label>

      {error !== null && <p className="text-sm text-danger">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
      </button>

      <p className="text-center text-sm text-ink-muted">
        {mode === "login" ? (
          <>
            Não tem conta?{" "}
            <Link href="/register" className="text-primary underline">
              Cadastre-se
            </Link>
          </>
        ) : (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="text-primary underline">
              Entrar
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
