import { AreaDoc, ProcessDoc, calculateWorkspaceSustainableScore } from '../types';

export type BalanceLevel = 'equilibrado' | 'diferencia moderada' | 'desbalanceado';

export interface AreaInterpretation {
  areaId: string;
  areaName: string;
  J: number;
  Q: number;
  R: number;
  jNormalized: number;
  qNormalized: number;
  gap: number;
  balance: BalanceLevel;
  higherDimension: string;
  lowerDimension: string;
  interpretation: string;
}

export interface OrganizationalInterpretation {
  hasData: boolean;
  scaleNote: string;
  general: string;
  areas: AreaInterpretation[];
  gaps: Array<{ area: string; dimensions: string; difference: number; interpretation: string }>;
  balanceSummary: string;
  findings: string[];
  executive: string;
}

const dimension = (kind: 'J' | 'Q') => kind === 'J' ? 'Operación (J)' : 'Procesos (Q)';

export function generateOrganizationalInterpretation(
  areas: AreaDoc[],
  processes: ProcessDoc[],
): OrganizationalInterpretation {
  const scaleNote = 'Operación (J) y Procesos (Q) valen hasta 50 puntos cada uno. Para compararlos con claridad, la gráfica los muestra en una misma escala de 0 a 100; esta comparación no representa un porcentaje de cumplimiento. El resultado general (R) es la suma de ambos.';
  const { areaScoresMap } = calculateWorkspaceSustainableScore(areas, processes);
  const evaluated = areas.filter((area) => processes.some((process) => process.areaId === area.id));

  if (!evaluated.length) {
    return {
      hasData: false,
      scaleNote,
      general: 'No hay áreas con procesos evaluados suficientes para generar una interpretación.',
      areas: [], gaps: [],
      balanceSummary: 'Necesitamos al menos un proceso evaluado para comparar la operación con la forma en que se documentan los procesos.',
      findings: ['Todavía no hay información suficiente para señalar diferencias o puntos de atención.'],
      executive: 'Aún no hay procesos evaluados. Cuando se capture al menos uno, aquí aparecerá una lectura sencilla de los resultados y los principales puntos de atención.',
    };
  }

  const areaResults: AreaInterpretation[] = evaluated.map((area) => {
    const score = areaScoresMap[area.id] || { J: 0, Q: 0, R: 0 };
    const jNormalized = Math.round(score.J * 2 * 10) / 10;
    const qNormalized = Math.round(score.Q * 2 * 10) / 10;
    const gap = Math.round(Math.abs(jNormalized - qNormalized) * 10) / 10;
    const balance: BalanceLevel = gap <= 10 ? 'equilibrado' : gap < 20 ? 'diferencia moderada' : 'desbalanceado';
    const higherKind: 'J' | 'Q' = jNormalized >= qNormalized ? 'J' : 'Q';
    const lowerKind: 'J' | 'Q' = higherKind === 'J' ? 'Q' : 'J';
    const equal = gap === 0;
    const relationship = balance === 'equilibrado'
      ? 'Ambos aspectos avanzan a un ritmo parecido. Esto no significa necesariamente que el resultado sea alto, sino que hay coherencia entre ellos.'
      : balance === 'diferencia moderada'
        ? 'Hay una diferencia que conviene observar, aunque todavía no es grande.'
        : `Hay una diferencia importante entre ${dimension(higherKind)} y ${dimension(lowerKind)}. Conviene revisar qué está frenando al resultado más bajo.`;
    return {
      areaId: area.id, areaName: area.name, J: score.J, Q: score.Q, R: score.R,
      jNormalized, qNormalized, gap, balance,
      higherDimension: equal ? 'Sin diferencia' : dimension(higherKind),
      lowerDimension: equal ? 'Sin diferencia' : dimension(lowerKind),
      interpretation: equal
        ? `${area.name} muestra el mismo avance en operación y procesos. ${relationship}`
        : `En ${area.name}, ${dimension(higherKind)} está por encima de ${dimension(lowerKind)} por cerca de ${gap} puntos. ${relationship}`,
    };
  });

  const gaps = areaResults.filter((area) => area.gap >= 20).map((area) => ({
    area: area.areaName,
    dimensions: `${area.higherDimension} / ${area.lowerDimension}`,
    difference: area.gap,
    interpretation: 'La operación y la documentación de los procesos no avanzan al mismo ritmo. Conviene revisar esta área antes de definir acciones.',
  }));
  const balanced = areaResults.filter((area) => area.gap <= 10);
  const averageR = Math.round(areaResults.reduce((sum, area) => sum + area.R, 0) / areaResults.length * 10) / 10;
  const minR = Math.min(...areaResults.map((area) => area.R));
  const maxR = Math.max(...areaResults.map((area) => area.R));
  const operationHigher = areaResults.filter((area) => area.jNormalized > area.qNormalized).length;
  const processesHigher = areaResults.filter((area) => area.qNormalized > area.jNormalized).length;

  const general = `Se revisaron ${areaResults.length} ${areaResults.length === 1 ? 'área' : 'áreas'}. El promedio general es ${averageR} de 100; el resultado más bajo es ${minR} y el más alto ${maxR}. ${balanced.length} ${balanced.length === 1 ? 'área avanza' : 'áreas avanzan'} de forma pareja en operación y procesos, y ${gaps.length} ${gaps.length === 1 ? 'necesita' : 'necesitan'} atención por mostrar una diferencia importante.`;

  const balanceSummary = balanced.length
    ? `${balanced.map((area) => area.areaName).join(', ')} ${balanced.length === 1 ? 'mantiene' : 'mantienen'} un avance parecido entre la operación diaria y sus procesos documentados.`
    : 'En todas las áreas hay diferencias entre la operación diaria y sus procesos documentados. Conviene revisar cada caso para encontrar la causa.';

  const findings: string[] = [
    `El promedio de las áreas evaluadas es ${averageR} de 100.`,
    balanced.length
      ? `${balanced.length} ${balanced.length === 1 ? 'área mantiene' : 'áreas mantienen'} un avance parejo entre operación y procesos.`
      : 'Ninguna área muestra todavía un avance parejo entre operación y procesos.',
    gaps.length
      ? `${gaps.length} ${gaps.length === 1 ? 'área requiere' : 'áreas requieren'} atención porque uno de los dos aspectos está quedando atrás.`
      : 'No se encontraron diferencias importantes entre operación y procesos.',
  ];
  if (operationHigher || processesHigher) {
    findings.push(operationHigher === processesHigher
      ? 'No existe una dirección predominante: la diferencia entre operación y procesos se distribuye de forma equivalente entre las áreas.'
      : operationHigher > processesHigher
        ? `En ${operationHigher} ${operationHigher === 1 ? 'área' : 'áreas'}, la operación diaria está más avanzada que la documentación de sus procesos.`
        : `En ${processesHigher} ${processesHigher === 1 ? 'área' : 'áreas'}, los procesos están mejor documentados que aplicados en la operación diaria.`);
  }
  if (areaResults.length > 1) findings.push(`Hay ${Math.round((maxR - minR) * 10) / 10} puntos de diferencia entre el resultado más alto y el más bajo.`);

  const executive = `El resultado promedio es ${averageR} de 100. ${balanced.length ? `${balanced.length} ${balanced.length === 1 ? 'área trabaja' : 'áreas trabajan'} de manera pareja entre lo que hacen y lo que tienen documentado.` : 'La operación y los procesos documentados avanzan a ritmos distintos en las áreas revisadas.'} ${gaps.length ? `Hay ${gaps.length} ${gaps.length === 1 ? 'área que conviene atender primero' : 'áreas que conviene atender primero'} por la diferencia encontrada.` : 'No aparecen diferencias grandes que requieran atención inmediata.'} Estos resultados sirven como guía para conversar con cada área y decidir acciones; no explican por sí solos la causa de cada resultado.`;

  return { hasData: true, scaleNote, general, areas: areaResults, gaps, balanceSummary, findings: findings.slice(0, 5), executive };
}
