/**
 * Conversões de unidade compartilhadas pelo domínio.
 *
 * Estas constantes não são parâmetros de algoritmo (moram em `adaptiveParams.ts`,
 * CONSTITUTION §3) — são **unidades**. `60000` inlineado numa divisão significa
 * "milissegundos para minutos", e a duplicação desse literal em `MetricsEngine` e
 * `DailyMetricsAggregate` era a mesma aritmética escrita duas vezes com a mesma
 * chance de divergir.
 */

/** Milissegundos em um segundo. Usado para converter o `exp` do JWT (NumericDate, em segundos). */
export const MS_PER_SECOND = 1000;

/** Milissegundos em um minuto. Usado para normalizar duração ativa em minutos (WPM). */
export const MS_PER_MINUTE = 60000;

/** Milissegundos em um dia. Usado para normalizar "dias desde a última prática" (RecencyScore). */
export const MS_PER_DAY = 86400000;

/**
 * Caracteres por palavra na convenção de WPM (palavra padrão de 5 teclas).
 * Não é um parâmetro do algoritmo adaptativo: é a definição de "palavra" que o
 * WPM representa, e vale igual para WPM bruto, líquido e agregado diário.
 */
export const CHARS_PER_WORD = 5;
