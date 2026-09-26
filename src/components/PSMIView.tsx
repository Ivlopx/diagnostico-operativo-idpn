import React, { useState } from 'react';
import {
  Lock,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Briefcase,
  Layers,
  Award,
  CheckSquare,
  Square,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Repeat,
  CheckCircle2,
  FileText,
  Building2,
} from 'lucide-react';
import {
  AreaDoc,
  ProcessDoc,
  PSMIMapping,
  PSMIActivity,
  calculateProcessScores,
  calculateActivityClassification,
  calculateActivityCriticality,
  calculatePSMISummary,
  createEmptyPSMI,
} from '../types';
import { updateProcess } from '../utils/workspaceService';
import { PSMIInstructions } from './PSMIInstructions';

interface PSMIViewProps {
  workspaceId: string;
  areas: AreaDoc[];
  processes: ProcessDoc[];
  onNavigateToDopyme?: () => void;
}

export const PSMIView: React.FC<PSMIViewProps> = ({
  workspaceId,
  areas,
  processes,
  onNavigateToDopyme,
}) => {
  // Navigation / active process selector
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [activePSMIIndexMap, setActivePSMIIndexMap] = useState<Record<string, number>>({});
  const [expandedActivities, setExpandedActivities] = useState<Record<string, boolean>>({});
  const [confirmDeletePSMIIndex, setConfirmDeletePSMIIndex] = useState<{ procId: string; index: number } | null>(null);
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState<string | null>(null);
  const [filterAreaId, setFilterAreaId] = useState<string>('all');

  // Filter processes by area if selected
  const filteredProcesses = filterAreaId === 'all'
    ? processes
    : processes.filter((p) => p.areaId === filterAreaId);

  // Group processes by area for structured audit ledger presentation
  const processesByArea = areas.map((area) => ({
    area,
    processes: filteredProcesses.filter((p) => p.areaId === area.id),
  })).filter((group) => group.processes.length > 0);

  // Set default selected process if none or invalid
  const eligibleProcesses = processes.filter((p) => calculateProcessScores(p).isPSMIEnabled);
  const currentProcess = processes.find((p) => p.id === selectedProcessId) || eligibleProcesses[0] || processes[0];

  // Active PSMI index for the selected process
  const activePSMIIndex = currentProcess
    ? activePSMIIndexMap[currentProcess.id] || 0
    : 0;

  // Toggle activity expanded state
  const toggleActivity = (activityId: string) => {
    setExpandedActivities((prev) => ({
      ...prev,
      [activityId]: !prev[activityId],
    }));
  };

  // Helper to persist updated PSMIs through the SQL API
  const savePSMIs = async (processId: string, updatedPSMIs: PSMIMapping[]) => {
    try {
      await updateProcess(workspaceId, processId, { psmis: updatedPSMIs });
    } catch (err) {
      console.error('Error saving PSMI:', err);
    }
  };

  // Add another PSMI mapping to current process
  const handleAddAnotherPSMI = async (proc: ProcessDoc) => {
    const currentList = proc.psmis || [];
    const newPSMI = createEmptyPSMI('');
    const updated = [...currentList, newPSMI];
    await savePSMIs(proc.id, updated);
    setActivePSMIIndexMap((prev) => ({ ...prev, [proc.id]: updated.length - 1 }));
  };

  // Delete a PSMI mapping (ensure at least 1 remains)
  const handleDeletePSMI = async (proc: ProcessDoc, indexToDelete: number) => {
    const currentList = proc.psmis || [];
    if (currentList.length <= 1) {
      // Just reset to blank
      const resetPSMI = createEmptyPSMI('');
      await savePSMIs(proc.id, [resetPSMI]);
    } else {
      const updated = currentList.filter((_, idx) => idx !== indexToDelete);
      await savePSMIs(proc.id, updated);
      setActivePSMIIndexMap((prev) => ({ ...prev, [proc.id]: Math.max(0, indexToDelete - 1) }));
    }
    setConfirmDeletePSMIIndex(null);
  };

  // Update top-level field of active PSMI
  const handleUpdatePSMIField = async (
    proc: ProcessDoc,
    field: keyof PSMIMapping,
    value: any
  ) => {
    const list = [...(proc.psmis || [createEmptyPSMI(proc.name)])];
    const targetIdx = activePSMIIndex < list.length ? activePSMIIndex : 0;
    list[targetIdx] = {
      ...list[targetIdx],
      [field]: value,
    };
    await savePSMIs(proc.id, list);
  };

  // Add activity to current active PSMI (all fields blank for user to fill from scratch)
  const handleAddActivity = async (proc: ProcessDoc) => {
    const list = [...(proc.psmis || [createEmptyPSMI(proc.name)])];
    const targetIdx = activePSMIIndex < list.length ? activePSMIIndex : 0;
    const currentActivities = list[targetIdx].actividades || [];

    const newActivity: PSMIActivity = {
      id: 'act_' + Math.random().toString(36).substring(2, 11),
      no: currentActivities.length + 1,
      actividad: '',
      etapa: '',
      detalle: '',
      esCiclo: false,
      competencia: '',
      responsable: '',
      agregaValor: false,
      esRequisito: false,
      satisfaceCliente: false,
      herramientas: {
        formato: '',
        registroInfo: '',
        software: '',
        links: '',
        revisionCumplimiento: '',
        instrucciones: '',
      },
      tiempoActividad: 0,
      tiempoProceso: 0,
    };

    list[targetIdx] = {
      ...list[targetIdx],
      actividades: [...currentActivities, newActivity],
    };

    await savePSMIs(proc.id, list);
    // Auto expand the new activity
    setExpandedActivities((prev) => ({ ...prev, [newActivity.id]: true }));
  };

  // Update an activity
  const handleUpdateActivity = async (
    proc: ProcessDoc,
    activityId: string,
    updates: Partial<PSMIActivity>
  ) => {
    const list = [...(proc.psmis || [createEmptyPSMI(proc.name)])];
    const targetIdx = activePSMIIndex < list.length ? activePSMIIndex : 0;
    const currentActivities = list[targetIdx].actividades || [];

    const updatedActivities = currentActivities.map((act) => {
      if (act.id === activityId) {
        return { ...act, ...updates };
      }
      return act;
    });

    list[targetIdx] = {
      ...list[targetIdx],
      actividades: updatedActivities,
    };

    await savePSMIs(proc.id, list);
  };

  // Delete an activity
  const handleDeleteActivity = async (proc: ProcessDoc, activityId: string) => {
    const list = [...(proc.psmis || [createEmptyPSMI(proc.name)])];
    const targetIdx = activePSMIIndex < list.length ? activePSMIIndex : 0;
    const currentActivities = list[targetIdx].actividades || [];

    const filtered = currentActivities
      .filter((act) => act.id !== activityId)
      .map((act, idx) => ({ ...act, no: idx + 1 })); // renumber consecutive

    list[targetIdx] = {
      ...list[targetIdx],
      actividades: filtered,
    };

    await savePSMIs(proc.id, list);
    setConfirmDeleteActivityId(null);
  };

  // Active PSMI instance
  const currentPSMIList = currentProcess?.psmis || [createEmptyPSMI(currentProcess?.name || '')];
  const safePSMIIndex = activePSMIIndex < currentPSMIList.length ? activePSMIIndex : 0;
  const currentPSMI = currentPSMIList[safePSMIIndex] || createEmptyPSMI(currentProcess?.name || '');
  const psmiSummary = calculatePSMISummary(currentPSMI);
  const currentProcScore = currentProcess ? calculateProcessScores(currentProcess) : null;

  return (
    <div className="max-w-7xl mx-auto min-w-0 px-3 py-5 sm:px-6 sm:py-8">
      {/* Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#17212B] text-white rounded-xl">
              Paso 2 de 2
            </span>
            <h1 className="min-w-0 font-serif text-xl font-bold leading-tight text-[#17212B] sm:text-2xl">
              PSMI — Proceso Sujeto a Mejora Inmediata
            </h1>
          </div>
          <p className="text-xs text-[#17212B]/70 mt-1">
            Análisis formal de actividades del proceso sujeto a mejora. <strong>Regla fija del 60%:</strong> Requiere un Resultado (R) ≥ 60 puntos en DOPYME para habilitar la edición.
          </p>
        </div>

        {/* Area filter */}
        <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
          <span className="text-xs font-mono text-[#17212B]/60">Filtrar por Área:</span>
          <select
            value={filterAreaId}
            onChange={(e) => setFilterAreaId(e.target.value)}
            className="w-full bg-white border border-[#D9D5CC] focus:border-[#173B57] px-2.5 py-2 text-xs font-serif rounded-xl outline-hidden cursor-pointer sm:w-auto"
          >
            <option value="all">Todas las áreas ({processes.length} procesos)</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Methodological Guidance on PSMI and Dopyme Score */}
      <PSMIInstructions initiallyExpanded={false} />

      {/* Main 2-column Layout: Process Directory (Left) + PSMI Editor or Lock Card (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Process Ledger Directory */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-[#D9D5CC] p-4 rounded-xl shadow-sm">
            <h2 className="font-serif text-sm font-bold text-[#17212B] uppercase tracking-wide border-b border-[#D9D5CC] pb-2 mb-3">
              Directorio de Procesos
            </h2>

            {processesByArea.length === 0 ? (
              <p className="text-xs text-[#17212B]/50 italic py-4 text-center">
                No hay procesos para mostrar.
              </p>
            ) : (
              <div className="space-y-4">
                {processesByArea.map(({ area, processes: areaProcs }) => (
                  <div key={area.id} className="space-y-1.5">
                    <span className="text-[11px] font-serif font-bold text-[#173B57] block">
                      {area.name}
                    </span>
                    <div className="space-y-1">
                      {areaProcs.map((p) => {
                        const s = calculateProcessScores(p);
                        const isSelected = currentProcess?.id === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProcessId(p.id);
                              setActivePSMIIndexMap((prev) => ({ ...prev, [p.id]: 0 }));
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? 'bg-[#173B57] text-white border-[#173B57] shadow-sm'
                                : 'bg-[#F6F4EF]/40 hover:bg-[#F6F4EF] text-[#17212B] border-[#D9D5CC]/80'
                            }`}
                          >
                            <div className="truncate flex-1">
                              <span className="font-serif text-xs font-semibold block truncate">
                                {p.name}
                              </span>
                              <span className={`text-[10px] font-mono ${isSelected ? 'text-white/80' : 'text-[#17212B]/60'}`}>
                                R: {s.R} / 100 • {p.psmis?.length || 1} mapeo(s)
                              </span>
                            </div>

                            {/* Readiness badge */}
                            <div className="shrink-0">
                              {s.isPSMIEnabled ? (
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xl ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-[#173B57]/10 text-[#173B57]'
                                }`}>
                                  ✓ Habilitado
                                </span>
                              ) : (
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-xl flex items-center gap-1 ${
                                  isSelected ? 'bg-black/20 text-white' : 'bg-[#FFF2ED] text-[#C85B3C]'
                                }`}>
                                  <Lock className="w-2.5 h-2.5" />
                                  <span>{s.R}/60</span>
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: PSMI Detail or Locked Card */}
        <div className="lg:col-span-8 space-y-6">
          {!currentProcess ? (
            <div className="bg-white border border-[#D9D5CC] p-12 text-center rounded-xl shadow-sm">
              <p className="font-serif text-sm text-[#17212B]/60 italic">
                Selecciona un proceso del directorio lateral para visualizar su mapeo PSMI.
              </p>
            </div>
          ) : !currentProcScore?.isPSMIEnabled ? (
            /* LOCKED CARD (R < 60) */
            <div className="bg-white border-2 border-dashed border-[#C85B3C]/50 p-8 sm:p-10 rounded-xl shadow-sm text-center space-y-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#C85B3C]" />

              <div className="w-16 h-16 rounded-full bg-[#FFF2ED] border border-[#C85B3C]/30 flex items-center justify-center mx-auto text-[#C85B3C]">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#C85B3C] block mb-1">
                  Análisis PSMI Bloqueado
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#17212B]">
                  {currentProcess.name}
                </h2>
                <p className="text-xs font-mono text-[#17212B]/60 mt-1">
                  Área: {areas.find((a) => a.id === currentProcess.areaId)?.name || 'General'}
                </p>
              </div>

              {/* Score gap box */}
              <div className="bg-[#FFF2ED] border border-[#C85B3C]/30 p-5 rounded-xl max-w-md mx-auto">
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#17212B]/60 block">
                      Puntaje Actual (R)
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#C85B3C]">
                      {currentProcScore?.R}
                    </span>
                    <span className="text-xs font-mono text-[#17212B]/40"> / 100</span>
                  </div>

                  <div className="text-xl font-bold text-[#D9D5CC]">→</div>

                  <div>
                    <span className="text-[10px] font-mono uppercase text-[#17212B]/60 block">
                      Requerido (60%)
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#173B57]">
                      60
                    </span>
                    <span className="text-xs font-mono text-[#17212B]/40"> / 100</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#C85B3C]/20 text-xs text-[#17212B]/80 font-mono">
                  Faltan <strong className="text-[#C85B3C] text-sm">{currentProcScore?.pointsToPSMI} puntos</strong> para desbloquear la documentación PSMI de este proceso.
                </div>
              </div>

              {/* Methodological rule callout based on score */}
              <div className="max-w-lg mx-auto bg-[#F6F4EF]/60 border border-[#D9D5CC] p-4 rounded-xl text-left text-xs space-y-2 text-[#17212B]/85">
                <p className="font-bold text-[#C85B3C]">
                  {currentProcScore?.R === 0
                    ? 'Función con calificación 0 % (Por desarrollar)'
                    : 'Función con calificación menor al 60 % (Requiere maduración)'}
                </p>
                <p className="leading-relaxed">
                  {currentProcScore?.R === 0
                    ? 'La función no se encuentra actualmente desarrollada o implementada dentro de la organización. En este caso, no se recomienda iniciar directamente con un PSMI. La función deberá incorporarse al modelo de negocio para planificar su integración, definir su alcance y establecer las condiciones necesarias para su posterior desarrollo.'
                    : 'La función requiere fortalecimiento y maduración antes de desarrollar un PSMI. Primero deberán atenderse las condiciones necesarias para definir adecuadamente la función, sus responsabilidades, actividades y controles.'}
                </p>
                <p className="text-[11px] text-[#17212B]/70 italic border-t border-[#D9D5CC]/60 pt-2 leading-relaxed">
                  Nota metodológica: Una calificación menor al 60 % no significa que la función no cuente con formatos, registros o documentos. La existencia de estos elementos no determina por sí misma el nivel de madurez necesario para desarrollar un PSMI.
                </p>
              </div>

              <div>
                <button
                  onClick={onNavigateToDopyme}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#173B57] hover:bg-[#102D43] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  <span>Ir a Dopyme para calibrar este proceso</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* UNLOCKED PSMI EDITOR (R >= 60) */
            <div className="space-y-6">
              {/* Process Top Header & Multi-PSMI Tabs */}
              <div className="bg-white border border-[#D9D5CC] p-5 rounded-xl shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9D5CC] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#173B57] bg-[#173B57]/10 border border-[#173B57]/30 px-2 py-0.5 rounded-xl font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        HABILITADO (R: {currentProcScore?.R}/100)
                      </span>
                    </div>
                    <h2 className="font-serif text-xl font-bold text-[#17212B] mt-1">
                      {currentProcess.name}
                    </h2>
                  </div>

                  {/* Add another PSMI button */}
                  <button
                    onClick={() => handleAddAnotherPSMI(currentProcess)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white hover:bg-[#F6F4EF] text-[#173B57] border border-[#173B57] rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar otro análisis PSMI</span>
                  </button>
                </div>

                {/* Multi-PSMI Switcher Tabs */}
                {currentPSMIList.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none]">
                    <span className="text-xs font-mono text-[#17212B]/60 shrink-0">Mapeos:</span>
                    {currentPSMIList.map((pMap, idx) => (
                      <div key={pMap.id || idx} className="flex items-center">
                        <button
                          onClick={() =>
                            setActivePSMIIndexMap((prev) => ({
                              ...prev,
                              [currentProcess.id]: idx,
                            }))
                          }
                          className={`px-3 py-1 text-xs font-mono rounded-xl border transition-colors cursor-pointer ${
                            safePSMIIndex === idx
                              ? 'bg-[#173B57] text-white border-[#173B57] font-bold'
                              : 'bg-[#F6F4EF] text-[#17212B] border-[#D9D5CC] hover:bg-white'
                          }`}
                        >
                          PSMI #{idx + 1}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* PSMI Parameters: Entradas, Salidas, Unidad de Tiempo, Revisó, Autorizó */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                      Nombre / Variante del Procedimiento
                    </label>
                    <input
                      type="text"
                      value={currentPSMI.processName || ''}
                      onChange={(e) =>
                        handleUpdatePSMIField(currentProcess, 'processName', e.target.value)
                      }
                      className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden font-medium"
                      placeholder="Nombre del procedimiento..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                      Entradas (Insumos / Documentos)
                    </label>
                    <input
                      type="text"
                      value={currentPSMI.entradas || ''}
                      onChange={(e) =>
                        handleUpdatePSMIField(currentProcess, 'entradas', e.target.value)
                      }
                      className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                      placeholder="Requerimientos, materia prima, formatos..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                      Salidas (Entregables / Resultados)
                    </label>
                    <input
                      type="text"
                      value={currentPSMI.salidas || ''}
                      onChange={(e) =>
                        handleUpdatePSMIField(currentProcess, 'salidas', e.target.value)
                      }
                      className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                      placeholder="Producto, informe, reporte firmado..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                      Unidad de Tiempo
                    </label>
                    <select
                      value={currentPSMI.unidadTiempo || 'Minutos'}
                      onChange={(e) =>
                        handleUpdatePSMIField(
                          currentProcess,
                          'unidadTiempo',
                          e.target.value as 'Minutos' | 'Horas' | 'Días'
                        )
                      }
                      className="w-full bg-white border border-[#D9D5CC] focus:border-[#173B57] px-2.5 py-1.5 rounded-xl outline-hidden cursor-pointer"
                    >
                      <option value="Minutos">Minutos</option>
                      <option value="Horas">Horas</option>
                      <option value="Días">Días</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                      Revisó (Puesto / Nombre)
                    </label>
                    <input
                      type="text"
                      value={currentPSMI.reviso || ''}
                      onChange={(e) =>
                        handleUpdatePSMIField(currentProcess, 'reviso', e.target.value)
                      }
                      className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                      placeholder="Auditor / Jefe de Área..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                      Autorizó (Dirección / Gerencia)
                    </label>
                    <input
                      type="text"
                      value={currentPSMI.autorizo || ''}
                      onChange={(e) =>
                        handleUpdatePSMIField(currentProcess, 'autorizo', e.target.value)
                      }
                      className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                      placeholder="Dirección General..."
                    />
                  </div>
                </div>

                {/* Delete PSMI button */}
                {currentPSMIList.length > 1 && (
                  <div className="pt-2 flex justify-end">
                    {confirmDeletePSMIIndex?.procId === currentProcess.id &&
                    confirmDeletePSMIIndex?.index === safePSMIIndex ? (
                      <div className="flex items-center gap-2 bg-[#FFF2ED] border border-[#C85B3C] px-2 py-1 rounded-xl">
                        <span className="text-xs text-[#C85B3C] font-semibold">
                          ¿Eliminar este análisis PSMI?
                        </span>
                        <button
                          onClick={() => handleDeletePSMI(currentProcess, safePSMIIndex)}
                          className="px-2 py-0.5 bg-[#C85B3C] text-white text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Sí, eliminar
                        </button>
                        <button
                          onClick={() => setConfirmDeletePSMIIndex(null)}
                          className="px-2 py-0.5 bg-white text-[#17212B] border border-[#D9D5CC] text-xs rounded-xl cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmDeletePSMIIndex({
                            procId: currentProcess.id,
                            index: safePSMIIndex,
                          })
                        }
                        className="text-xs text-[#C85B3C] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar este análisis PSMI</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* PSMI CALCULATED SUMMARY BOX */}
              <div className="bg-[#F6F4EF] border border-[#D9D5CC] p-4 rounded-xl">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#17212B]/60 block mb-2">
                  Resumen de Eficiencia del PSMI
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">Competencias</span>
                    <span className="font-mono text-base font-bold text-[#17212B]">{psmiSummary.totalCompetencias}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">Puestos / Resp.</span>
                    <span className="font-mono text-base font-bold text-[#17212B]">{psmiSummary.totalPuestos}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">Tiempo Total</span>
                    <span className="font-mono text-base font-bold text-[#173B57]">{psmiSummary.sumTiempoProceso} {currentPSMI.unidadTiempo || 'min'}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">Act. Críticas</span>
                    <span className="font-mono text-base font-bold text-[#C85B3C]">{psmiSummary.totalCriticas}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">Act. Cíclicas</span>
                    <span className="font-mono text-base font-bold text-[#17212B]">{psmiSummary.totalCiclicas}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">T. Críticas</span>
                    <span className="font-mono text-base font-bold text-[#C85B3C]">{psmiSummary.sumTiempoCriticas}</span>
                  </div>
                  <div className="bg-white p-2.5 border border-[#D9D5CC] rounded-xl">
                    <span className="text-[10px] font-mono text-[#17212B]/60 block">Cíclicas & Críticas</span>
                    <span className="font-mono text-base font-bold text-[#C85B3C]">{psmiSummary.totalCiclosCriticos}</span>
                  </div>
                </div>
              </div>

              {/* ACTIVITIES LIST */}
              <div className="space-y-3">
                <div className="flex flex-col items-stretch justify-between gap-3 min-[460px]:flex-row min-[460px]:items-center">
                  <h3 className="font-serif text-base font-bold text-[#17212B]">
                    Secuencia de Actividades ({currentPSMI.actividades?.length || 0})
                  </h3>

                  <button
                    onClick={() => handleAddActivity(currentProcess)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#173B57] hover:bg-[#102D43] text-white rounded-xl transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Agregar Actividad</span>
                  </button>
                </div>

                {(!currentPSMI.actividades || currentPSMI.actividades.length === 0) ? (
                  <div className="bg-white border border-dashed border-[#D9D5CC] p-8 text-center rounded-xl">
                    <p className="text-xs text-[#17212B]/50 italic mb-2">
                      Aún no hay actividades registradas en este PSMI.
                    </p>
                    <button
                      onClick={() => handleAddActivity(currentProcess)}
                      className="text-xs text-[#173B57] font-semibold hover:underline cursor-pointer"
                    >
                      + Registrar primera actividad
                    </button>
                  </div>
                ) : (
                  currentPSMI.actividades.map((act) => {
                    const isExpanded = !!expandedActivities[act.id];
                    const clasificacion = calculateActivityClassification(act);
                    const criticidad = calculateActivityCriticality(act);
                    const isCritica = criticidad === 'CRITICA';
                    const isEliminar = clasificacion === 'ELIMINAR';

                    return (
                      <div
                        key={act.id}
                        className={`bg-white border rounded-xl shadow-sm transition-colors overflow-hidden ${
                          isCritica
                            ? 'border-[#C85B3C]/40'
                            : 'border-[#D9D5CC]'
                        }`}
                      >
                        {/* Collapsed Header Bar (Click to toggle expand) */}
                        <div
                          onClick={() => toggleActivity(act.id)}
                          className={`p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                            isExpanded
                              ? 'bg-[#F6F4EF]/60 border-b border-[#D9D5CC]'
                              : 'hover:bg-[#F6F4EF]/30'
                          }`}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-3">
                            {/* Number badge */}
                            <span className="w-6 h-6 rounded-xl bg-[#17212B] text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                              {act.no}
                            </span>

                            {/* Name & stage */}
                            <div className="truncate">
                              <span className="font-serif font-bold text-sm text-[#17212B] block truncate">
                                {act.actividad || 'Actividad sin nombre'}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] font-mono text-[#17212B]/60">
                                {act.etapa && <span>Etapa: {act.etapa}</span>}
                                {act.responsable && <span>• Resp: {act.responsable}</span>}
                                {act.esCiclo && (
                                  <span className="text-[#173B57] font-semibold flex items-center gap-0.5">
                                    <Repeat className="w-2.5 h-2.5" /> Cíclica
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Badges: Clasificación & Criticidad */}
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {/* Clasificación badge */}
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xl border ${
                                isEliminar
                                  ? 'bg-[#FFF2ED] text-[#C85B3C] border-[#C85B3C]'
                                  : 'bg-[#173B57]/10 text-[#173B57] border-[#173B57]/40'
                              }`}
                            >
                              {clasificacion}
                            </span>

                            {/* Criticidad badge */}
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xl border ${
                                isCritica
                                  ? 'bg-[#C85B3C] text-white border-[#C85B3C]'
                                  : 'bg-[#F6F4EF] text-[#17212B]/70 border-[#D9D5CC]'
                              }`}
                            >
                              {criticidad}
                            </span>

                            {/* Time badge */}
                            <span className="text-[11px] font-mono text-[#17212B]/70 px-1.5">
                              {act.tiempoProceso || 0} {currentPSMI.unidadTiempo || 'min'}
                            </span>

                            {/* Expand / collapse icon */}
                            <div className="text-[#17212B]/50 hover:text-[#17212B] p-1">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Expanded Detail Form */}
                        {isExpanded && (
                          <div className="p-4 sm:p-5 space-y-5 bg-white animate-fade-in text-xs">
                            {/* Row 1: Actividad (nombre), Etapa, Es Ciclo */}
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              <div className="sm:col-span-6">
                                <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                                  Nombre de la Actividad
                                </label>
                                <input
                                  type="text"
                                  value={act.actividad}
                                  onChange={(e) =>
                                    handleUpdateActivity(currentProcess, act.id, {
                                      actividad: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden font-medium"
                                  placeholder="Ej. Revisión y cotejo de factura"
                                />
                              </div>

                              <div className="sm:col-span-3">
                                <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                                  Etapa del Proceso
                                </label>
                                <input
                                  type="text"
                                  value={act.etapa}
                                  onChange={(e) =>
                                    handleUpdateActivity(currentProcess, act.id, {
                                      etapa: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                                  placeholder="Ej. Recepción, Ensamble, Cierre"
                                />
                              </div>

                              <div className="sm:col-span-3 flex items-center pt-4">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={act.esCiclo}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        esCiclo: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 accent-[#173B57] cursor-pointer"
                                  />
                                  <span className="font-mono text-xs font-semibold text-[#17212B]">
                                    ¿Es cíclica / se repite?
                                  </span>
                                </label>
                              </div>
                            </div>

                            {/* Row 2: Detalle (Texto Largo) */}
                            <div>
                              <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                                Detalle / Descripción Operativa de la Actividad
                              </label>
                              <textarea
                                rows={3}
                                value={act.detalle}
                                onChange={(e) =>
                                  handleUpdateActivity(currentProcess, act.id, {
                                    detalle: e.target.value,
                                  })
                                }
                                className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden leading-relaxed"
                                placeholder="Describa a detalle qué se hace, qué criterios técnicos se verifican y el estándar esperado..."
                              />
                            </div>

                            {/* Row 3: Competencia y Responsable */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                                  Competencia Requerida
                                </label>
                                <input
                                  type="text"
                                  value={act.competencia}
                                  onChange={(e) =>
                                    handleUpdateActivity(currentProcess, act.id, {
                                      competencia: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                                  placeholder="Ej. Manejo de montacargas, Criterio contable, etc."
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-mono uppercase text-[#17212B]/60 block mb-1">
                                  Puesto Responsable
                                </label>
                                <input
                                  type="text"
                                  value={act.responsable}
                                  onChange={(e) =>
                                    handleUpdateActivity(currentProcess, act.id, {
                                      responsable: e.target.value,
                                    })
                                  }
                                  className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] focus:bg-white px-2.5 py-1.5 rounded-xl outline-hidden"
                                  placeholder="Ej. Auxiliar de Almacén, Contador General..."
                                />
                              </div>
                            </div>

                            {/* Row 4: 3 Criterios de Valor (Agrega Valor, Es Requisito, Satisface Cliente) & Calculation Badges */}
                            <div className="bg-[#F6F4EF]/50 p-3.5 border border-[#D9D5CC] rounded-xl space-y-3">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#17212B]/60 block">
                                Criterios de Calificación de Valor (Cálculo Automático)
                              </span>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-[#D9D5CC] rounded-xl select-none">
                                  <input
                                    type="checkbox"
                                    checked={act.agregaValor}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        agregaValor: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 accent-[#173B57]"
                                  />
                                  <span className="font-mono text-xs font-medium text-[#17212B]">
                                    Agrega valor
                                  </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-[#D9D5CC] rounded-xl select-none">
                                  <input
                                    type="checkbox"
                                    checked={act.esRequisito}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        esRequisito: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 accent-[#173B57]"
                                  />
                                  <span className="font-mono text-xs font-medium text-[#17212B]">
                                    Es requisito (legal/norma)
                                  </span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-[#D9D5CC] rounded-xl select-none">
                                  <input
                                    type="checkbox"
                                    checked={act.satisfaceCliente}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        satisfaceCliente: e.target.checked,
                                      })
                                    }
                                    className="w-4 h-4 accent-[#173B57]"
                                  />
                                  <span className="font-mono text-xs font-medium text-[#17212B]">
                                    Satisface al cliente
                                  </span>
                                </label>
                              </div>

                              {/* Automated status readout */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#D9D5CC]/60 text-xs">
                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-mono text-[#17212B]/70">
                                    Clasificación:
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 font-mono font-bold rounded-xl border ${
                                      isEliminar
                                        ? 'bg-[#FFF2ED] text-[#C85B3C] border-[#C85B3C]'
                                        : 'bg-[#173B57] text-white border-[#173B57]'
                                    }`}
                                  >
                                    {clasificacion}
                                  </span>
                                  <span className="text-[10px] text-[#17212B]/50 italic">
                                    (Verdadero si al menos 1 criterio se cumple)
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-[11px] font-mono text-[#17212B]/70">
                                    Criticidad:
                                  </span>
                                  <span
                                    className={`px-2.5 py-0.5 font-mono font-bold rounded-xl border ${
                                      isCritica
                                        ? 'bg-[#C85B3C] text-white border-[#C85B3C]'
                                        : 'bg-white text-[#17212B] border-[#D9D5CC]'
                                    }`}
                                  >
                                    {criticidad}
                                  </span>
                                  <span className="text-[10px] text-[#17212B]/50 italic">
                                    (Crítica solo si los 3 criterios son verdaderos)
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Row 5: Herramientas usadas (opcional, texto libre) */}
                            <div className="border border-[#D9D5CC] p-3.5 rounded-xl space-y-3">
                              <span className="text-[10px] font-mono uppercase tracking-wider text-[#17212B]/60 block">
                                Herramientas e Instrumentos de Trabajo (Opcional)
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-1">Formato</label>
                                  <input
                                    type="text"
                                    value={act.herramientas?.formato || ''}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        herramientas: {
                                          ...act.herramientas,
                                          formato: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 rounded-xl outline-hidden"
                                    placeholder="Ej. F-ADM-02"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-1">Registro Info</label>
                                  <input
                                    type="text"
                                    value={act.herramientas?.registroInfo || ''}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        herramientas: {
                                          ...act.herramientas,
                                          registroInfo: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 rounded-xl outline-hidden"
                                    placeholder="Ej. Folio / Base de datos"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-1">Software</label>
                                  <input
                                    type="text"
                                    value={act.herramientas?.software || ''}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        herramientas: {
                                          ...act.herramientas,
                                          software: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 rounded-xl outline-hidden"
                                    placeholder="Ej. SAP, Excel, Asana"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-1">Links / URLs</label>
                                  <input
                                    type="text"
                                    value={act.herramientas?.links || ''}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        herramientas: {
                                          ...act.herramientas,
                                          links: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 rounded-xl outline-hidden"
                                    placeholder="https://..."
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-1">Revisión Cumplimiento</label>
                                  <input
                                    type="text"
                                    value={act.herramientas?.revisionCumplimiento || ''}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        herramientas: {
                                          ...act.herramientas,
                                          revisionCumplimiento: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 rounded-xl outline-hidden"
                                    placeholder="Ej. Auditoría mensual"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-1">Instrucciones</label>
                                  <input
                                    type="text"
                                    value={act.herramientas?.instrucciones || ''}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        herramientas: {
                                          ...act.herramientas,
                                          instrucciones: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/30 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 rounded-xl outline-hidden"
                                    placeholder="Ej. Guía IT-09"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Row 6: Tiempos & Delete Activity (Two-step confirm) */}
                            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#D9D5CC]/60">
                              <div className="grid w-full grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:flex sm:w-auto sm:items-center sm:gap-4">
                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-0.5">
                                    Tiempo Actividad ({currentPSMI.unidadTiempo || 'min'})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={act.tiempoActividad || 0}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        tiempoActividad: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-2 rounded-xl font-mono text-xs sm:w-28"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-mono text-[#17212B]/60 block mb-0.5">
                                    Tiempo Proceso ({currentPSMI.unidadTiempo || 'min'})
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={act.tiempoProceso || 0}
                                    onChange={(e) =>
                                      handleUpdateActivity(currentProcess, act.id, {
                                        tiempoProceso: parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    className="w-full bg-[#F6F4EF]/40 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-2 rounded-xl font-mono text-xs font-bold sm:w-28"
                                  />
                                </div>
                              </div>

                              {/* Two-step delete activity */}
                              <div>
                                {confirmDeleteActivityId === act.id ? (
                                  <div className="flex items-center gap-1.5 bg-[#FFF2ED] border border-[#C85B3C] px-2 py-1 rounded-xl">
                                    <span className="text-[11px] text-[#C85B3C] font-semibold">
                                      ¿Eliminar actividad?
                                    </span>
                                    <button
                                      onClick={() => handleDeleteActivity(currentProcess, act.id)}
                                      className="px-2 py-0.5 bg-[#C85B3C] text-white text-[10px] font-bold rounded-xl cursor-pointer"
                                    >
                                      Sí
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteActivityId(null)}
                                      className="px-2 py-0.5 bg-white text-[#17212B] border border-[#D9D5CC] text-[10px] rounded-xl cursor-pointer"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteActivityId(act.id)}
                                    className="text-xs text-[#17212B]/40 hover:text-[#C85B3C] flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Eliminar actividad</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
