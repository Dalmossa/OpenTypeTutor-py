/**
 * Hash determinístico de token opaco (recuperação de senha).
 *
 * Deliberadamente **não** é o `IPasswordHasher`: bcrypt é salgado, então
 * `hash(t)` nunca devolveria o mesmo valor para o mesmo `t` e a busca por
 * token no repositório (`findByTokenHash`) nunca encontraria nada. Aqui a
 * determinística é requisito, não acidente: o repositório indexa pelo hash.
 *
 * sha256 sem sal é a escolha correta para token de alta entropia (UUID
 * criptográfico, ~122 bits): não há diccionario para atacar, e o sal não
 * acrescentaria nada — o token já é o segredo.
 */
export interface ITokenHasher {
  hash(token: string): string;
}
