import { DiscomfortSignaledError } from '../../domain/errors/DomainError.js';
import type { CheckErgonomicSafetyResponseDTO, ErgonomicCheckInput } from '../dtos/ProgressCardDTOs.js';

export class CheckErgonomicSafety {
  // RN28 - Desconforto tem prioridade máxima e interrompe o treino imediatamente
  async execute(input: ErgonomicCheckInput): Promise<CheckErgonomicSafetyResponseDTO> {
    await Promise.resolve();
    if (input.discomfortReported) {
      throw new DiscomfortSignaledError(
        'Desconforto sinalizado: interrompa o treino imediatamente, faça uma pausa, alongue e hidrate-se antes de retomar'
      );
    }

    const issues: string[] = [];
    if (!input.seatHeightOk) {
      issues.push('Ajuste a altura da cadeira para que os pés fiquem apoiados no chão');
    }
    if (!input.lumbarSupportOk) {
      issues.push('Ajuste o apoio lombar para manter as costas eretas');
    }
    if (!input.monitorAtEyeLevel) {
      issues.push('Posicione o monitor na altura dos olhos, a uma distância de um braço');
    }
    if (!input.wristSupportOk) {
      issues.push('Apoie os pulsos sem flexioná-los sobre o teclado');
    }

    if (issues.length > 0) {
      return { safe: false, guidance: issues.join(' ') };
    }

    return { safe: true, guidance: 'Postura adequada. Pode iniciar o treino.' };
  }
}