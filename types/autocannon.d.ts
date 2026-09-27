/**
 * Tipos do `autocannon`, que não publica `.d.ts` (v8.0.0).
 *
 * Declarado localmente em vez de `any` implícito, porque o harness usa um
 * recorte estreito da API e vale a pena que o compilador confira esse recorte.
 * Se o `autocannon` passar a publicar tipos, este arquivo é descartável.
 *
 * A instância é ao mesmo tempo `EventEmitter` (evento `response`, de onde sai o
 * tempo de resposta por requisição — é isso que produz o p95 do relatório) e
 * `PromiseLike` (o resultado agregado, resolvido no fim do teste).
 */
declare module "autocannon" {
  interface AutocannonOptions {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    connections?: number;
    duration?: number;
    [option: string]: unknown;
  }

  interface AutocannonLatency {
    p50: number;
    p90: number;
    p97_5: number;
    p99: number;
    average: number;
  }

  interface AutocannonResult {
    requests: { average: number };
    throughput: { average: number };
    non2xx: number;
    latency: AutocannonLatency;
  }

  type ResponseListener = (
    client: unknown,
    statusCode: number,
    bytes: number,
    responseTime: number,
  ) => void;

  interface AutocannonInstance {
    on(event: "response", listener: ResponseListener): this;
    then<TResult1 = AutocannonResult, TResult2 = never>(
      onfulfilled?:
        ((value: AutocannonResult) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?:
        ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): Promise<TResult1 | TResult2>;
  }

  function autocannon(options: AutocannonOptions): AutocannonInstance;

  export default autocannon;
}
