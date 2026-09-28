import { describe, expect, it } from 'vitest';
import { generateOrganizationalInterpretation } from './organizationalInterpretation';
import type { AreaDoc, ProcessDoc } from '../types';

const areas: AreaDoc[] = [
  { id: 'a1', workspaceId: 'w1', name: 'Área Alfa', order: 1 },
  { id: 'a2', workspaceId: 'w1', name: 'Área Beta', order: 2 },
];
const process = (overrides: Partial<ProcessDoc>): ProcessDoc => ({
  id: 'p1', workspaceId: 'w1', areaId: 'a1', name: 'Función', order: 1,
  O: 5, P: 5, E: 5, A: 5, levelMBC: 'C', levelK: 'NE', psmis: [], revision: 1, ...overrides,
});

describe('organizational interpretation', () => {
  it('detects balance and significant gaps using normalized J and Q', () => {
    const result = generateOrganizationalInterpretation(areas, [
      process({ id: 'p1', areaId: 'a1', levelMBC: 'M', levelK: 'I' }),
      process({ id: 'p2', areaId: 'a2', levelMBC: 'C', levelK: 'NE' }),
    ]);
    expect(result.hasData).toBe(true);
    expect(result.areas.find((area) => area.areaId === 'a1')?.balance).toBe('equilibrado');
    expect(result.areas.find((area) => area.areaId === 'a2')?.gap).toBe(100);
    expect(result.gaps).toHaveLength(1);
    expect(result.scaleNote).toContain('no representa un porcentaje de cumplimiento');
  });

  it('does not invent an interpretation without processes', () => {
    const result = generateOrganizationalInterpretation(areas, []);
    expect(result.hasData).toBe(false);
    expect(result.areas).toEqual([]);
    expect(result.general).toContain('No hay áreas');
  });
});
