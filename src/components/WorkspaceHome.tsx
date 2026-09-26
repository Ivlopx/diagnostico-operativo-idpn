import React, { useState } from 'react';
import {
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
  Building,
  Activity,
  Award,
  HelpCircle,
  RotateCcw,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { AreaDoc, ProcessDoc, calculateProcessScores } from '../types';
import { clearWorkspaceData, resetAllProcessesToBlank } from '../utils/workspaceService';

interface WorkspaceHomeProps {
  companyName: string;
  workspaceId: string;
  areas: AreaDoc[];
  processes: ProcessDoc[];
  sustainableScore: number;
  onSelectActivity: (activity: 'dopyme' | 'psmi') => void;
  onExportPdf: () => void;
}

export const WorkspaceHome: React.FC<WorkspaceHomeProps> = ({
  companyName,
  workspaceId,
  areas,
  processes,
  sustainableScore,
  onSelectActivity,
  onExportPdf,
}) => {
  // Compute counts
  const totalAreas = areas.length;
  const totalProcesses = processes.length;

  let enabledProcessesCount = 0;
  let totalMappedPSMIs = 0;

  processes.forEach((p) => {
    const scores = calculateProcessScores(p);
    if (scores.isPSMIEnabled) {
      enabledProcessesCount++;
    }
    if (p.psmis && p.psmis.length > 0) {
      totalMappedPSMIs += p.psmis.length;
    }
  });

  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const percentPSMIReady = totalProcesses > 0
    ? Math.round((enabledProcessesCount / totalProcesses) * 100)
    : 0;

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearWorkspaceData(workspaceId);
      setShowClearModal(false);
    } catch (err) {
      console.error('Error clearing workspace:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleResetScores = async () => {
    setIsClearing(true);
    try {
      await resetAllProcessesToBlank(workspaceId);
      setShowClearModal(false);
    } catch (err) {
      console.error('Error resetting process scores:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto min-w-0 px-3 py-5 sm:px-6 sm:py-8">
      {/* Audit Header Dossier */}
      <div className="bg-white border border-[#D9D5CC] p-5 sm:p-8 rounded-xl mb-6 sm:mb-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#173B57]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-[#F6F4EF] text-[#173B57] border border-[#D9D5CC] text-[11px] font-mono uppercase tracking-widest mb-3">
              Expediente Maestro de Operaciones
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#17212B] tracking-tight">
              {companyName || 'Expediente Corporativo'}
            </h1>
            <p className="text-sm text-[#17212B]/70 mt-1 max-w-2xl">
              Diagnóstico Operativo de Pequeñas y Medianas Empresas (DOPYME) e identificación de Procesos Sujetos a Mejora Inmediata (PSMI), con información compartida.
            </p>

            {(totalAreas > 0 || totalProcesses > 0) && (
              <div className="mt-3">
                <button
                  onClick={() => setShowClearModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#C85B3C] hover:bg-[#FFF2ED] border border-[#D9D5CC] hover:border-[#C85B3C]/40 rounded-xl transition-colors cursor-pointer bg-white"
                  title="Vaciar o reiniciar datos para comenzar desde cero"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Empezar en blanco (Vaciar datos)</span>
                </button>
              </div>
            )}
          </div>

          {/* Master score card */}
          <div className="w-full bg-[#F6F4EF] border border-[#D9D5CC] p-4 rounded-xl text-center sm:w-auto sm:shrink-0 sm:min-w-[200px]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#17212B]/60 block mb-1">
              Resultado Sustentable
            </span>
            <div className="font-serif text-3xl sm:text-4xl font-bold text-[#173B57]">
              {sustainableScore}
              <span className="text-sm font-sans text-[#17212B]/50 font-normal"> / 100</span>
            </div>
            <div className="mt-2 text-[11px] font-mono text-[#17212B]/70">
              {sustainableScore >= 80 ? (
                <span className="text-[#173B57] font-semibold">● Nivel Avanzado</span>
              ) : sustainableScore >= 60 ? (
                <span className="text-[#173B57]">● Madurez Operativa Apta</span>
              ) : (
                <span className="text-[#C85B3C]">● En Calibración Inicial</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two Big Activity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* CARD 1: DOPYME */}
        <div
          onClick={() => onSelectActivity('dopyme')}
          className="group cursor-pointer bg-white border border-[#D9D5CC] hover:border-[#173B57] transition-all p-6 sm:p-7 rounded-xl shadow-sm relative flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#173B57] group-hover:h-1.5 transition-all" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold bg-[#F6F4EF] text-[#173B57] border border-[#D9D5CC]">
                PASO 1
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#F6F4EF] group-hover:bg-[#173B57]/10 border border-[#D9D5CC] flex items-center justify-center text-[#173B57] transition-colors">
                <Layers className="w-5 h-5" />
              </div>
            </div>

            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17212B] group-hover:text-[#173B57] transition-colors">
              DOPYME
            </h2>
            <p className="text-xs font-mono uppercase text-[#17212B]/60 tracking-wider mt-0.5">
              Diagnóstico Operativo de Pequeñas y Medianas Empresas
            </p>

            <p className="text-sm text-[#17212B]/75 mt-3 leading-relaxed">
              Evalúa los criterios de operación (O, P, E, A, M/B/C) y el nivel de madurez formal (K) de cada departamento para calcular los puntajes J, Q y R.
            </p>

            {/* Dopyme Summary Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#D9D5CC]">
              <div className="bg-[#F6F4EF]/60 p-3 border border-[#D9D5CC]/70 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-[#17212B]/60 block">Áreas registradas</span>
                <span className="font-mono text-xl font-bold text-[#17212B]">{totalAreas}</span>
              </div>
              <div className="bg-[#F6F4EF]/60 p-3 border border-[#D9D5CC]/70 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-[#17212B]/60 block">Procesos evaluados</span>
                <span className="font-mono text-xl font-bold text-[#17212B]">{totalProcesses}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 flex items-center justify-between text-xs font-semibold text-[#173B57] group-hover:translate-x-1 transition-transform">
            <span>Abrir Diagnóstico DOPYME →</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* CARD 2: PSMI */}
        <div
          onClick={() => onSelectActivity('psmi')}
          className="group cursor-pointer bg-white border border-[#D9D5CC] hover:border-[#173B57] transition-all p-6 sm:p-7 rounded-xl shadow-sm relative flex flex-col justify-between"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-[#17212B] group-hover:bg-[#173B57] group-hover:h-1.5 transition-all" />

          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold bg-[#F6F4EF] text-[#17212B] border border-[#D9D5CC]">
                PASO 2
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#F6F4EF] group-hover:bg-[#173B57]/10 border border-[#D9D5CC] flex items-center justify-center text-[#17212B] group-hover:text-[#173B57] transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>

            <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#17212B] group-hover:text-[#173B57] transition-colors">
              PSMI
            </h2>
            <p className="text-xs font-mono uppercase text-[#17212B]/60 tracking-wider mt-0.5">
              Proceso Sujeto a Mejora Inmediata
            </p>

            <p className="text-sm text-[#17212B]/75 mt-3 leading-relaxed">
              Documentación técnica de actividades paso a paso, clasificación de valor, criticidad, responsabilidades y tiempos de ciclo. Exclusivo para procesos con madurez ≥ 60 puntos.
            </p>

            {/* PSMI Summary Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-6 pt-5 border-t border-[#D9D5CC]">
              <div className="bg-[#F6F4EF]/60 p-3 border border-[#D9D5CC]/70 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-[#17212B]/60 block">Habilitados para PSMI</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-xl font-bold text-[#173B57]">{enabledProcessesCount}</span>
                  <span className="text-xs text-[#17212B]/50 font-mono">/ {totalProcesses}</span>
                </div>
              </div>
              <div className="bg-[#F6F4EF]/60 p-3 border border-[#D9D5CC]/70 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-[#17212B]/60 block">Registros PSMI</span>
                <span className="font-mono text-xl font-bold text-[#17212B]">{totalMappedPSMIs}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 flex items-center justify-between text-xs font-semibold text-[#17212B] group-hover:text-[#173B57] group-hover:translate-x-1 transition-all">
            <span>Abrir Procesos Sujetos a Mejora Inmediata →</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Audit rules & instructions box */}
      <div className="border border-[#D9D5CC] bg-white p-5 rounded-xl">
        <h3 className="font-serif text-sm font-semibold text-[#17212B] mb-2 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#173B57]" />
          Reglas del Expediente de Auditoría
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#17212B]/70">
          <div>
            <strong className="text-[#17212B] block mb-0.5">1. Colaboración Compartida</strong>
            Cada proceso se guarda de forma aislada. Varios miembros del equipo pueden calibrar diferentes procesos y consultar los cambios mediante la actualización periódica.
          </div>
          <div>
            <strong className="text-[#17212B] block mb-0.5">2. Umbral de Madurez Fijo (60%)</strong>
            Un proceso únicamente puede ser mapeado en PSMI si su Resultado global (R = J + Q) es igual o superior a 60 puntos.
          </div>
          <div>
            <strong className="text-[#17212B] block mb-0.5">3. Descarga de Expediente Oficial</strong>
            Puedes emitir un informe PDF oficial en cualquier momento con las gráficas de radar comparativas y el desglose de procedimientos.
          </div>
        </div>
      </div>

      {/* Clear / Reset Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-[#17212B]/60 flex items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto bg-white border border-[#D9D5CC] p-5 sm:p-6 max-w-md w-full rounded-xl shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-3 text-[#C85B3C]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-serif text-lg font-bold text-[#17212B]">
                Empezar en blanco
              </h3>
            </div>

            <p className="text-xs text-[#17212B]/80 leading-relaxed">
              Elige cómo deseas limpiar la información para llenar tus campos desde cero sin datos predeterminados:
            </p>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleClearAll}
                disabled={isClearing}
                className="w-full text-left p-3 border border-[#C85B3C]/40 bg-[#FFF2ED] hover:bg-[#ffe8e0] rounded-xl transition-colors cursor-pointer"
              >
                <div className="font-bold text-xs text-[#C85B3C] flex items-center justify-between">
                  <span>1. Vaciar todo por completo</span>
                  <Trash2 className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-[#17212B]/70 mt-1">
                  Elimina todas las áreas, procesos y mapeos actuales para que ingreses tus propias áreas y procesos desde cero.
                </p>
              </button>

              <button
                onClick={handleResetScores}
                disabled={isClearing}
                className="w-full text-left p-3 border border-[#D9D5CC] bg-[#F6F4EF]/60 hover:bg-[#F6F4EF] rounded-xl transition-colors cursor-pointer"
              >
                <div className="font-bold text-xs text-[#17212B] flex items-center justify-between">
                  <span>2. Restablecer campos a blanco (0 pts)</span>
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <p className="text-[11px] text-[#17212B]/70 mt-1">
                  Mantiene los nombres de tus áreas y procesos, pero desmarca todas las casillas (O, P, E, A en 0, M/B/C en Ninguno, K en NE) y vacía los formularios PSMI.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-1.5 text-xs text-[#17212B]/70 hover:text-[#17212B] border border-[#D9D5CC] rounded-xl cursor-pointer hover:bg-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
