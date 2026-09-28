import writeXlsxFile, { type Cell, type Sheet, type SheetData } from 'write-excel-file/browser';
import { renderComparativeRadarToDataURL } from './radarRenderer';
import {
  AreaDoc,
  ProcessDoc,
  WorkspaceDoc,
  calculateProcessScores,
  calculateWorkspaceSustainableScore,
  LEVEL_MBC_LABELS,
  LEVEL_K_LABELS,
} from '../types';

const NAVY = '#173B57';
const TERRACOTTA = '#C85B3C';
const WARM = '#F6F4EF';
const BORDER = '#D9D5CC';

const styledRow = (row: Cell[], style: Record<string, unknown>): Cell[] => row.map((cell) => {
  if (cell === null || cell === undefined) return { value: '', ...style } as Cell;
  if (typeof cell === 'object' && !(cell instanceof Date)) return { ...cell, ...style } as Cell;
  return { value: cell, ...style } as Cell;
});
const sectionRow = (label: string, columns: number): Cell[] => [{ value: label, columnSpan: columns, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: NAVY, height: 24, alignVertical: 'center' }];
const headerRow = (row: Cell[]): Cell[] => styledRow(row, { fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: NAVY, wrap: true, alignVertical: 'center', height: 34, borderColor: '#FFFFFF', borderStyle: 'thin' });

const makeSheet = (sheet: string, data: SheetData, widths: number[], options: Partial<Sheet<Blob>> = {}): Sheet<Blob> => ({
  sheet,
  data,
  columns: widths.map((width) => ({ width })),
  showGridLines: false,
  ...options,
});

export async function exportWorkspaceToExcel(
  workspace: WorkspaceDoc,
  areas: AreaDoc[],
  processes: ProcessDoc[]
) {
  const companyName = workspace.name || workspace.companyName || 'Empresa';
  const workspaceId = workspace.id;
  const downloadDate = new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

  // 1. Calculate overall sustainable score and per-area scores
  const { sustainableScore, areaScoresMap } = calculateWorkspaceSustainableScore(areas, processes);

  // ==========================================
  // SHEET 1: RESUMEN GENERAL
  // ==========================================
  const resumenRows: SheetData = [
    [{ value: 'EXPEDIENTE DIAGNÓSTICO OPERATIVO', columnSpan: 11, fontWeight: 'bold', fontSize: 20, textColor: '#FFFFFF', backgroundColor: NAVY, height: 38, alignVertical: 'center' }],
    [''],
    sectionRow('DATOS DE LA EMPRESA', 11),
    ['Empresa:', companyName],
    ['Identificador Único (ID):', workspaceId],
    ['Fecha de Exportación:', downloadDate],
    [''],
    sectionRow('MÉTRICAS CLAVE GLOBALES', 11),
    ['Total de Áreas:', areas.length],
    ['Total de Procesos Evaluados:', processes.length],
    ['Resultado Sustentable Global (R):', `${sustainableScore} / 100`],
    [''],
    sectionRow('DESGLOSE DE MADUREZ POR ÁREA ORGANIZACIONAL', 11),
    headerRow([
      'Área',
      'Cant. Procesos',
      'Promedio O (0 o 5)',
      'Promedio P (0 o 5)',
      'Promedio E (0 o 5)',
      'Promedio A (0 o 5)',
      'Subtotal OPEA (0-20)',
      'Puntaje J Promedio (0-50)',
      'Puntaje Q Promedio (0-50)',
      'Resultado del Área R (0-100)',
      'Procesos Aptos PSMI (R >= 60)',
    ]),
  ];

  areas.forEach((area) => {
    const areaProcesses = processes.filter((p) => p.areaId === area.id);
    const aScore = areaScoresMap[area.id] || { J: 0, Q: 0, R: 0, count: 0, enabledCount: 0 };

    let avgO = 0;
    let avgP = 0;
    let avgE = 0;
    let avgA = 0;
    let avgOPEA = 0;

    if (areaProcesses.length > 0) {
      areaProcesses.forEach((p) => {
        avgO += p.O || 0;
        avgP += p.P || 0;
        avgE += p.E || 0;
        avgA += p.A || 0;
        avgOPEA += (p.O || 0) + (p.P || 0) + (p.E || 0) + (p.A || 0);
      });
      avgO = parseFloat((avgO / areaProcesses.length).toFixed(1));
      avgP = parseFloat((avgP / areaProcesses.length).toFixed(1));
      avgE = parseFloat((avgE / areaProcesses.length).toFixed(1));
      avgA = parseFloat((avgA / areaProcesses.length).toFixed(1));
      avgOPEA = parseFloat((avgOPEA / areaProcesses.length).toFixed(1));
    }

    resumenRows.push(styledRow([
      area.name,
      aScore.count,
      avgO,
      avgP,
      avgE,
      avgA,
      avgOPEA,
      aScore.J,
      aScore.Q,
      aScore.R,
      `${aScore.enabledCount} de ${aScore.count}`,
    ], { backgroundColor: resumenRows.length % 2 ? '#FFFFFF' : WARM, borderColor: BORDER, borderStyle: 'thin', alignVertical: 'center' }));
  });

  const wsResumen = makeSheet('Resumen General', resumenRows, [28, 15, 18, 18, 18, 18, 20, 24, 24, 26, 26], {
    stickyRowsCount: 14,
    conditionalFormatting: areas.length ? [{ cellRange: { from: { row: 15, column: 10 }, to: { row: 14 + areas.length, column: 10 } }, condition: { operator: '>=', value: 60 }, style: { backgroundColor: '#DDEFE7', textColor: '#245B48', fontWeight: 'bold' } }] : undefined,
  });

  // ==========================================
  // SHEET 2: DOPYME - PROCESOS
  // ==========================================
  const dopymeHeaders = [
    'Área',
    'Proceso',
    'Objetivo O (0 o 5)',
    'Políticas P (0 o 5)',
    'Estructura E (0 o 5)',
    'Análisis A (0 o 5)',
    'Subtotal OPEA (0-20)',
    'Nivel M/B/C',
    'Puntos MBC (0-30)',
    'Puntaje J (0-50)',
    'Nivel Formalidad K',
    'Puntaje Q (0-50)',
    'Resultado R (0-100)',
    '¿Apto para PSMI?',
    'Faltante para PSMI',
  ];

  const dopymeRows: SheetData = [headerRow(dopymeHeaders)];

  areas.forEach((area) => {
    const areaProcesses = processes.filter((p) => p.areaId === area.id);
    areaProcesses.forEach((p) => {
      const scores = calculateProcessScores(p);
      const subtotalOPEA = (p.O || 0) + (p.P || 0) + (p.E || 0) + (p.A || 0);
      const mbcPoints =
        p.levelMBC === 'M' ? 10 : p.levelMBC === 'B' ? 20 : p.levelMBC === 'C' ? 30 : 0;
      const mbcLabel = LEVEL_MBC_LABELS[p.levelMBC]?.label || p.levelMBC;
      const kLabel = LEVEL_K_LABELS[p.levelK]?.label || p.levelK;

      const excelRow = dopymeRows.length + 1;
      dopymeRows.push(styledRow([
        area.name,
        p.name,
        p.O,
        p.P,
        p.E,
        p.A,
        { type: 'Formula', value: `SUM(C${excelRow}:F${excelRow})` },
        mbcLabel,
        mbcPoints,
        { type: 'Formula', value: `G${excelRow}+I${excelRow}` },
        kLabel,
        scores.Q,
        { type: 'Formula', value: `J${excelRow}+L${excelRow}` },
        { type: 'Formula', value: `IF(M${excelRow}>=60,"Sí","No")` },
        { type: 'Formula', value: `IF(M${excelRow}>=60,"Alcanzado",60-M${excelRow}&" pts")` },
      ], { backgroundColor: excelRow % 2 ? '#FFFFFF' : WARM, borderColor: BORDER, borderStyle: 'thin', alignVertical: 'center' }));
    });
  });

  const wsDopyme = makeSheet('Dopyme (Procesos)', dopymeRows, [25, 32, 18, 18, 20, 18, 20, 20, 18, 16, 26, 16, 20, 18, 20], {
    stickyRowsCount: 1,
    stickyColumnsCount: 2,
    conditionalFormatting: processes.length ? [
      { cellRange: { from: { row: 2, column: 13 }, to: { row: 1 + processes.length, column: 13 } }, condition: { operator: '>=', value: 60 }, style: { backgroundColor: '#DDEFE7', textColor: '#245B48', fontWeight: 'bold' } },
      { cellRange: { from: { row: 2, column: 13 }, to: { row: 1 + processes.length, column: 13 } }, condition: { operator: '<', value: 60 }, style: { backgroundColor: '#FFF2ED', textColor: '#A7472F', fontWeight: 'bold' } },
    ] : undefined,
  });

  // ==========================================
  // SHEET 3: PSMI - ACTIVIDADES DETALLADAS
  // ==========================================
  const psmiHeaders = [
    'Área',
    'Proceso',
    'Entradas',
    'Salidas',
    'Elaboró',
    'No. Actividad',
    'Etapa',
    'Actividad',
    'Detalle Operativo',
    'Responsable',
    'Competencia',
    '¿Es Ciclo?',
    '¿Agrega Valor?',
    '¿Es Requisito?',
    '¿Satisface Cliente?',
    'Tiempo Sin Demora',
    'Tiempo Con Demora',
    'Unidad Tiempo',
    'Formato Utilizado',
    'Registro de Información',
    'Software / Herramienta',
    'Links / Enlaces',
    'Revisión Cumplimiento',
    'Instrucciones de Trabajo',
  ];

  const psmiRows: SheetData = [headerRow(psmiHeaders)];

  areas.forEach((area) => {
    const areaProcesses = processes.filter((p) => p.areaId === area.id);
    areaProcesses.forEach((p) => {
      const psmis = p.psmis || [];
      psmis.forEach((mapping) => {
        const unit = mapping.unidadTiempo || 'Minutos';
        (mapping.actividades || []).forEach((act) => {
          psmiRows.push(styledRow([
            area.name,
            p.name,
            mapping.entradas || '',
            mapping.salidas || '',
            mapping.elaboro || mapping.reviso || mapping.autorizo || '',
            act.no,
            act.etapa || '',
            act.actividad || '',
            act.detalle || '',
            act.responsable || '',
            act.competencia || '',
            act.esCiclo ? 'Sí' : 'No',
            act.agregaValor ? 'Sí' : 'No',
            act.esRequisito ? 'Sí' : 'No',
            act.satisfaceCliente ? 'Sí' : 'No',
            act.tiempoActividad ?? 0,
            act.tiempoProceso ?? 0,
            unit,
            act.herramientas?.formato || '',
            act.herramientas?.registroInfo || '',
            act.herramientas?.software || '',
            act.herramientas?.links || '',
            act.herramientas?.revisionCumplimiento || '',
            act.herramientas?.instrucciones || '',
          ], { backgroundColor: psmiRows.length % 2 ? '#FFFFFF' : WARM, borderColor: BORDER, borderStyle: 'thin', alignVertical: 'top', wrap: true }));
        });
      });
    });
  });

  const wsPSMI = makeSheet('PSMI (Actividades)', psmiRows, [22, 28, 22, 22, 20, 14, 20, 28, 38, 22, 22, 12, 15, 15, 18, 16, 20, 14, 20, 25, 22, 25, 26, 30], { stickyRowsCount: 1, stickyColumnsCount: 2 });

  // ==========================================
  // SHEET 4: DASHBOARD WITH RADAR CHARTS
  // ==========================================
  const operationData = areas.map((area) => ({ label: area.name, value: areaScoresMap[area.id]?.J || 0 }));
  const processData = areas.map((area) => ({ label: area.name, value: areaScoresMap[area.id]?.Q || 0 }));
  const generalData = areas.map((area) => ({ label: area.name, value: areaScoresMap[area.id]?.R || 0 }));
  const radarUrls = [renderComparativeRadarToDataURL([
    { label: 'Operación J', color: '#4D9DE0', data: operationData.map((item) => ({ ...item, value: item.value * 2 })) },
    { label: 'Procesos Q', color: '#58B368', data: processData.map((item) => ({ ...item, value: item.value * 2 })) },
    { label: 'Resultado R', color: '#FF6B78', data: generalData },
  ], 'Comparativa Integral por Área', 520)];
  const [radarBlobs, logoBlob] = await Promise.all([
    Promise.all(radarUrls.map((url) => fetch(url).then((response) => response.blob()))),
    fetch('/assets/idpn.png').then((response) => response.blob()),
  ]);
  const enabledProcesses = processes.filter((process) => calculateProcessScores(process).isPSMIEnabled).length;
  const dashboardRows: SheetData = Array.from({ length: 35 }, () => ['']);
  dashboardRows[0] = [{ value: 'DASHBOARD · DIAGNÓSTICO OPERATIVO', columnSpan: 12, fontWeight: 'bold', fontSize: 20, textColor: '#FFFFFF', backgroundColor: NAVY, height: 38, alignVertical: 'center' }];
  dashboardRows[1] = [{ value: `${companyName} · ${downloadDate}`, columnSpan: 15, textColor: NAVY, backgroundColor: '#EAF0F3', fontWeight: 'bold' }];
  dashboardRows[3] = [
    { value: 'ÁREAS', columnSpan: 3, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: NAVY, align: 'center' },
    null, null,
    { value: 'PROCESOS', columnSpan: 3, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: NAVY, align: 'center' },
    null, null,
    { value: 'APTOS PSMI', columnSpan: 3, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: NAVY, align: 'center' },
    null, null,
    { value: 'RESULTADO R', columnSpan: 3, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: TERRACOTTA, align: 'center' },
    null, null,
    { value: 'ESTADO', columnSpan: 3, fontWeight: 'bold', textColor: '#FFFFFF', backgroundColor: TERRACOTTA, align: 'center' },
    null, null,
  ];
  dashboardRows[4] = [
    { value: areas.length, columnSpan: 3, fontWeight: 'bold', fontSize: 18, align: 'center', backgroundColor: WARM },
    null, null,
    { value: processes.length, columnSpan: 3, fontWeight: 'bold', fontSize: 18, align: 'center', backgroundColor: WARM },
    null, null,
    { value: enabledProcesses, columnSpan: 3, fontWeight: 'bold', fontSize: 18, align: 'center', backgroundColor: WARM },
    null, null,
    { value: sustainableScore, columnSpan: 3, fontWeight: 'bold', fontSize: 18, align: 'center', backgroundColor: '#FFF2ED', format: '0.00' },
    null, null,
    { value: sustainableScore >= 60 ? 'APTO' : 'EN DESARROLLO', columnSpan: 3, fontWeight: 'bold', align: 'center', backgroundColor: sustainableScore >= 60 ? '#DDEFE7' : '#FFF2ED', textColor: sustainableScore >= 60 ? '#245B48' : '#A7472F' },
    null, null,
  ];
  dashboardRows[33] = sectionRow('RESULTADOS POR ÁREA', 15);
  dashboardRows[34] = headerRow(['Área', 'J / 50', 'Q / 50', 'R / 100', 'Procesos', 'Aptos PSMI']);
  areas.forEach((area) => {
    const score = areaScoresMap[area.id] || { J: 0, Q: 0, R: 0, count: 0, enabledCount: 0 };
    dashboardRows.push(styledRow([area.name, score.J, score.Q, score.R, score.count, score.enabledCount], { borderColor: BORDER, borderStyle: 'thin', backgroundColor: dashboardRows.length % 2 ? '#FFFFFF' : WARM }));
  });
  const wsDashboard = makeSheet('Dashboard', dashboardRows, Array.from({ length: 15 }, () => 14), {
    stickyRowsCount: 2,
    images: [...radarBlobs.map((content, index) => ({
      content,
      contentType: 'image/png',
      width: 520,
      height: 520,
      dpi: 96,
      anchor: { row: 7, column: 5 },
      title: 'Radar Comparativo Integral',
      description: 'Gráfico generado con los datos vigentes al momento de la exportación.',
    })), {
      content: logoBlob,
      contentType: 'image/png',
      width: 72,
      height: 72,
      dpi: 96,
      anchor: { row: 1, column: 14 },
      title: 'IDPN',
      description: 'Identidad visual de Diagnóstico Operativo.',
    }],
  });

  // Clean filename
  const cleanName = companyName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${cleanName}_Auditoria_Dopyme_PSMI.xlsx`;

  await writeXlsxFile([wsDashboard, wsResumen, wsDopyme, wsPSMI]).toFile(filename);
}
