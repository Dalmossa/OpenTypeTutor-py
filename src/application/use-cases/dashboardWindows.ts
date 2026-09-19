// RN35 - deslocamento de dia calendário local (YYYY-MM-DD). Datas são chaves locais;
// o cálculo usa Date.UTC para não depender do relógio/UTC do servidor.
export function shiftLocalDate(dateKey: string, days: number): string {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}