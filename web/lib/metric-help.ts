export const METRIC_HELP: Record<string, string> = {
  'PPM bruta':
    'Palavras por minuto (PPM) brutas: sua velocidade de digitação sem descontar erros. 1 palavra = 5 caracteres.',
  'PPM líquida':
    'Palavras por minuto (PPM) líquidas: sua velocidade real, já descontando os erros que ficaram sem correção.',
  'Precisão':
    'Percentual de caracteres digitados corretamente em relação ao total digitado. Quanto mais perto de 100%, melhor.',
  'Latência média':
    'Tempo médio, em milissegundos (ms), entre uma tecla e a seguinte. Menor tempo = mais agilidade. 500 ms é a referência adotada pelo app.',
  'Latência':
    'Tempo médio, em milissegundos (ms), que você leva ao digitar esta tecla. Menor tempo = mais agilidade. 500 ms é a referência adotada pelo app.',
  'Erros restantes':
    'Caracteres digitados incorretamente que ainda não foram corrigidos nesta sessão.',
  'Duração': 'Tempo total em que a sessão de digitação ficou ativa.',
  'Caracteres': 'Total de caracteres digitados nesta sessão.',
  'Erros corrigidos':
    'Erros que você cometeu durante a sessão e depois corrigiu com Backspace.',
  'Erros finais':
    'Erros que ficaram sem correção ao finalizar a sessão. São eles que rebaixam sua PPM líquida.',
  'Nível atual':
    'Etapa do curso em que você está agora. Você avança ao concluir as lições do nível.',
  'Lições completadas':
    'Quantidade de lições que você já concluiu até hoje.',
  'Progresso do nível':
    'Percentual do nível atual que você já completou.',
  'Última sessão':
    'Data da última vez em que você praticou uma lição.',
  'Tentativas':
    'Quantas vezes você digitou esta tecla em sessões válidas. São necessárias pelo menos 30 tentativas para avaliar o domínio.',
  'Score':
    'Nota de fraqueza da tecla, de 0 a 1. Quanto maior, mais fraca é a tecla para você — e maior a prioridade de treino.',
};

export const MASTERY_HELP: Record<string, string> = {
  UNKNOWN: 'Ainda não há dados suficientes para avaliar esta tecla.',
  LEARNING:
    'Você está começando a aprender esta tecla. Quanto mais praticar, mais rápido ela melhora.',
  CONSOLIDATING:
    'Esta tecla já está quase dominada. Continue praticando para fixar o aprendizado.',
  MASTERED:
    'Você domina esta tecla: digita com precisão e velocidade consistentes. Ela deixa de ser prioridade de treino.',
  WEAK:
    'Esta tecla é um ponto fraco e tem alta prioridade nos próximos treinos.',
};

export function getMetricHelp(label: string): string | undefined {
  return METRIC_HELP[label];
}