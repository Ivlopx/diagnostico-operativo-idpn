import PDFDocument from 'pdfkit';
import path from 'path';
import { existsSync } from 'fs';

export interface PDFExportPayload {
  companyName: string;
  generatedDate: string;
  sustainableScore: number;
  interpretation?: {
    hasData: boolean;
    scaleNote: string;
    general: string;
    areas: Array<{ areaName: string; J: number; Q: number; R: number; gap: number; balance: string; interpretation: string }>;
    gaps: Array<{ area: string; dimensions: string; difference: number; interpretation: string }>;
    balanceSummary: string;
    findings: string[];
    executive: string;
  };
  summaryCharts: {
    title: string;
    imageBase64: string;
  }[];
  areas: {
    id: string;
    name: string;
    J: number;
    Q: number;
    R: number;
    chartImageBase64?: string;
    processes: {
      name: string;
      O: number;
      P: number;
      E: number;
      A: number;
      levelMBC: string;
      levelK: string;
      J: number;
      Q: number;
      R: number;
      psmis?: {
        processName: string;
        entradas: string;
        salidas: string;
        unidadTiempo: string;
        elaboro: string;
        summary: {
          totalCompetencias: number;
          totalPuestos: number;
          sumTiempoProceso: number;
          totalCriticas: number;
          totalCiclicas: number;
          sumTiempoCriticas: number;
          totalCiclosCriticos: number;
        };
        actividades: {
          no: number;
          actividad: string;
          etapa: string;
          detalle?: string;
          competencia?: string;
          responsable: string;
          esCiclo: boolean;
          agregaValor?: boolean;
          esRequisito?: boolean;
          satisfaceCliente?: boolean;
          clasificacion: string;
          criticidad: string;
          tiempoActividad?: number;
          tiempoProceso: number;
          herramientas?: {
            formato?: string;
            registroInfo?: string;
            software?: string;
            links?: string;
            revisionCumplimiento?: string;
            instrucciones?: string;
          };
        }[];
      }[];
    }[];
  }[];
}

export function buildAuditPdfStream(payload: PDFExportPayload): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `DOPYME + PSMI - ${payload.companyName || 'Expediente'}`,
      Author: 'DOPYME + PSMI',
      Subject: 'Diagnóstico Operativo de Pequeñas y Medianas Empresas y Procesos Sujetos a Mejora Inmediata',
    },
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentWidth = pageWidth - 80;
  const logoPath = path.resolve(process.cwd(), 'dist/assets/idpn.png');
  const hasLogo = existsSync(logoPath);

  // Helpers
  const addHeader = (title: string, subtitle?: string) => {
    doc.save();
    doc.fillColor('#17212B').fontSize(16).font('Helvetica-Bold').text(title, 40, doc.y);
    if (subtitle) {
      doc.fillColor('#173B57').fontSize(10).font('Helvetica').text(subtitle, 40, doc.y + 2);
    }
    doc.strokeColor('#D9D5CC').lineWidth(1).moveTo(40, doc.y + 6).lineTo(pageWidth - 40, doc.y + 6).stroke();
    doc.restore();
    doc.y += 14;
  };

  const checkPageBreak = (neededHeight: number) => {
    if (doc.y + neededHeight > pageHeight - 50) {
      doc.addPage();
      // small top header
      doc.save();
      if (hasLogo) doc.image(logoPath, 40, 17, { fit: [22, 22], align: 'center', valign: 'center' });
      doc.fillColor('#7A8490').fontSize(8).font('Helvetica').text(
        `Expediente: ${payload.companyName || 'Empresa'} | DOPYME + PSMI`,
        hasLogo ? 68 : 40,
        25
      );
      doc.strokeColor('#D9D5CC').lineWidth(0.5).moveTo(40, 36).lineTo(pageWidth - 40, 36).stroke();
      doc.restore();
      doc.y = 45;
    }
  };

  // ---------------- COVER / HEADER LEDGER ----------------
  doc.rect(40, 40, contentWidth, 75).fillAndStroke('#FFFFFF', '#D9D5CC');
  doc.rect(40, 40, 6, 75).fill('#173B57');
  const scoreBoxWidth = 140;
  const scoreBoxX = pageWidth - 40 - scoreBoxWidth - 10;

  if (hasLogo) doc.image(logoPath, 54, 47, { fit: [58, 58], align: 'center', valign: 'center' });
  const coverTextX = hasLogo ? 120 : 55;
  doc.fillColor('#173B57').fontSize(9).font('Helvetica-Bold').text('DIAGNÓSTICO OPERATIVO', coverTextX, 52);
  doc.fillColor('#17212B').fontSize(18).font('Helvetica-Bold').text(payload.companyName || 'Empresa Sin Nombre', coverTextX, 65, { width: scoreBoxX - coverTextX - 10 });
  doc.fillColor('#7A8490').fontSize(8).font('Helvetica').text(
    `EXPEDIENTE DE AUDITORÍA Y MAPEO DE PROCESOS  •  FECHA: ${payload.generatedDate || new Date().toLocaleDateString('es-ES')}`,
    coverTextX,
    90
  );

  // Sustainable Score Callout Box on right
  doc.rect(scoreBoxX, 48, scoreBoxWidth, 58).fillAndStroke('#F6F4EF', '#173B57');
  doc.fillColor('#173B57').fontSize(8).font('Helvetica-Bold').text('RESULTADO SUSTENTABLE', scoreBoxX + 10, 56);
  doc.fillColor('#17212B').fontSize(22).font('Helvetica-Bold').text(
    `${payload.sustainableScore}`,
    scoreBoxX + 10,
    68
  );
  doc.fillColor('#7A8490').fontSize(9).font('Helvetica').text('/ 100 pts', scoreBoxX + 65, 78);

  doc.y = 135;

  // ---------------- RADAR CHARTS ROW (SUMMARY) ----------------
  addHeader('Visión Corporativa', 'Diagnóstico general de madurez y equilibrio operativo');

  const chartWidth = payload.summaryCharts.length === 1 ? Math.min(360, contentWidth) : (contentWidth - 20) / 3;
  const chartHeight = chartWidth;
  const chartY = doc.y + 4;

  payload.summaryCharts.forEach((chart, idx) => {
    const x = payload.summaryCharts.length === 1 ? (pageWidth - chartWidth) / 2 : 40 + idx * (chartWidth + 10);
    doc.rect(x, chartY, chartWidth, chartHeight + 20).fillAndStroke('#FFFFFF', '#D9D5CC');
    doc.fillColor('#17212B').fontSize(8).font('Helvetica-Bold').text(chart.title, x + 6, chartY + 8, {
      width: chartWidth - 12,
      align: 'center',
    });

    if (chart.imageBase64) {
      try {
        const base64Data = chart.imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imgBuffer = Buffer.from(base64Data, 'base64');
        doc.image(imgBuffer, x + 5, chartY + 22, { width: chartWidth - 10, height: chartHeight - 10 });
      } catch (e) {
        doc.fillColor('#7A8490').fontSize(8).text('Gráfica no disponible', x + 10, chartY + 60);
      }
    }
  });

  doc.y = chartY + chartHeight + 35;

  // ---------------- AREA SUMMARY TABLE ----------------
  addHeader('Resumen por Áreas de Negocio', 'Consolidado de Operación (J), Procesos (Q) y Resultado (R)');

  const tableX = 40;
  let curY = doc.y + 2;
  const colWidths = [180, 80, 80, 95, 80];

  // Table header
  doc.rect(tableX, curY, contentWidth, 18).fill('#17212B');
  doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold');
  doc.text('Área', tableX + 8, curY + 5);
  doc.text('Operación (J)', tableX + colWidths[0] + 8, curY + 5);
  doc.text('Procesos (Q)', tableX + colWidths[0] + colWidths[1] + 8, curY + 5);
  doc.text('Resultado (R)', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8, curY + 5);
  doc.text('Estatus PSMI', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, curY + 5);

  curY += 18;

  payload.areas.forEach((area) => {
    checkPageBreak(25);
    curY = doc.y;
    doc.rect(tableX, curY, contentWidth, 20).fillAndStroke('#FFFFFF', '#D9D5CC');
    doc.fillColor('#17212B').fontSize(9).font('Helvetica-Bold').text(area.name, tableX + 8, curY + 6, { width: 170 });
    doc.font('Helvetica').text(`${area.J} / 50`, tableX + colWidths[0] + 8, curY + 6);
    doc.text(`${area.Q} / 50`, tableX + colWidths[0] + colWidths[1] + 8, curY + 6);
    doc.font('Helvetica-Bold').fillColor('#173B57').text(`${area.R} / 100`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 8, curY + 6);

    const eligible = area.processes.filter((p) => p.R >= 60).length;
    doc.font('Helvetica').fillColor('#17212B').text(`${eligible}/${area.processes.length} habilitados`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 8, curY + 6);
    doc.y = curY + 20;
  });

  if (payload.interpretation) {
    const analysis = payload.interpretation;
    doc.addPage();
    addHeader('Interpretación Organizacional', 'Lectura objetiva de la relación entre Operación (J), Procesos (Q) y Resultado (R)');

    doc.fillColor('#173B57').fontSize(9).font('Helvetica-Bold').text('NOTA DE ESCALA');
    doc.moveDown(0.3);
    doc.fillColor('#17212B').fontSize(8.5).font('Helvetica').text(analysis.scaleNote, { lineGap: 2 });
    doc.moveDown(0.8);

    doc.fillColor('#173B57').fontSize(10).font('Helvetica-Bold').text('Interpretación general');
    doc.moveDown(0.3);
    doc.fillColor('#17212B').fontSize(9).font('Helvetica').text(analysis.general, { lineGap: 3 });
    doc.moveDown(0.8);

    if (analysis.areas.length) {
      doc.fillColor('#173B57').fontSize(10).font('Helvetica-Bold').text('Análisis por área');
      doc.moveDown(0.4);
      analysis.areas.forEach((area) => {
        checkPageBreak(70);
        doc.fillColor('#17212B').fontSize(9).font('Helvetica-Bold').text(
          `${area.areaName}  ·  J ${area.J}/50  ·  Q ${area.Q}/50  ·  R ${area.R}/100  ·  Brecha ${area.gap} pts`,
        );
        doc.fillColor('#17212B').fontSize(8.5).font('Helvetica').text(area.interpretation, { lineGap: 2 });
        doc.moveDown(0.6);
      });

      checkPageBreak(80);
      doc.fillColor('#173B57').fontSize(10).font('Helvetica-Bold').text('Principales brechas');
      doc.moveDown(0.3);
      if (analysis.gaps.length) {
        analysis.gaps.forEach((gap) => {
          checkPageBreak(45);
          doc.fillColor('#17212B').fontSize(8.5).font('Helvetica-Bold').text(`${gap.area}: ${gap.dimensions} · ${gap.difference} puntos`);
          doc.font('Helvetica').text(gap.interpretation, { lineGap: 2 });
          doc.moveDown(0.4);
        });
      } else {
        doc.fillColor('#17212B').fontSize(8.5).font('Helvetica').text('No se identificaron brechas de 20 puntos normalizados o más.');
      }

      checkPageBreak(75);
      doc.moveDown(0.7);
      doc.fillColor('#173B57').fontSize(10).font('Helvetica-Bold').text('Áreas con mayor equilibrio');
      doc.moveDown(0.3);
      doc.fillColor('#17212B').fontSize(8.5).font('Helvetica').text(analysis.balanceSummary, { lineGap: 2 });

      checkPageBreak(100);
      doc.moveDown(0.8);
      doc.fillColor('#173B57').fontSize(10).font('Helvetica-Bold').text('Hallazgos principales');
      doc.moveDown(0.3);
      analysis.findings.forEach((finding, index) => {
        checkPageBreak(35);
        doc.fillColor('#17212B').fontSize(8.5).font('Helvetica').text(`${index + 1}. ${finding}`, { lineGap: 2 });
        doc.moveDown(0.25);
      });

      checkPageBreak(120);
      doc.moveDown(0.8);
      doc.rect(40, doc.y, contentWidth, 105).fillAndStroke('#EEF3F6', '#173B57');
      const executiveY = doc.y + 10;
      doc.fillColor('#173B57').fontSize(10).font('Helvetica-Bold').text('Interpretación ejecutiva', 52, executiveY);
      doc.fillColor('#17212B').fontSize(8.5).font('Helvetica').text(analysis.executive, 52, executiveY + 16, { width: contentWidth - 24, lineGap: 2 });
      doc.y = executiveY + 105;
    }
  }

  // ---------------- DETAILED SECTIONS PER AREA ----------------
  payload.areas.forEach((area, aIdx) => {
    doc.addPage();
    addHeader(`Área ${aIdx + 1}: ${area.name}`, `J: ${area.J} pts | Q: ${area.Q} pts | Resultado: ${area.R}/100 pts`);

    // Area Radar chart and info
    const rowY = doc.y;
    if (area.chartImageBase64) {
      try {
        const imgBuffer = Buffer.from(area.chartImageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        doc.image(imgBuffer, 40, rowY, { width: 170, height: 170 });
      } catch (e) {
        doc.rect(40, rowY, 170, 170).stroke('#D9D5CC');
      }
    }

    // Process summary text box beside radar
    const infoX = 225;
    const infoW = contentWidth - 185;
    doc.rect(infoX, rowY, infoW, 170).fillAndStroke('#F6F4EF', '#D9D5CC');
    doc.fillColor('#17212B').fontSize(11).font('Helvetica-Bold').text('Diagnóstico Operativo DOPYME del Área', infoX + 12, rowY + 12);
    doc.fillColor('#17212B').fontSize(9).font('Helvetica').text(
      `Esta área cuenta con un total de ${area.processes.length} procesos evaluados.\n` +
      `Puntaje promedio de Operación (J): ${area.J} / 50 pts\n` +
      `Puntaje promedio de Procesos (Q): ${area.Q} / 50 pts\n` +
      `Resultado de Madurez del Área (R): ${area.R} / 100 pts\n\n` +
      `Regla PSMI (≥ 60 pts): ${area.processes.filter(p => p.R >= 60).length} de ${area.processes.length} procesos pueden clasificarse como Procesos Sujetos a Mejora Inmediata.`,
      infoX + 12,
      rowY + 32,
      { width: infoW - 24, lineGap: 3 }
    );

    doc.y = rowY + 185;

    // Detailed table of processes
    doc.fillColor('#17212B').fontSize(11).font('Helvetica-Bold').text('Detalle de Criterios por Proceso (Dopyme)', 40, doc.y);
    doc.moveDown(0.3);

    // Columns: Proceso, O, P, E, A, M/B/C, K, J, Q, R, PSMI
    const pTableX = 40;
    let py = doc.y;
    const pCols = [140, 25, 25, 25, 25, 45, 65, 35, 35, 40, 55];

    doc.rect(pTableX, py, contentWidth, 18).fill('#F6F4EF');
    doc.fillColor('#17212B').fontSize(7.5).font('Helvetica-Bold');
    doc.text('Proceso', pTableX + 5, py + 5);
    doc.text('O', pTableX + pCols[0] + 6, py + 5);
    doc.text('P', pTableX + pCols[0] + pCols[1] + 6, py + 5);
    doc.text('E', pTableX + pCols[0] + pCols[1] * 2 + 6, py + 5);
    doc.text('A', pTableX + pCols[0] + pCols[1] * 3 + 6, py + 5);
    doc.text('M/B/C', pTableX + pCols[0] + pCols[1] * 4 + 4, py + 5);
    doc.text('Nivel K', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + 4, py + 5);
    doc.text('J', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + 4, py + 5);
    doc.text('Q', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + pCols[7] + 4, py + 5);
    doc.text('R', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + pCols[7] + pCols[8] + 4, py + 5);
    doc.text('PSMI', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + pCols[7] + pCols[8] + pCols[9] + 4, py + 5);

    py += 18;

    area.processes.forEach((p) => {
      checkPageBreak(22);
      py = doc.y;
      doc.rect(pTableX, py, contentWidth, 18).fillAndStroke('#FFFFFF', '#D9D5CC');
      doc.fillColor('#17212B').fontSize(7.5).font('Helvetica').text(p.name, pTableX + 5, py + 5, { width: 130 });

      doc.text(p.O ? '5' : '0', pTableX + pCols[0] + 8, py + 5);
      doc.text(p.P ? '5' : '0', pTableX + pCols[0] + pCols[1] + 8, py + 5);
      doc.text(p.E ? '5' : '0', pTableX + pCols[0] + pCols[1] * 2 + 8, py + 5);
      doc.text(p.A ? '5' : '0', pTableX + pCols[0] + pCols[1] * 3 + 8, py + 5);

      const mbcLabels: Record<string, string> = { NONE: '-', M: 'M (10)', B: 'B (20)', C: 'C (30)' };
      doc.text(mbcLabels[p.levelMBC] || p.levelMBC || '-', pTableX + pCols[0] + pCols[1] * 4 + 4, py + 5);
      doc.text(p.levelK || 'NE', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + 4, py + 5);

      doc.text(String(p.J), pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + 4, py + 5);
      doc.text(String(p.Q), pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + pCols[7] + 4, py + 5);

      // R & PSMI status
      const isOk = p.R >= 60;
      doc.font('Helvetica-Bold').fillColor(isOk ? '#173B57' : '#C85B3C');
      doc.text(String(p.R), pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + pCols[7] + pCols[8] + 4, py + 5);

      doc.fontSize(6.5).text(isOk ? 'HABILITADO' : 'BLOQUEADO', pTableX + pCols[0] + pCols[1] * 4 + pCols[5] + pCols[6] + pCols[7] + pCols[8] + pCols[9] + 2, py + 5);

      doc.y = py + 18;
    });

    // ---------------- FULL PSMI SECTION FOR THIS AREA ----------------
    const processesWithPSMI = area.processes.filter(
      (p) => p.psmis && p.psmis.length > 0
    );

    if (processesWithPSMI.length > 0) {
      doc.addPage();
      addHeader(
        `Procesos Sujetos a Mejora Inmediata: ${area.name}`,
        'Mapeo exhaustivo de actividades, valor agregado, criticidad, herramientas y tiempos'
      );

      processesWithPSMI.forEach((p) => {
        (p.psmis || []).forEach((psmi, psmiIdx) => {
          checkPageBreak(120);

          // Header Card of this PSMI
          const psmiBoxY = doc.y;
          doc.rect(40, psmiBoxY, contentWidth, 75).fillAndStroke('#FFFFFF', '#D9D5CC');
          doc.rect(40, psmiBoxY, 5, 75).fill('#173B57');

          doc.fillColor('#173B57').fontSize(8).font('Helvetica-Bold').text(
            `PROCEDIMIENTO PSMI #${psmiIdx + 1}  •  PROCESO ASOCIADO: ${p.name.toUpperCase()} (R: ${p.R}/100)`,
            52,
            psmiBoxY + 8
          );
          doc.fillColor('#17212B').fontSize(12).font('Helvetica-Bold').text(
            psmi.processName || p.name,
            52,
            psmiBoxY + 19
          );

          // Metadata Grid: Entradas, Salidas, Unidad y Elaboró
          doc.fillColor('#17212B').fontSize(7.5).font('Helvetica');
          doc.text(`Entradas: ${psmi.entradas || 'No especificadas'}`, 52, psmiBoxY + 36, { width: contentWidth - 30 });
          doc.text(`Salidas: ${psmi.salidas || 'No especificadas'}`, 52, psmiBoxY + 48, { width: contentWidth - 30 });
          doc.text(
            `Unidad de Tiempo: ${psmi.unidadTiempo || 'Minutos'}   |   Elaboró: ${psmi.elaboro || 'No asignado'}`,
            52,
            psmiBoxY + 60,
            { width: contentWidth - 30 }
          );

          doc.y = psmiBoxY + 82;

          // 7 KPI boxes for this PSMI
          const s = psmi.summary || {
            totalCompetencias: 0,
            totalPuestos: 0,
            sumTiempoProceso: 0,
            totalCriticas: 0,
            totalCiclicas: 0,
            sumTiempoCriticas: 0,
            totalCiclosCriticos: 0,
          };

          const kpiW = (contentWidth - 18) / 7;
          const kpiY = doc.y;
          const kpis = [
            { label: 'PUESTOS', val: `${s.totalPuestos}` },
            { label: 'COMPETENCIAS', val: `${s.totalCompetencias}` },
            { label: 'T. PROCESO', val: `${s.sumTiempoProceso} ${psmi.unidadTiempo || 'min'}` },
            { label: 'ACTIVIDADES', val: `${psmi.actividades?.length || 0}` },
            { label: 'CRÍTICAS', val: `${s.totalCriticas}` },
            { label: 'CÍCLICAS', val: `${s.totalCiclicas}` },
            { label: 'CÍCLICAS Y CRÍT.', val: `${s.totalCiclosCriticos}` },
          ];

          kpis.forEach((kpi, kIdx) => {
            const kX = 40 + kIdx * (kpiW + 3);
            doc.rect(kX, kpiY, kpiW, 28).fillAndStroke('#F6F4EF', '#D9D5CC');
            doc.fillColor('#17212B').fontSize(6).font('Helvetica-Bold').text(kpi.label, kX + 2, kpiY + 4, {
              width: kpiW - 4,
              align: 'center',
            });
            doc.fillColor('#173B57').fontSize(8.5).font('Helvetica-Bold').text(kpi.val, kX + 2, kpiY + 14, {
              width: kpiW - 4,
              align: 'center',
            });
          });

          doc.y = kpiY + 35;

          // ACTIVITIES SECTION
          if (!psmi.actividades || psmi.actividades.length === 0) {
            checkPageBreak(30);
            doc.rect(40, doc.y, contentWidth, 25).fillAndStroke('#FFFFFF', '#D9D5CC');
            doc.fillColor('#7A8490').fontSize(8).font('Helvetica').text('No se han registrado actividades para este procedimiento.', 50, doc.y + 8);
            doc.y += 30;
          } else {
            doc.fillColor('#17212B').fontSize(9).font('Helvetica-Bold').text(
              `Secuencia de Actividades (${psmi.actividades.length})`,
              40,
              doc.y
            );
            doc.moveDown(0.4);

            psmi.actividades.forEach((act) => {
              // Estimate height for page break
              const hasDetalle = !!act.detalle && act.detalle.trim().length > 0;
              const h = act.herramientas || {};
              const filledTools = [
                h.formato && `Formato: ${h.formato}`,
                h.registroInfo && `Registro: ${h.registroInfo}`,
                h.software && `Software: ${h.software}`,
                h.links && `Links: ${h.links}`,
                h.revisionCumplimiento && `Revisión: ${h.revisionCumplimiento}`,
                h.instrucciones && `Instrucciones: ${h.instrucciones}`,
              ].filter(Boolean);
              const hasTools = filledTools.length > 0;

              // Conservative height check
              checkPageBreak(hasDetalle ? 95 : 75);

              const isCritica = act.criticidad === 'CRITICA';
              const isEliminar = act.clasificacion === 'ELIMINAR';
              const cardY = doc.y;

              // Card Top Header Bar (No, Actividad, Etapa, Tiempos)
              doc.rect(40, cardY, contentWidth, 18).fill('#17212B');
              doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold').text(
                `#${act.no}  ${act.actividad || 'Sin nombre'}`,
                48,
                cardY + 5,
                { width: 310 }
              );

              doc.fillColor('#D9D5CC').fontSize(7.5).font('Helvetica').text(
                `${act.etapa ? `Etapa: ${act.etapa}  |  ` : ''}Sin demora: ${act.tiempoActividad || 0}  |  Con demora: ${act.tiempoProceso || 0} ${psmi.unidadTiempo || 'min'}`,
                360,
                cardY + 5,
                { width: contentWidth - 325, align: 'right' }
              );

              let bodyY = cardY + 23;

              // Badges & Value Criteria Row
              doc.save();
              // Clasificación Badge
              doc.font('Helvetica-Bold').fontSize(7.5);
              if (isEliminar) {
                doc.fillColor('#C85B3C').text(`[CLASIFICACIÓN: ${act.clasificacion}]`, 48, bodyY);
              } else {
                doc.fillColor('#173B57').text(`[CLASIFICACIÓN: ${act.clasificacion}]`, 48, bodyY);
              }

              // Criticidad Badge
              if (isCritica) {
                doc.fillColor('#C85B3C').text(`[CRITICIDAD: CRÍTICA]`, 185, bodyY);
              } else {
                doc.fillColor('#17212B').text(`[CRITICIDAD: NORMAL]`, 185, bodyY);
              }

              // Ciclo Badge
              doc.fillColor(act.esCiclo ? '#173B57' : '#7A8490').text(
                act.esCiclo ? `[CÍCLICA: SÍ]` : `[CÍCLICA: NO]`,
                300,
                bodyY
              );

              // 3 Criteria values
              doc.fillColor('#17212B').font('Helvetica').fontSize(7).text(
                `Agrega Valor: ${act.agregaValor ? 'Sí' : 'No'}  |  Es Requisito: ${act.esRequisito ? 'Sí' : 'No'}  |  Satisface Cliente: ${act.satisfaceCliente ? 'Sí' : 'No'}`,
                380,
                bodyY,
                { width: contentWidth - 345, align: 'right' }
              );
              doc.restore();

              bodyY += 14;

              // Roles: Responsable & Competencia
              doc.fillColor('#17212B').fontSize(7.5).font('Helvetica-Bold').text('Puesto Responsable: ', 48, bodyY, { continued: true });
              doc.font('Helvetica').text(`${act.responsable || 'No asignado'}   |   `, { continued: true });
              doc.font('Helvetica-Bold').text('Competencia: ', { continued: true });
              doc.font('Helvetica').text(`${act.competencia || 'No especificada'}`);

              bodyY += 13;

              // Detalle Operativo (full multiline text)
              if (hasDetalle) {
                doc.fillColor('#173B57').fontSize(7.5).font('Helvetica-Bold').text('Descripción Operativa de la Actividad:', 48, bodyY);
                bodyY += 10;
                doc.fillColor('#17212B').fontSize(7.5).font('Helvetica').text(
                  act.detalle || '',
                  48,
                  bodyY,
                  { width: contentWidth - 18, lineGap: 2 }
                );
                bodyY = doc.y + 4;
              }

              // Herramientas e Instrumentos
              if (hasTools) {
                doc.fillColor('#173B57').fontSize(7.5).font('Helvetica-Bold').text('Herramientas e Instrumentos:', 48, bodyY);
                bodyY += 10;
                doc.fillColor('#17212B').fontSize(7).font('Helvetica').text(
                  filledTools.join('   •   '),
                  48,
                  bodyY,
                  { width: contentWidth - 18, lineGap: 2 }
                );
                bodyY = doc.y + 4;
              }

              // Outer Card Border and Left Accent Stripe
              const cardTotalHeight = bodyY - cardY + 5;
              doc.rect(40, cardY, contentWidth, cardTotalHeight).stroke('#D9D5CC');
              doc.rect(40, cardY, 4, cardTotalHeight).fill(isCritica ? '#C85B3C' : '#173B57');

              doc.y = bodyY + 10;
            });

            doc.moveDown(0.5);
          }
        });
      });
    }
  });

  // ----------------------------------------------------
  // ANEXO METODOLÓGICO: GUÍA DE INTERPRETACIÓN DOPYME Y USO DEL PSMI
  // ----------------------------------------------------
  doc.addPage();
  doc.rect(40, 40, contentWidth, 24).fill('#173B57');
  doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica-Bold').text(
    'ANEXO: GUÍA DE INTERPRETACIÓN DOPYME Y USO DEL PSMI',
    48,
    47
  );

  doc.y = 75;
  doc.fillColor('#17212B').fontSize(10).font('Helvetica-Bold').text(
    'Instrucciones para la interpretación y llenado del DOPYME'
  );
  doc.moveDown(0.4);

  doc.fontSize(7.5).font('Helvetica').fillColor('#17212B').text(
    'Al ingresar al DOPYME, encontrarás diferentes campos identificados con una sola letra. Cada letra representa un aspecto específico de la función evaluada y deberá interpretarse de la siguiente manera:',
    { width: contentWidth, lineGap: 2 }
  );
  doc.moveDown(0.4);

  // 1. Identificación
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('1. Identificación de la función');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B');
  doc.text('• O – Objetivo: ¿La función cuenta actualmente con un objetivo establecido y definido?');
  doc.text('• P – Políticas: ¿La función cuenta actualmente con políticas establecidas que orienten su ejecución?');
  doc.text('• E – Estructura: ¿La función se encuentra actualmente contemplada dentro del organigrama de la organización?');
  doc.text('• A – Líder: ¿La función cuenta actualmente con un líder o responsable definido?');
  doc.moveDown(0.4);

  // 2. Ejecución
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('2. Evaluación de la ejecución de las actividades');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B');
  doc.text('• M – Malas: Las actividades presentan deficiencias importantes, no se realizan de manera adecuada o requieren una mejora significativa.');
  doc.text('• B – Buenas: Las actividades se realizan de manera funcional, aunque pueden existir oportunidades de mejora.');
  doc.text('• C – Correctas: Las actividades se realizan de manera adecuada, estandarizada y conforme a lo esperado.');
  doc.moveDown(0.4);

  // 3. Importancia
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('3. Importancia de una correcta interpretación');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B').text(
    'La correcta interpretación y llenado del DOPYME es fundamental para profundizar en el análisis de las funciones existentes y determinar el nivel de madurez de cada una, lo que permitirá adecuar los procedimientos, instructivos y demás documentos necesarios de manera apropiada.\nEs importante considerar que el DOPYME no solamente permite evaluar la situación actual de la organización, sino que también funciona como una herramienta para proyectar las funciones y procesos que serán necesarios en el futuro, de acuerdo con el crecimiento y desarrollo esperado del negocio.',
    { width: contentWidth, lineGap: 2 }
  );
  doc.moveDown(0.4);

  // 4. Interpretación calificación
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('4. Interpretación de la calificación');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B').text(
    'Una calificación menor al 60 % no significa necesariamente que la función no cuente con formatos, registros o documentos relacionados con su operación. La calificación permite identificar el nivel de madurez de la función y determinar si existen las condiciones necesarias para desarrollar documentos de mayor nivel, como procedimientos e instructivos.\nPor lo tanto, una función puede contar actualmente con formatos o registros y, aun así, presentar un nivel de madurez insuficiente para desarrollar un procedimiento o instructivo de manera efectiva. Antes de documentar formalmente una función, es necesario asegurar que exista suficiente claridad sobre su objetivo, responsabilidades, estructura, forma de operación y controles.',
    { width: contentWidth, lineGap: 2 }
  );
  doc.moveDown(0.4);

  // 5. Funciones 0%
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('5. Funciones con calificación de 0 %');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B').text(
    'Cuando una función obtenga una calificación de 0 %, deberá considerarse como una función que actualmente no se encuentra desarrollada o implementada dentro de la organización. En estos casos, la función deberá incorporarse al modelo de negocio como una función o proceso por desarrollar, con el propósito de planificar su futura integración, definir sus necesidades y establecer las condiciones requeridas para su implementación.',
    { width: contentWidth, lineGap: 2 }
  );
  doc.moveDown(0.4);

  // 6. Consideración final
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('6. Consideración final');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B').text(
    'El DOPYME debe interpretarse como una herramienta de diagnóstico y planeación, no únicamente como una evaluación documental. La información obtenida permitirá identificar qué funciones existen actualmente, su nivel de madurez, cuáles requieren fortalecimiento, cuáles pueden formalizarse con procedimientos o instructivos, cuáles requieren primero desarrollo y cuáles serán necesarias para el crecimiento futuro.',
    { width: contentWidth, lineGap: 2 }
  );
  doc.moveDown(0.6);

  // SECCIÓN PSMI
  doc.rect(40, doc.y, contentWidth, 20).fill('#17212B');
  doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text(
    'USO DEL PSMI Y SU RELACIÓN CON LA CALIFICACIÓN',
    48,
    doc.y + 5
  );
  doc.y += 26;

  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B').text(
    'La calificación obtenida en el DOPYME permite determinar el nivel de madurez de una función y, con ello, identificar si se encuentra en condiciones de avanzar hacia un PSMI.\nUna calificación menor al 60 % no significa que la función no cuente con formatos, registros o documentos. La existencia de estos elementos no determina por sí misma que una función tenga el nivel de madurez necesario para desarrollar un PSMI.\nEl PSMI debe utilizarse cuando la función cuenta con un nivel de definición y madurez suficiente para estructurar, documentar y establecer de manera clara la forma en que se ejecutan sus actividades.',
    { width: contentWidth, lineGap: 2 }
  );
  doc.moveDown(0.4);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#173B57').text('Criterios de Aplicación PSMI:');
  doc.font('Helvetica').fontSize(7.5).fillColor('#17212B');
  doc.text('• Menor a 60 %: La función requiere fortalecimiento y maduración antes de desarrollar un PSMI. Primero deberán atenderse las condiciones necesarias para definir adecuadamente la función, sus responsabilidades, actividades y controles.');
  doc.text('• 60 % o más: La función cuenta con un nivel de madurez que permite considerar la elaboración o actualización de un PSMI, de acuerdo con las necesidades identificadas.');
  doc.text('• 0 %: La función no se encuentra actualmente desarrollada o implementada. En este caso, no se recomienda iniciar directamente con un PSMI. La función deberá incorporarse al modelo de negocio para planificar su integración, definir su alcance y establecer las condiciones necesarias para su posterior desarrollo.');
  doc.moveDown(0.4);

  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#17212B').text(
    'Es importante recordar que el PSMI no debe utilizarse únicamente para generar documentación, sino como una herramienta para formalizar y mejorar una función que ya cuenta con las condiciones mínimas para ser estructurada. En este sentido, el DOPYME permite determinar qué funciones están listas para documentarse, cuáles necesitan madurar y cuáles deben ser consideradas como funciones futuras dentro del modelo de negocio.',
    { width: contentWidth, lineGap: 2 }
  );

  return doc;
}
