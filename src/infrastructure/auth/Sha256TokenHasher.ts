import crypto from "crypto";
import type { ITokenHasher } from "../../application/ports/ITokenHasher.js";

/**
 * sha256 hexadecimal do token.
 *
 * Mesmo `crypto` que `refreshToken.ts` já usa para `randomUUID`, então não
 * introduz dependência nova. O digest é de tamanho fixo (64 chars), o que
 * também evita armazenar token de comprimento variável no banco.
 */
export class Sha256TokenHasher implements ITokenHasher {
  hash(token: string): string {
    return crypto.createHash("sha256").update(token, "utf8").digest("hex");
  }
}
