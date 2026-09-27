/**
 * Parâmetros de autenticação e conta.
 *
 * Irmão de `adaptiveParams.ts` para o lado que não é motor adaptativo: validade
 * de token, limites de tentativa. Mesma regra (CONSTITUTION §3): o número mora
 * aqui, nunca inlineado no caso de uso — `RequestPasswordReset` escreveria
 * `60 * 60 * 1000` no meio da regra de negócio, onde o `60` não diz nada.
 *
 * `src/domain/config/**` tem `no-magic-numbers` desligado de propósito: é o lar
 * dos parâmetros, e medir a regra ali proibiria o próprio remédio.
 */
import { MS_PER_MINUTE } from "./timeUnits.js";

/** Validade do token de recuperação de senha, em minutos. */
export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

/** A mesma validade, já em milissegundos — é o que o caso de uso soma ao Clock. */
export const PASSWORD_RESET_TOKEN_TTL_MS =
  PASSWORD_RESET_TOKEN_TTL_MINUTES * MS_PER_MINUTE;
