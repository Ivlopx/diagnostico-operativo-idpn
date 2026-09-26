import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, Target, Shield, Compass, UserCheck, Layers } from 'lucide-react';

interface DopymeInstructionsProps {
  initiallyExpanded?: boolean;
}

export const DopymeInstructions: React.FC<DopymeInstructionsProps> = ({ initiallyExpanded = false }) => {
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
                Guía Metodológica Oficial
              </span>
            </div>
            <h2 className="font-serif text-base sm:text-lg font-bold text-[#17212B] mt-0.5">
              Instrucciones para la interpretación y llenado del DOPYME
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#173B57] font-semibold shrink-0">
          <span>{isOpen ? 'Ocultar instrucciones' : 'Ver instrucciones de llenado'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-5 sm:p-7 space-y-6 text-[#17212B] text-xs sm:text-sm leading-relaxed bg-white">
          <p className="text-xs sm:text-sm text-[#17212B]/80 italic border-l-2 border-[#173B57] pl-3 py-1 bg-[#F6F4EF]/30">
            Al ingresar al DOPYME, encontrarás diferentes campos identificados con una sola letra. Cada letra representa un aspecto específico de la función evaluada y deberá interpretarse de la siguiente manera:
          </p>

          {/* Section 1: Identificación de la función (O, P, E, A) */}
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-bold text-[#173B57] uppercase tracking-wide flex items-center gap-1.5 border-b border-[#D9D5CC] pb-1.5">
              <span>1. Identificación de la función</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#F6F4EF]/40 p-3 rounded-xl border border-[#D9D5CC]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#173B57] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    O
                  </span>
                  <span className="font-serif font-bold text-[#17212B]">Objetivo</span>
                </div>
                <p className="text-xs text-[#17212B]/75">
                  ¿La función cuenta actualmente con un objetivo establecido y definido?
                </p>
              </div>

              <div className="bg-[#F6F4EF]/40 p-3 rounded-xl border border-[#D9D5CC]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#173B57] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    P
                  </span>
                  <span className="font-serif font-bold text-[#17212B]">Políticas</span>
                </div>
                <p className="text-xs text-[#17212B]/75">
                  ¿La función cuenta actualmente con políticas establecidas que orienten su ejecución?
                </p>
              </div>

              <div className="bg-[#F6F4EF]/40 p-3 rounded-xl border border-[#D9D5CC]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#173B57] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    E
                  </span>
                  <span className="font-serif font-bold text-[#17212B]">Estructura</span>
                </div>
                <p className="text-xs text-[#17212B]/75">
                  ¿La función se encuentra actualmente contemplada dentro del organigrama de la organización?
                </p>
              </div>

              <div className="bg-[#F6F4EF]/40 p-3 rounded-xl border border-[#D9D5CC]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#173B57] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    A
                  </span>
                  <span className="font-serif font-bold text-[#17212B]">Líder</span>
                </div>
                <p className="text-xs text-[#17212B]/75">
                  ¿La función cuenta actualmente con un líder o responsable definido?
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Evaluación de la ejecución de las actividades (M, B, C) */}
          <div className="space-y-3">
            <h3 className="font-serif text-sm font-bold text-[#173B57] uppercase tracking-wide flex items-center gap-1.5 border-b border-[#D9D5CC] pb-1.5">
              <span>2. Evaluación de la ejecución de las actividades</span>
            </h3>
            <p className="text-xs text-[#17212B]/75">
              Las siguientes letras permiten indicar cómo se considera que actualmente se llevan a cabo las actividades relacionadas con las funciones evaluadas:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#FFF2ED] p-3 rounded-xl border border-[#C85B3C]/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#C85B3C] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    M
                  </span>
                  <span className="font-serif font-bold text-[#C85B3C]">Malas (10 pts)</span>
                </div>
                <p className="text-xs text-[#17212B]/80">
                  Las actividades presentan deficiencias importantes, no se realizan de manera adecuada o requieren una mejora significativa.
                </p>
              </div>

              <div className="bg-[#F6F4EF]/60 p-3 rounded-xl border border-[#D9D5CC]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#17212B] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    B
                  </span>
                  <span className="font-serif font-bold text-[#17212B]">Buenas (20 pts)</span>
                </div>
                <p className="text-xs text-[#17212B]/80">
                  Las actividades se realizan de manera funcional, aunque pueden existir oportunidades de mejora.
                </p>
              </div>

              <div className="bg-[#173B57]/10 p-3 rounded-xl border border-[#173B57]/40">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-5 h-5 rounded-xl bg-[#173B57] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    C
                  </span>
                  <span className="font-serif font-bold text-[#173B57]">Correctas (30 pts)</span>
                </div>
                <p className="text-xs text-[#17212B]/80">
                  Las actividades se realizan de manera adecuada, estandarizada y conforme a lo esperado.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Importancia de una correcta interpretación */}
          <div className="bg-[#F6F4EF]/40 p-4 rounded-xl border border-[#D9D5CC] space-y-2">
            <h3 className="font-serif text-sm font-bold text-[#17212B]">
              3. Importancia de una correcta interpretación
            </h3>
            <p className="text-xs text-[#17212B]/80 leading-relaxed">
              La correcta interpretación y llenado del DOPYME es fundamental para profundizar en el análisis de las funciones existentes y determinar el nivel de madurez de cada una, lo que permitirá adecuar los procedimientos, instructivos y demás documentos necesarios de manera apropiada.
            </p>
            <p className="text-xs text-[#17212B]/80 leading-relaxed">
              Es importante considerar que el DOPYME no solamente permite evaluar la situación actual de la organización, sino que también funciona como una herramienta para proyectar las funciones y procesos que serán necesarios en el futuro, de acuerdo con el crecimiento y desarrollo esperado del negocio.
            </p>
          </div>

          {/* Section 4: Interpretación de la calificación */}
          <div className="bg-white p-4 rounded-xl border border-[#D9D5CC] space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#173B57] text-white rounded-xl">
                Regla Clave
              </span>
              <h3 className="font-serif text-sm font-bold text-[#17212B]">
                4. Interpretación de la calificación
              </h3>
            </div>
            <p className="text-xs text-[#17212B]/85 leading-relaxed">
              <strong>Una calificación menor al 60 % no significa necesariamente que la función no cuente con formatos, registros o documentos relacionados con su operación.</strong>
            </p>
            <p className="text-xs text-[#17212B]/80 leading-relaxed">
              La calificación permite identificar el nivel de madurez de la función y determinar si existen las condiciones necesarias para desarrollar documentos de mayor nivel, como procedimientos e instructivos.
            </p>
            <p className="text-xs text-[#17212B]/80 leading-relaxed">
              Por lo tanto, una función puede contar actualmente con formatos o registros y, aun así, presentar un nivel de madurez insuficiente para desarrollar un procedimiento o instructivo de manera efectiva. Antes de documentar formalmente una función, es necesario asegurar que exista suficiente claridad sobre su objetivo, responsabilidades, estructura, forma de operación y controles.
            </p>
          </div>

          {/* Section 5: Funciones con calificación de 0 % */}
          <div className="bg-[#FFF2ED] p-4 rounded-xl border border-[#C85B3C]/40 space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#C85B3C] text-white rounded-xl">
                0 %
              </span>
              <h3 className="font-serif text-sm font-bold text-[#C85B3C]">
                5. Funciones con calificación de 0 %
              </h3>
            </div>
            <p className="text-xs text-[#17212B]/85 leading-relaxed">
              Cuando una función obtenga una calificación de 0 %, deberá considerarse como una función que actualmente no se encuentra desarrollada o implementada dentro de la organización.
            </p>
            <p className="text-xs text-[#17212B]/80 leading-relaxed">
              En estos casos, la función deberá incorporarse al modelo de negocio como una función o proceso por desarrollar, con el propósito de planificar su futura integración, definir sus necesidades y establecer las condiciones requeridas para su implementación.
            </p>
          </div>

          {/* Section 6: Consideración final */}
          <div className="bg-[#F6F4EF] p-4 rounded-xl border border-[#D9D5CC] space-y-2">
            <h3 className="font-serif text-sm font-bold text-[#17212B]">
              6. Consideración final
            </h3>
            <p className="text-xs text-[#17212B]/85 leading-relaxed">
              El DOPYME debe interpretarse como una herramienta de diagnóstico y planeación, no únicamente como una evaluación documental.
            </p>
            <p className="text-xs font-semibold text-[#173B57]">
              La información obtenida permitirá identificar:
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#17212B]/80 pl-2">
              <li className="flex items-start gap-1.5">
                <span className="text-[#173B57] font-bold">•</span>
                <span>Qué funciones existen actualmente.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#173B57] font-bold">•</span>
                <span>Qué nivel de madurez tiene cada función.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#173B57] font-bold">•</span>
                <span>Qué funciones requieren fortalecimiento.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#173B57] font-bold">•</span>
                <span>Qué funciones pueden ser formalizadas mediante procedimientos o instructivos.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#173B57] font-bold">•</span>
                <span>Qué funciones requieren primero una etapa de desarrollo.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[#173B57] font-bold">•</span>
                <span>Qué funciones serán necesarias para el crecimiento futuro de la organización.</span>
              </li>
            </ul>
            <p className="text-xs text-[#17212B]/80 pt-2 border-t border-[#D9D5CC]/60 leading-relaxed font-medium">
              Por ello, es importante que las respuestas reflejen la situación real de la función al momento de realizar el diagnóstico, evitando calificarla únicamente con base en la existencia de documentos o formatos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
