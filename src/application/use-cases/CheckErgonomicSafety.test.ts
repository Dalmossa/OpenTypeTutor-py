import { describe, it, expect } from 'vitest';
import { CheckErgonomicSafety } from './CheckErgonomicSafety.js';
import { DiscomfortSignaledError } from '../../domain/errors/DomainError.js';

describe('RN24/RN28 - CheckErgonomicSafety (check-in ergonômico)', () => {
  const useCase = new CheckErgonomicSafety();

  it('RN28 - desconforto relatado → DiscomfortSignaledError com prioridade máxima', async () => {
    await expect(
      useCase.execute({
        seatHeightOk: true,
        lumbarSupportOk: true,
        monitorAtEyeLevel: true,
        wristSupportOk: true,
        discomfortReported: true,
        discomfortDetail: 'Formigamento no pulso',
      })
    ).rejects.toBeInstanceOf(DiscomfortSignaledError);
  });

  it('RN28 - desconforto tem prioridade mesmo com postura inadequada', async () => {
    await expect(
      useCase.execute({
        seatHeightOk: false,
        lumbarSupportOk: true,
        monitorAtEyeLevel: true,
        wristSupportOk: true,
        discomfortReported: true,
      })
    ).rejects.toMatchObject({ code: 'DISCOMFORT_SIGNALED', statusCode: 422 });
  });

  it('RN24 - altura da cadeira inadequada → safe false com orientação', async () => {
    const result = await useCase.execute({
      seatHeightOk: false,
      lumbarSupportOk: true,
      monitorAtEyeLevel: true,
      wristSupportOk: true,
      discomfortReported: false,
    });

    expect(result.safe).toBe(false);
    expect(result.guidance.length).toBeGreaterThan(0);
  });

  it('RN24 - monitor fora da altura dos olhos → safe false', async () => {
    const result = await useCase.execute({
      seatHeightOk: true,
      lumbarSupportOk: true,
      monitorAtEyeLevel: false,
      wristSupportOk: true,
      discomfortReported: false,
    });

    expect(result.safe).toBe(false);
  });

  it('RN24 - postura completa adequada → safe true', async () => {
    const result = await useCase.execute({
      seatHeightOk: true,
      lumbarSupportOk: true,
      monitorAtEyeLevel: true,
      wristSupportOk: true,
      discomfortReported: false,
    });

    expect(result).toEqual({ safe: true, guidance: 'Postura adequada. Pode iniciar o treino.' });
  });
});