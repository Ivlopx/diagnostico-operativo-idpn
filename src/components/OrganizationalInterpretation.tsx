import React from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, FileText } from 'lucide-react';
import type { OrganizationalInterpretation as Interpretation } from '../utils/organizationalInterpretation';

export const OrganizationalInterpretation: React.FC<{ analysis: Interpretation }> = ({ analysis }) => (
  <section className="overflow-hidden rounded-xl border border-[#D9D5CC] bg-white shadow-sm">
    <div className="border-b border-[#D9D5CC] bg-[#F6F4EF]/60 px-4 py-4 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#173B57]/10 text-[#173B57]"><FileText className="h-4 w-4" /></div>
        <div>
          <h2 className="font-serif text-base font-bold text-[#17212B]">Interpretación de resultados</h2>
          <p className="mt-0.5 text-xs text-[#17212B]/65">Análisis objetivo generado nuevamente con los datos actuales de la evaluación.</p>
        </div>
      </div>
    </div>

    <div className="space-y-6 p-4 sm:p-5">
      <div className="rounded-xl border border-[#D9D5CC] bg-[#F6F4EF]/35 p-3 text-xs leading-relaxed text-[#17212B]/75">
        <strong className="text-[#17212B]">Nota de escala:</strong> {analysis.scaleNote}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-2 font-serif text-sm font-bold"><BarChart3 className="h-4 w-4 text-[#173B57]" />Interpretación general</h3>
        <p className="text-sm leading-6 text-[#17212B]/80">{analysis.general}</p>
      </div>

      {analysis.hasData && <>
        <div>
          <h3 className="mb-3 font-serif text-sm font-bold">Análisis por área</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {analysis.areas.map((area) => (
              <article key={area.areaId} className="rounded-xl border border-[#D9D5CC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-serif text-sm font-bold text-[#17212B]">{area.areaName}</h4>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${area.balance === 'equilibrado' ? 'bg-[#EAF3EF] text-[#245B48]' : area.balance === 'desbalanceado' ? 'bg-[#FFF2ED] text-[#A7472F]' : 'bg-[#FFF7E8] text-[#8A5A20]'}`}>{area.balance}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-[#F6F4EF] p-3 text-center">
                  <div><dt className="text-[10px] text-[#17212B]/60">J original</dt><dd className="font-mono text-sm font-bold">{area.J}/50</dd></div>
                  <div><dt className="text-[10px] text-[#17212B]/60">Q original</dt><dd className="font-mono text-sm font-bold">{area.Q}/50</dd></div>
                  <div><dt className="text-[10px] text-[#17212B]/60">R global</dt><dd className="font-mono text-sm font-bold text-[#173B57]">{area.R}/100</dd></div>
                </dl>
                <p className="mt-3 text-xs leading-5 text-[#17212B]/75">{area.interpretation}</p>
              </article>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-serif text-sm font-bold">Principales brechas</h3>
          {analysis.gaps.length ? (
            <div className="overflow-x-auto rounded-xl border border-[#D9D5CC]">
              <table className="w-full min-w-[620px] text-left text-xs">
                <thead className="bg-[#173B57] text-white"><tr><th className="px-3 py-2">Área</th><th className="px-3 py-2">Dimensiones</th><th className="px-3 py-2 text-center">Diferencia</th><th className="px-3 py-2">Interpretación</th></tr></thead>
                <tbody className="divide-y divide-[#D9D5CC]">{analysis.gaps.map((gap) => <tr key={gap.area}><td className="px-3 py-3 font-bold">{gap.area}</td><td className="px-3 py-3">{gap.dimensions}</td><td className="px-3 py-3 text-center font-mono font-bold">{gap.difference} pts</td><td className="px-3 py-3 leading-5 text-[#17212B]/75">{gap.interpretation}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <p className="flex items-start gap-2 rounded-xl bg-[#EAF3EF] p-3 text-xs leading-5 text-[#245B48]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />No se identificaron brechas de 20 puntos normalizados o más.</p>}
        </div>

        <div>
          <h3 className="mb-2 font-serif text-sm font-bold">Áreas con mayor equilibrio</h3>
          <p className="text-sm leading-6 text-[#17212B]/80">{analysis.balanceSummary}</p>
        </div>

        <div>
          <h3 className="mb-2 font-serif text-sm font-bold">Hallazgos principales</h3>
          <ol className="space-y-2">{analysis.findings.map((finding, index) => <li key={finding} className="flex gap-3 text-sm leading-5 text-[#17212B]/80"><span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#173B57] text-[10px] font-bold text-white">{index + 1}</span><span>{finding}</span></li>)}</ol>
        </div>

        <div className="rounded-xl border-l-4 border-[#173B57] bg-[#EEF3F6] p-4">
          <h3 className="mb-2 font-serif text-sm font-bold text-[#173B57]">Interpretación ejecutiva</h3>
          <p className="text-sm leading-6 text-[#17212B]/85">{analysis.executive}</p>
        </div>
      </>}

      {!analysis.hasData && <p className="flex items-start gap-2 rounded-xl bg-[#FFF7E8] p-3 text-xs text-[#8A5A20]"><AlertTriangle className="h-4 w-4 shrink-0" />Agrega procesos y completa la evaluación para habilitar el análisis.</p>}
    </div>
  </section>
);
