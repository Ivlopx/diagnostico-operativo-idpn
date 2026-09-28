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
  const scaleNote = 'J y Q se conservan sobre 50 puntos. Para medir su cercanía se comparan temporalmente sobre una escala común de 0 a 100; esta normalización facilita la comparación y no representa un porcentaje de cumplimiento. R es el resultado global J + Q, no una dimensión independiente.';
  const { areaScoresMap } = calculateWorkspaceSustainableScore(areas, processes);
  const evaluated = areas.filter((area) => processes.some((process) => process.areaId === area.id));

  if (!evaluated.length) {
    return {
      hasData: false,
      scaleNote,
      general: 'No hay áreas con procesos evaluados suficientes para generar una interpretación.',
      areas: [], gaps: [],
      balanceSummary: 'El equilibrio entre dimensiones no está disponible hasta que exista al menos un proceso evaluado.',
      findings: ['La evaluación todavía no contiene datos suficientes para identificar patrones, brechas o niveles de equilibrio.'],
      executive: 'La información disponible todavía no permite interpretar la relación entre operación y formalización de procesos. Es necesario contar con al menos un proceso dentro de un área para generar conclusiones basadas en los datos. Hasta entonces no es posible identificar brechas, consistencia interna ni patrones compartidos entre áreas.',
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
      ? 'Esto sugiere una mayor consistencia entre las dimensiones evaluadas, sin que por sí sola implique un nivel alto de desempeño.'
      : balance === 'diferencia moderada'
        ? 'Esto muestra una diferencia observable entre las dimensiones, aunque sin alcanzar el umbral definido como brecha significativa.'
        : `Esto evidencia una diferencia relevante entre ${dimension(higherKind)} y ${dimension(lowerKind)}, que conviene revisar para comprender su origen.`;
    return {
      areaId: area.id, areaName: area.name, J: score.J, Q: score.Q, R: score.R,
      jNormalized, qNormalized, gap, balance,
      higherDimension: equal ? 'Sin diferencia' : dimension(higherKind),
      lowerDimension: equal ? 'Sin diferencia' : dimension(lowerKind),
      interpretation: equal
        ? `${area.name} presenta un comportamiento equilibrado: Operación (J) y Procesos (Q) registran valores equivalentes al compararlos en una escala común. ${relationship}`
        : `${area.name} presenta un comportamiento ${balance}, debido a que ${dimension(higherKind)} registra un resultado superior a ${dimension(lowerKind)}. La diferencia normalizada es de aproximadamente ${gap} puntos. ${relationship}`,
    };
  });

  const gaps = areaResults.filter((area) => area.gap >= 20).map((area) => ({
    area: area.areaName,
    dimensions: `${area.higherDimension} / ${area.lowerDimension}`,
    difference: area.gap,
    interpretation: `Se observa una diferencia entre la operación y los procesos que refleja menor consistencia entre ambas dimensiones; los datos no permiten atribuir una causa específica.`,
  }));
  const balanced = areaResults.filter((area) => area.gap <= 10);
  const averageR = Math.round(areaResults.reduce((sum, area) => sum + area.R, 0) / areaResults.length * 10) / 10;
  const minR = Math.min(...areaResults.map((area) => area.R));
  const maxR = Math.max(...areaResults.map((area) => area.R));
  const operationHigher = areaResults.filter((area) => area.jNormalized > area.qNormalized).length;
  const processesHigher = areaResults.filter((area) => area.qNormalized > area.jNormalized).length;

  const general = `Se analizaron ${areaResults.length} ${areaResults.length === 1 ? 'área con procesos registrados' : 'áreas con procesos registrados'}. El resultado general promedio es ${averageR} de 100 y los resultados por área se ubican entre ${minR} y ${maxR} puntos. ${balanced.length} ${balanced.length === 1 ? 'área presenta' : 'áreas presentan'} equilibrio entre Operación (J) y Procesos (Q), mientras que ${gaps.length} ${gaps.length === 1 ? 'presenta una brecha significativa' : 'presentan brechas significativas'} bajo el umbral de 20 puntos normalizados.`;

  const balanceSummary = balanced.length
    ? `${balanced.map((area) => area.areaName).join(', ')} ${balanced.length === 1 ? 'presenta' : 'presentan'} valores cercanos entre Operación (J) y Procesos (Q). Esto puede reflejar mayor consistencia interna, pero debe interpretarse por separado del nivel global R.`
    : 'Ninguna de las áreas evaluadas se encuentra dentro del margen de equilibrio de 10 puntos normalizados. Esto describe dispersión entre dimensiones, sin determinar por sí mismo sus causas.';

  const findings: string[] = [
    `El resultado general promedio de las áreas con datos es ${averageR} de 100; este valor resume J y Q, pero no explica por sí solo el equilibrio interno.`,
    balanced.length
      ? `${balanced.length} ${balanced.length === 1 ? 'área mantiene' : 'áreas mantienen'} una diferencia máxima de 10 puntos normalizados entre operación y procesos.`
      : 'Las áreas evaluadas presentan diferencias superiores a 10 puntos normalizados entre operación y procesos.',
    gaps.length
      ? `${gaps.length} ${gaps.length === 1 ? 'área requiere' : 'áreas requieren'} revisión contextual por mostrar una brecha de al menos 20 puntos normalizados.`
      : 'No se detectaron brechas significativas de 20 puntos o más entre operación y procesos.',
  ];
  if (operationHigher || processesHigher) {
    findings.push(operationHigher === processesHigher
      ? 'No existe una dirección predominante: la diferencia entre operación y procesos se distribuye de forma equivalente entre las áreas.'
      : operationHigher > processesHigher
        ? `En ${operationHigher} ${operationHigher === 1 ? 'área' : 'áreas'}, Operación (J) supera a Procesos (Q); esto señala una diferencia de estructuración, no una causa determinada.`
        : `En ${processesHigher} ${processesHigher === 1 ? 'área' : 'áreas'}, Procesos (Q) supera a Operación (J); esto señala una diferencia de estructuración, no una causa determinada.`);
  }
  if (areaResults.length > 1) findings.push(`La amplitud entre los resultados globales observados es de ${Math.round((maxR - minR) * 10) / 10} puntos, lo que muestra el grado de variación organizacional sin establecer un ranking entre áreas.`);

  const executive = `La evaluación muestra cómo se relacionan la operación y la formalización de procesos en ${areaResults.length} ${areaResults.length === 1 ? 'área analizada' : 'áreas analizadas'}. El resultado global promedio es ${averageR} de 100, con valores por área entre ${minR} y ${maxR}. ${balanced.length ? `${balanced.length} ${balanced.length === 1 ? 'área presenta' : 'áreas presentan'} cercanía entre ambas dimensiones, lo que sugiere consistencia interna.` : 'No se observan áreas dentro del margen definido de equilibrio, por lo que existe dispersión entre las dimensiones.'} ${gaps.length ? `A la vez, ${gaps.length} ${gaps.length === 1 ? 'área muestra' : 'áreas muestran'} una brecha significativa que requiere revisión contextual para comprender su origen.` : 'No se identifican brechas significativas bajo el criterio establecido.'} Los resultados describen diferencias de estructura y madurez, pero no permiten atribuir causas específicas ni considerar automáticamente los valores altos como fortalezas o los bajos como incumplimientos.`;

  return { hasData: true, scaleNote, general, areas: areaResults, gaps, balanceSummary, findings: findings.slice(0, 5), executive };
}
