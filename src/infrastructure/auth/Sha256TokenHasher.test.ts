import { describe, it, expect } from "vitest";
import { Sha256TokenHasher } from "./Sha256TokenHasher.js";

describe("Sha256TokenHasher", () => {
  const hasher = new Sha256TokenHasher();

  it("não devolve o token em claro", () => {
    const token = "9f8b1c22-0a3e-4a1b-9c7d-2e6f5a4b3c2d";

    expect(hasher.hash(token)).not.toBe(token);
  });

  it("é determinístico: mesmo token, mesmo hash", () => {
    const token = "9f8b1c22-0a3e-4a1b-9c7d-2e6f5a4b3c2d";

    expect(hasher.hash(token)).toBe(hasher.hash(token));
  });

  it("tokens diferentes geram hashes diferentes", () => {
    expect(hasher.hash("token-a")).not.toBe(hasher.hash("token-b"));
  });

  it("produz 64 caracteres hexadecimais (tamanho fixo)", () => {
    const hash = hasher.hash("9f8b1c22-0a3e-4a1b-9c7d-2e6f5a4b3c2d");

    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("bate com o sha256 do próprio node:crypto", () => {
    // Trava o algoritmo. Se alguém trocar sha256 por bcrypt (que é salgado e
    // portanto nunca encontraria o token na busca), este teste falha.
    const token = "token-de-referencia";
    const esperado =
      "ee168b0283e303b0a8ab6a4aeb96b821366e7eb10de33ead3f0d3cb0f5667cdf";

    expect(hasher.hash(token)).toBe(esperado);
  });

  it("token vazio não estoura", () => {
    expect(hasher.hash("")).toHaveLength(64);
  });

  it("hash não contém o token original como substring", () => {
    // Regressão de "o token vaza em claro dentro do próprio hash".
    const token = "segredo-de-alta-entropia";

    expect(hasher.hash(token)).not.toContain(token);
  });
});
