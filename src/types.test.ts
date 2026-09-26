import { describe, expect, it } from 'vitest';
import {
  calculateActivityClassification, calculateActivityCriticality, calculateAreaScores,
  calculateProcessScores, calculatePSMISummary, calculateWorkspaceSustainableScore,
  type AreaDoc, type ProcessDoc, type PSMIMapping,
} from './types';

const process = (overrides: Partial<ProcessDoc> = {}): ProcessDoc => ({
  id: 'p1', workspaceId: 'w1', areaId: 'a1', name: 'Proceso', order: 1,
  O: 5, P: 5, E: 5, A: 5, levelMBC: 'C', levelK: 'MC', psmis: [], revision: 1, ...overrides,
});

describe('Dopyme scoring', () => {
  it('calculates process scores and PSMI eligibility', () => {
    expect(calculateProcessScores(process())).toEqual({ J: 50, Q: 50, R: 100, isPSMIEnabled: true, pointsToPSMI: 0 });
    expect(calculateProcessScores(process({ O: 0, P: 0, E: 0, A: 0, levelMBC: 'NONE', levelK: 'NE' }))).toEqual({ J: 0, Q: 0, R: 0, isPSMIEnabled: false, pointsToPSMI: 60 });
  });

  it('averages processes by area and areas by workspace', () => {
    const areas: AreaDoc[] = [
      { id: 'a1', workspaceId: 'w1', name: 'Uno', order: 1 },
      { id: 'a2', workspaceId: 'w1', name: 'Dos', order: 2 },
    ];
    const processes = [process(), process({ id: 'p2', areaId: 'a1', O: 0, P: 0, E: 0, A: 0, levelMBC: 'NONE', levelK: 'NE' })];
    expect(calculateAreaScores(processes)).toMatchObject({ J: 25, Q: 25, R: 50, count: 2, enabledCount: 1 });
    expect(calculateWorkspaceSustainableScore(areas, processes).sustainableScore).toBe(25);
  });
});

describe('PSMI calculations', () => {
  it('classifies activities and summarizes normalized roles', () => {
    const critical = { agregaValor: true, esRequisito: true, satisfaceCliente: true };
    expect(calculateActivityClassification(critical)).toBe('AGREGA VALOR');
    expect(calculateActivityCriticality(critical)).toBe('CRITICA');
    expect(calculateActivityClassification({ agregaValor: false, esRequisito: false, satisfaceCliente: false })).toBe('ELIMINAR');

    const mapping = { actividades: [
      { ...critical, competencia: 'Ventas', responsable: 'Gerencia', tiempoProceso: 3, esCiclo: true },
      { ...critical, competencia: ' ventas ', responsable: 'gerencia', tiempoProceso: 2, esCiclo: false },
    ] } as PSMIMapping;
    expect(calculatePSMISummary(mapping)).toMatchObject({ totalCompetencias: 1, totalPuestos: 1, sumTiempoProceso: 5, totalCriticas: 2, totalCiclicas: 1, sumTiempoCriticas: 5, totalCiclosCriticos: 1, totalActividades: 2 });
  });
});
