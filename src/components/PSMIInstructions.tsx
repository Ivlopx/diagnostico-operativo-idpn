import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface PSMIInstructionsProps {
  initiallyExpanded?: boolean;
}

export const PSMIInstructions: React.FC<PSMIInstructionsProps> = ({ initiallyExpanded = false }) => {
  const [isOpen, setIsOpen] = useState(initiallyExpanded);

  return (
    <div className="bg-white border border-[#D9D5CC] rounded-xl shadow-sm overflow-hidden mb-6 transition-all">
      {/* Header button to expand / collapse */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 bg-[#F6F4EF]/50 hover:bg-[#F6F4EF] transition-colors cursor-pointer border-b border-[#D9D5CC]/60"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#173B57] text-white flex items-center justify-center font-bold shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#173B57] font-bold bg-[#173B57]/10 px-1.5 py-0.5 rounded-xl">
                Criterio de Aplicación
              </span>
            </div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-[#17212B] mt-0.5">
              Uso del PSMI y su relación con la calificación
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#173B57] font-semibold shrink-0">
          <span>{isOpen ? 'Ocultar guía' : 'Ver guía y relación con calificación'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-5 sm:p-7 space-y-5 text-[#17212B] text-xs sm:text-sm leading-relaxed bg-white">
          <p className="text-xs sm:text-sm text-[#17212B]/85 leading-relaxed">
            La calificación obtenida en el DOPYME permite determinar el nivel de madurez de una función y, con ello, identificar si se encuentra en condiciones de avanzar hacia un PSMI.
          </p>

          <div className="bg-[#F6F4EF]/40 p-3.5 rounded-xl border-l-3 border-[#173B57] text-xs text-[#17212B]/85 space-y-1.5">
            <p>
              <strong>Una calificación menor al 60 % no significa que la función no cuente con formatos, registros o documentos.</strong> La existencia de estos elementos no determina por sí misma que una función tenga el nivel de madurez necesario para desarrollar un PSMI.
            </p>
            <p>
              El PSMI debe utilizarse cuando la función cuenta con un nivel de definición y madurez suficiente para estructurar, documentar y establecer de manera clara la forma en que se ejecutan sus actividades.
            </p>
          </div>

          {/* 3 Tiers Grid */}
          <div className="space-y-3 pt-1">
            <h3 className="font-serif text-xs font-bold text-[#173B57] uppercase tracking-wider">
              Criterios de Decisión por Rango de Calificación:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Tier 1: Menor a 60% */}
              <div className="bg-[#FFF2ED] p-4 rounded-xl border border-[#C85B3C]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#C85B3C]">
                    Menor a 60 %
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#C85B3C] text-white rounded-xl">
                    Bloqueado
                  </span>
                </div>
                <p className="text-xs text-[#17212B]/85 leading-relaxed">
                  La función requiere fortalecimiento y maduración antes de desarrollar un PSMI. Primero deberán atenderse las condiciones necesarias para definir adecuadamente la función, sus responsabilidades, actividades y controles.
                </p>
              </div>

              {/* Tier 2: 60% o más */}
              <div className="bg-[#173B57]/10 p-4 rounded-xl border border-[#173B57]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#173B57]">
                    60 % o más
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#173B57] text-white rounded-xl">
                    Habilitado
                  </span>
                </div>
                <p className="text-xs text-[#17212B]/85 leading-relaxed">
                  La función cuenta con un nivel de madurez que permite considerar la elaboración o actualización de un PSMI, de acuerdo con las necesidades identificadas.
                </p>
              </div>

              {/* Tier 3: 0% */}
              <div className="bg-[#F6F4EF] p-4 rounded-xl border border-[#D9D5CC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-[#17212B]">
                    0 %
                  </span>
                  <span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#17212B] text-white rounded-xl">
                    Por Desarrollar
                  </span>
                </div>
                <p className="text-xs text-[#17212B]/85 leading-relaxed">
                  La función no se encuentra actualmente desarrollada o implementada. En este caso, no se recomienda iniciar directamente con un PSMI. La función deberá incorporarse al modelo de negocio para planificar su integración, definir su alcance y establecer las condiciones necesarias para su posterior desarrollo.
                </p>
              </div>
            </div>
          </div>

          {/* Core Takeaway */}
          <div className="bg-white p-4 rounded-xl border border-[#D9D5CC] space-y-2 text-xs">
            <p className="text-[#17212B]/85 leading-relaxed">
              Es importante recordar que el PSMI no debe utilizarse únicamente para generar documentación, sino como una herramienta para formalizar y mejorar una función que ya cuenta con las condiciones mínimas para ser estructurada.
            </p>
            <p className="text-[#173B57] font-medium leading-relaxed border-t border-[#D9D5CC]/60 pt-2">
              En este sentido, el DOPYME permite determinar qué funciones están listas para documentarse, cuáles necesitan madurar y cuáles deben ser consideradas como funciones futuras dentro del modelo de negocio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
