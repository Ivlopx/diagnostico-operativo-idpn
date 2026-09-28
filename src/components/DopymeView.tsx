import React, { useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Lock,
  ChevronRight,
  Info,
  FolderPlus,
  FileSpreadsheet,
  X,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import {
  AreaDoc,
  ProcessDoc,
  LevelMBC,
  LevelK,
  LEVEL_K_LABELS,
  LEVEL_MBC_LABELS,
  calculateProcessScores,
  calculateAreaScores,
  calculateWorkspaceSustainableScore,
} from '../types';
import {
  addArea,
  updateArea,
  deleteAreaWithProcesses,
  addProcess,
  updateProcess,
  deleteProcess,
  clearWorkspaceData,
  resetAllProcessesToBlank,
} from '../utils/workspaceService';
import { ComparativeRadarChart, RadarChart, RadarDataPoint } from './RadarChart';
import { DopymeInstructions } from './DopymeInstructions';
import { OrganizationalInterpretation } from './OrganizationalInterpretation';
import { generateOrganizationalInterpretation } from '../utils/organizationalInterpretation';

interface DopymeViewProps {
  workspaceId: string;
  areas: AreaDoc[];
  processes: ProcessDoc[];
  onNavigateToPSMI?: () => void;
}

export const DopymeView: React.FC<DopymeViewProps> = ({
  workspaceId,
  areas,
  processes,
  onNavigateToPSMI,
}) => {
  // Tabs: 'summary' or areaId
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [editAreaNameVal, setEditAreaNameVal] = useState('');
  const [confirmDeleteAreaId, setConfirmDeleteAreaId] = useState<string | null>(null);
  const [confirmDeleteProcessId, setConfirmDeleteProcessId] = useState<string | null>(null);
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);
  const [newProcessName, setNewProcessName] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Calculations
  const { sustainableScore, areaScoresMap } = calculateWorkspaceSustainableScore(
    areas,
    processes
  );
  const organizationalInterpretation = useMemo(
    () => generateOrganizationalInterpretation(areas, processes),
    [areas, processes],
  );

  // Clear all data (blank workspace)
  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await clearWorkspaceData(workspaceId);
      setShowClearModal(false);
      setActiveTab('summary');
    } catch (err) {
      console.error('Error clearing workspace:', err);
    } finally {
      setIsClearing(false);
    }
  };

  // Reset all evaluation scores to blank (0 pts)
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

  // Handle add area
  const handleAddAreaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    try {
      const newId = await addArea(workspaceId, newAreaName, areas.length);
      setNewAreaName('');
      setIsAddingArea(false);
      setActiveTab(newId);
    } catch (err) {
      console.error('Error adding area:', err);
    }
  };

  // Handle edit area name
  const handleSaveAreaName = async (areaId: string) => {
    if (!editAreaNameVal.trim()) return;
    try {
      await updateArea(workspaceId, areaId, editAreaNameVal);
      setEditingAreaId(null);
    } catch (err) {
      console.error('Error updating area name:', err);
    }
  };

  // Handle delete area
  const handleDeleteArea = async (areaId: string) => {
    try {
      await deleteAreaWithProcesses(workspaceId, areaId);
      setConfirmDeleteAreaId(null);
      setActiveTab('summary');
    } catch (err) {
      console.error('Error deleting area:', err);
    }
  };

  // Handle add process
  const handleAddProcessSubmit = async (areaId: string) => {
    if (!newProcessName.trim()) return;
    try {
      const currentAreaProcesses = processes.filter((p) => p.areaId === areaId);
      await addProcess(workspaceId, areaId, newProcessName, currentAreaProcesses.length);
      setNewProcessName('');
      setIsCreatingProcess(false);
    } catch (err) {
      console.error('Error adding process:', err);
    }
  };

  // Handle process field update
  const handleUpdateProcessField = async (
    processId: string,
    updates: Partial<ProcessDoc>
  ) => {
    try {
      await updateProcess(workspaceId, processId, updates);
    } catch (err) {
      console.error('Error updating process:', err);
    }
  };

  // Handle delete process
  const handleDeleteProcess = async (processId: string) => {
    try {
      await deleteProcess(workspaceId, processId);
      setConfirmDeleteProcessId(null);
    } catch (err) {
      console.error('Error deleting process:', err);
    }
  };

  // Data for summary radar charts (comparing areas)
  const operationRadarData: RadarDataPoint[] = areas.map((a) => ({
    label: a.name,
    value: areaScoresMap[a.id]?.J || 0,
  }));

  const processesRadarData: RadarDataPoint[] = areas.map((a) => ({
    label: a.name,
    value: areaScoresMap[a.id]?.Q || 0,
  }));

  const generalRadarData: RadarDataPoint[] = areas.map((a) => ({
    label: a.name,
    value: areaScoresMap[a.id]?.R || 0,
  }));

  const activeArea = areas.find((a) => a.id === activeTab);
  const activeAreaProcesses = processes.filter((p) => p.areaId === activeTab);
  const activeAreaScores = activeArea
    ? areaScoresMap[activeArea.id] || calculateAreaScores(activeAreaProcesses)
    : null;

  // Radar data for processes in active area
  const areaProcessesRadarData: RadarDataPoint[] = activeAreaProcesses.map((p) => {
    const s = calculateProcessScores(p);
    return {
      label: p.name,
      value: s.R,
    };
  });

  return (
    <div className="max-w-7xl mx-auto min-w-0 px-3 py-5 sm:px-6 sm:py-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#173B57] text-white rounded-xl">
              Paso 1 de 2
            </span>
            <h1 className="min-w-0 font-serif text-xl font-bold leading-tight text-[#17212B] sm:text-2xl">
              DOPYME — Diagnóstico Operativo de Pequeñas y Medianas Empresas
            </h1>
          </div>
          <p className="text-xs text-[#17212B]/70 mt-1">
            Audita y calibra la operación y procesos de cada área. Los procesos con puntaje R ≥ 60 se habilitan para el mapeo PSMI.
          </p>
        </div>

        {/* Right header actions: Reset / Clear button & Sustainable badge */}
        <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center sm:gap-3">
          {(areas.length > 0 || processes.length > 0) && (
            <button
              onClick={() => setShowClearModal(true)}
              className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-[#D9D5CC] bg-white px-3 py-2 text-xs font-mono text-[#C85B3C] shadow-sm transition-colors hover:border-[#C85B3C]/40 hover:bg-[#FFF2ED] sm:flex-initial"
              title="Vaciar o reiniciar datos para comenzar desde cero"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Empezar en blanco</span>
            </button>
          )}

          <div className="flex min-h-10 flex-1 items-center justify-center gap-3 rounded-xl border border-[#D9D5CC] bg-white px-4 py-2 shadow-sm sm:flex-initial">
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#17212B]/60 block uppercase">
                Resultado Sustentable
              </span>
              <span className="font-serif text-lg font-bold text-[#173B57]">
                {sustainableScore} <span className="text-xs font-normal text-[#17212B]/50">/ 100</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official Methodological Instructions Section */}
      <DopymeInstructions initiallyExpanded={false} />

      {/* Tabs navigation: "Resumen general" + Areas */}
      <div className="flex items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-1 border-b border-[#D9D5CC] mb-6 [scrollbar-width:none]">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-xs border-t border-x transition-colors cursor-pointer shrink-0 ${
            activeTab === 'summary'
              ? 'bg-white text-[#173B57] border-[#D9D5CC] border-b-transparent -mb-[1px] shadow-sm font-bold'
              : 'bg-[#F6F4EF]/60 text-[#17212B]/70 border-transparent hover:text-[#17212B] hover:bg-white/50'
          }`}
        >
          Resumen General de Áreas
        </button>

        {areas.map((area) => {
          const aScores = areaScoresMap[area.id];
          const isSelected = activeTab === area.id;
          return (
            <button
              key={area.id}
              onClick={() => setActiveTab(area.id)}
              className={`px-3.5 py-2 text-xs rounded-t-xs border-t border-x transition-colors cursor-pointer shrink-0 flex items-center gap-2 ${
                isSelected
                  ? 'bg-white text-[#173B57] border-[#D9D5CC] border-b-transparent -mb-[1px] shadow-sm font-semibold'
                  : 'bg-[#F6F4EF]/60 text-[#17212B]/70 border-transparent hover:text-[#17212B] hover:bg-white/50'
              }`}
            >
              <span>{area.name}</span>
              {aScores && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#F6F4EF] text-[#17212B]/70 border border-[#D9D5CC]/70 rounded-xl">
                  {aScores.R}
                </span>
              )}
            </button>
          );
        })}

        {/* Add Area Button */}
        {!isAddingArea ? (
          <button
            onClick={() => setIsAddingArea(true)}
            className="px-3 py-1.5 text-xs text-[#173B57] hover:bg-white border border-dashed border-[#D9D5CC] hover:border-[#173B57] rounded-xl transition-colors shrink-0 ml-1 flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar área</span>
          </button>
        ) : (
          <form
            onSubmit={handleAddAreaSubmit}
            className="flex items-center gap-1.5 bg-white border border-[#D9D5CC] p-1 rounded-xl shrink-0 ml-1 shadow-sm"
          >
            <input
              type="text"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="Nombre del área..."
              className="text-xs px-2 py-1 border border-[#D9D5CC] rounded-xl outline-hidden focus:border-[#173B57] w-36"
              autoFocus
            />
            <button
              type="submit"
              className="px-2 py-1 bg-[#173B57] text-white text-xs rounded-xl font-medium hover:bg-[#102D43]"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingArea(false);
                setNewAreaName('');
              }}
              className="p-1 text-[#17212B]/50 hover:text-[#17212B]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* TAB CONTENT: RESUMEN GENERAL */}
      {activeTab === 'summary' && (
        <div className="space-y-8 animate-fade-in">
          {/* Big Sustainable Score Card */}
          <div className="bg-white border border-[#D9D5CC] p-6 sm:p-8 rounded-xl shadow-sm text-center relative overflow-hidden">
            <div className="max-w-xl mx-auto">
              <span className="text-xs font-mono uppercase tracking-widest text-[#17212B]/60 block mb-2">
                Puntaje Consolidado de la Empresa
              </span>
              <div className="font-serif text-5xl sm:text-6xl font-bold text-[#173B57] tracking-tight">
                {sustainableScore}
                <span className="text-xl font-sans font-normal text-[#17212B]/40"> / 100</span>
              </div>
              <h3 className="font-serif text-lg font-bold text-[#17212B] mt-3">
                Resultado Sustentable
              </h3>
              <p className="text-xs text-[#17212B]/70 mt-1 leading-relaxed">
                Calculado como el promedio exacto de los Resultados de madurez (R = J + Q) de todas las {areas.length} áreas operativas de la organización.
              </p>
            </div>
          </div>

          {/* COMPARATIVE RADAR CHART */}
          <div>
            <div className="mb-4">
              <h2 className="font-serif text-lg font-bold text-[#17212B]">
                Comparativa de Áreas en Radar
              </h2>
              <p className="text-xs text-[#17212B]/60">
                Operación, formalidad y resultado general sobre una escala común de 0 a 100.
              </p>
            </div>

            <div className="mx-auto max-w-2xl rounded-xl border border-[#D9D5CC] bg-white p-3 shadow-sm sm:p-5">
              <ComparativeRadarChart
                title="Comparativa integral por área"
                series={[
                  { label: 'Operación J', color: '#4D9DE0', data: operationRadarData.map((item) => ({ ...item, value: item.value * 2 })) },
                  { label: 'Procesos Q', color: '#58B368', data: processesRadarData.map((item) => ({ ...item, value: item.value * 2 })) },
                  { label: 'Resultado R', color: '#FF6B78', data: generalRadarData },
                ]}
              />
              <p className="mt-3 text-center text-[11px] text-[#7A8490]">J y Q se normalizan de 50 a 100 exclusivamente para la comparación visual.</p>
            </div>
          </div>

          <OrganizationalInterpretation analysis={organizationalInterpretation} />

          {/* Table of Areas Summary */}
          <div className="bg-white border border-[#D9D5CC] rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#D9D5CC] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-sm font-bold text-[#17212B]">
                  Matriz de Madurez Consolidada por Área
                </h3>
                <p className="text-[11px] text-[#17212B]/60 font-mono">
                  Promedios de J y Q calculados sobre el número real de procesos por área
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F6F4EF] text-[#17212B] font-mono text-[11px] uppercase border-b border-[#D9D5CC]">
                    <th className="py-2.5 px-4 font-semibold">Área Organizacional</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Procesos</th>
                    <th className="py-2.5 px-4 font-semibold text-center">J Operación (/50)</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Q Procesos (/50)</th>
                    <th className="py-2.5 px-4 font-semibold text-center">R Resultado (/100)</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Aptos para PSMI</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D5CC]/60 font-sans">
                  {areas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#17212B]/50 italic">
                        No hay áreas registradas. Agrega tu primera área con el botón "Agregar área".
                      </td>
                    </tr>
                  ) : (
                    areas.map((area) => {
                      const s = areaScoresMap[area.id] || { J: 0, Q: 0, R: 0, count: 0, enabledCount: 0 };
                      return (
                        <tr key={area.id} className="hover:bg-[#F6F4EF]/40 transition-colors">
                          <td className="py-3 px-4 font-serif font-bold text-sm text-[#17212B]">
                            {area.name}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">{s.count}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-[#17212B]">
                            {s.J}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-[#17212B]">
                            {s.Q}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-bold text-[#173B57] text-sm">
                              {s.R}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-xl border ${
                              s.enabledCount > 0
                                ? 'bg-[#173B57]/10 text-[#173B57] border-[#173B57]/30'
                                : 'bg-[#F6F4EF] text-[#17212B]/60 border-[#D9D5CC]'
                            }`}>
                              {s.enabledCount} de {s.count} procesos
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setActiveTab(area.id)}
                              className="text-xs text-[#173B57] hover:underline font-semibold cursor-pointer"
                            >
                              Ver área →
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: INDIVIDUAL AREA */}
      {activeArea && (
        <div className="space-y-6 animate-fade-in">
          {/* Area Header & Controls */}
          <div className="bg-white border border-[#D9D5CC] p-5 rounded-xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Area Name / Editable */}
              <div className="flex items-center gap-3">
                {editingAreaId === activeArea.id ? (
                  <div className="flex w-full flex-col items-stretch gap-2 min-[480px]:flex-row min-[480px]:items-center">
                    <input
                      type="text"
                      value={editAreaNameVal}
                      onChange={(e) => setEditAreaNameVal(e.target.value)}
                      className="min-w-0 flex-1 border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1 font-serif text-base font-bold rounded-xl outline-hidden sm:text-lg"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveAreaName(activeArea.id)}
                      className="px-2.5 py-1 bg-[#173B57] text-white text-xs font-semibold rounded-xl"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditingAreaId(null)}
                      className="px-2 py-1 text-xs text-[#17212B]/60 hover:text-[#17212B]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-xl font-bold text-[#17212B]">
                      {activeArea.name}
                    </h2>
                    <button
                      onClick={() => {
                        setEditingAreaId(activeArea.id);
                        setEditAreaNameVal(activeArea.name);
                      }}
                      className="text-[#17212B]/40 hover:text-[#173B57] p-1"
                      title="Renombrar área"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Area Badges & Delete Area in 2 steps */}
              <div className="flex flex-wrap items-center gap-2.5">
                {activeAreaScores && (
                  <div className="flex items-center gap-2 bg-[#F6F4EF] border border-[#D9D5CC] px-3 py-1.5 rounded-xl text-xs font-mono">
                    <span>J: <strong>{activeAreaScores.J}</strong></span>
                    <span className="text-[#D9D5CC]">|</span>
                    <span>Q: <strong>{activeAreaScores.Q}</strong></span>
                    <span className="text-[#D9D5CC]">|</span>
                    <span className="text-[#173B57] font-bold">R: {activeAreaScores.R} / 100</span>
                  </div>
                )}

                {/* Two-step delete area confirmation */}
                {confirmDeleteAreaId === activeArea.id ? (
                  <div className="flex items-center gap-1.5 bg-[#FFF2ED] border border-[#C85B3C] p-1 rounded-xl">
                    <span className="text-xs text-[#C85B3C] font-semibold px-1">
                      ¿Eliminar área y sus procesos?
                    </span>
                    <button
                      onClick={() => handleDeleteArea(activeArea.id)}
                      className="px-2 py-0.5 bg-[#C85B3C] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Sí
                    </button>
                    <button
                      onClick={() => setConfirmDeleteAreaId(null)}
                      className="px-2 py-0.5 bg-white text-[#17212B] border border-[#D9D5CC] text-xs rounded-xl cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteAreaId(activeArea.id)}
                    className="p-1.5 text-[#17212B]/40 hover:text-[#C85B3C] border border-transparent hover:border-[#D9D5CC] rounded-xl transition-colors cursor-pointer"
                    title="Eliminar esta área"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Area Radar & Processes Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Processes Radar Chart */}
            <div className="bg-white border border-[#D9D5CC] p-5 rounded-xl shadow-sm flex flex-col items-center justify-center">
              <RadarChart
                chartId={`radar-area-${activeArea.id}`}
                data={areaProcessesRadarData}
                maxValue={100}
                title={`Resultado R de Procesos (${activeArea.name})`}
                size={300}
                color="#173B57"
              />
              <p className="mt-3 text-[11px] font-mono text-[#17212B]/60 text-center">
                Muestra el Resultado final (R) de cada proceso en esta área (umbral PSMI: ≥60).
              </p>
            </div>

            {/* Processes List for this Area */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-col items-stretch justify-between gap-3 min-[520px]:flex-row min-[520px]:items-center">
                <h3 className="font-serif text-base font-bold text-[#17212B]">
                  Procesos y Actividades ({activeAreaProcesses.length})
                </h3>

                {/* Add process button or input */}
                {!isCreatingProcess ? (
                  <button
                    onClick={() => setIsCreatingProcess(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#173B57] hover:bg-[#102D43] text-white rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar función o departamento</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newProcessName}
                      onChange={(e) => setNewProcessName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddProcessSubmit(activeArea.id);
                      }}
                      placeholder="Nombre del proceso..."
                      className="min-w-0 flex-1 text-xs px-2.5 py-1.5 border border-[#D9D5CC] focus:border-[#173B57] rounded-xl outline-hidden min-[520px]:w-52"
                      autoFocus
                    />
                    <button
                      onClick={() => handleAddProcessSubmit(activeArea.id)}
                      className="px-2.5 py-1.5 bg-[#173B57] text-white text-xs font-semibold rounded-xl"
                    >
                      Crear
                    </button>
                    <button
                      onClick={() => {
                        setIsCreatingProcess(false);
                        setNewProcessName('');
                      }}
                      className="p-1 text-[#17212B]/50 hover:text-[#17212B]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Processes list cards */}
              {activeAreaProcesses.length === 0 ? (
                <div className="bg-white border border-dashed border-[#D9D5CC] p-8 text-center rounded-xl">
                  <p className="text-sm font-serif text-[#17212B]/60 italic mb-2">
                    No hay procesos en esta área aún.
                  </p>
                  <button
                    onClick={() => setIsCreatingProcess(true)}
                    className="text-xs text-[#173B57] font-semibold hover:underline cursor-pointer"
                  >
                    Agregar la primera función o departamento
                  </button>
                </div>
              ) : (
                activeAreaProcesses.map((proc) => {
                  const scores = calculateProcessScores(proc);
                  return (
                    <div
                      key={proc.id}
                      className="bg-white border border-[#D9D5CC] p-4 sm:p-5 rounded-xl shadow-sm space-y-4 relative"
                    >
                      {/* Top row: Process Name editable inline, Score Badges, Delete Confirm */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D9D5CC]/60 pb-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={proc.name}
                            onChange={(e) =>
                              handleUpdateProcessField(proc.id, { name: e.target.value })
                            }
                            className="w-full font-serif text-base font-bold text-[#17212B] bg-transparent hover:bg-[#F6F4EF]/50 focus:bg-white border border-transparent hover:border-[#D9D5CC] focus:border-[#173B57] px-1.5 py-0.5 rounded-xl outline-hidden transition-colors"
                            placeholder="Nombre del proceso..."
                          />
                        </div>

                        {/* Scores & Two-step delete */}
                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                          {/* J & Q sub-scores */}
                          <div className="text-[11px] font-mono text-[#17212B]/70 px-2 py-0.5 bg-[#F6F4EF] border border-[#D9D5CC] rounded-xl flex items-center gap-1.5">
                            <span>J: <strong>{scores.J}</strong>/50</span>
                            <span className="text-[#D9D5CC]">|</span>
                            <span>Q: <strong>{scores.Q}</strong>/50</span>
                          </div>

                          {/* Big Outcome R Badge */}
                          <div
                            className={`px-3 py-1 font-mono font-bold text-xs rounded-xl border flex items-center gap-1.5 ${
                              scores.isPSMIEnabled
                                ? 'bg-[#173B57] text-white border-[#173B57]'
                                : 'bg-[#FFF6F2] text-[#C85B3C] border-[#C85B3C]'
                            }`}
                            title={
                              scores.isPSMIEnabled
                                ? 'Proceso con madurez suficiente (≥60 pts)'
                                : `Faltan ${scores.pointsToPSMI} puntos para habilitar PSMI`
                            }
                          >
                            <span>R: {scores.R} / 100</span>
                            {scores.isPSMIEnabled ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Lock className="w-3 h-3 text-[#C85B3C]" />
                            )}
                          </div>

                          {/* Two-step delete process */}
                          {confirmDeleteProcessId === proc.id ? (
                            <div className="flex items-center gap-1 bg-[#FFF2ED] border border-[#C85B3C] px-1.5 py-0.5 rounded-xl">
                              <span className="text-[11px] text-[#C85B3C] font-semibold">
                                ¿Eliminar?
                              </span>
                              <button
                                onClick={() => handleDeleteProcess(proc.id)}
                                className="px-1.5 py-0.2 bg-[#C85B3C] text-white text-[10px] font-bold rounded-xl cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmDeleteProcessId(null)}
                                className="px-1.5 py-0.2 bg-white text-[#17212B] border border-[#D9D5CC] text-[10px] rounded-xl cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteProcessId(proc.id)}
                              className="p-1 text-[#17212B]/40 hover:text-[#C85B3C] transition-colors"
                              title="Eliminar proceso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Controls Grid: Criterios Operación (O, P, E, A) + Selector M/B/C + Nivel K */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                        {/* Section 1: Binary Criteria O, P, E, A (each 0 or 5 pts) */}
                        <div className="sm:col-span-5 bg-[#F6F4EF]/50 p-2.5 border border-[#D9D5CC]/70 rounded-xl">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#17212B]/60 block mb-2">
                            Criterios Operativos (0 / 5 pts c/u)
                          </span>
                          <div className="grid grid-cols-4 gap-1.5 text-center">
                            {/* O */}
                            <label
                              title="O – Objetivo: ¿La función cuenta actualmente con un objetivo establecido y definido?"
                              className="flex flex-col items-center gap-1 cursor-pointer select-none group"
                            >
                              <span className="font-mono font-bold text-[11px] text-[#17212B] group-hover:text-[#173B57]">
                                O <span className="font-normal text-[9px] text-[#17212B]/60 block font-serif">Objetivo</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={proc.O === 5}
                                onChange={(e) =>
                                  handleUpdateProcessField(proc.id, { O: e.target.checked ? 5 : 0 })
                                }
                                className="w-4 h-4 accent-[#173B57] cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-[#17212B]/70">
                                {proc.O || 0} pts
                              </span>
                            </label>

                            {/* P */}
                            <label
                              title="P – Políticas: ¿La función cuenta actualmente con políticas establecidas que orienten su ejecución?"
                              className="flex flex-col items-center gap-1 cursor-pointer select-none group"
                            >
                              <span className="font-mono font-bold text-[11px] text-[#17212B] group-hover:text-[#173B57]">
                                P <span className="font-normal text-[9px] text-[#17212B]/60 block font-serif">Políticas</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={proc.P === 5}
                                onChange={(e) =>
                                  handleUpdateProcessField(proc.id, { P: e.target.checked ? 5 : 0 })
                                }
                                className="w-4 h-4 accent-[#173B57] cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-[#17212B]/70">
                                {proc.P || 0} pts
                              </span>
                            </label>

                            {/* E */}
                            <label
                              title="E – Estructura: ¿La función se encuentra actualmente contemplada dentro del organigrama de la organización?"
                              className="flex flex-col items-center gap-1 cursor-pointer select-none group"
                            >
                              <span className="font-mono font-bold text-[11px] text-[#17212B] group-hover:text-[#173B57]">
                                E <span className="font-normal text-[9px] text-[#17212B]/60 block font-serif">Estructura</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={proc.E === 5}
                                onChange={(e) =>
                                  handleUpdateProcessField(proc.id, { E: e.target.checked ? 5 : 0 })
                                }
                                className="w-4 h-4 accent-[#173B57] cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-[#17212B]/70">
                                {proc.E || 0} pts
                              </span>
                            </label>

                            {/* A */}
                            <label
                              title="A – Líder: ¿La función cuenta actualmente con un líder o responsable definido?"
                              className="flex flex-col items-center gap-1 cursor-pointer select-none group"
                            >
                              <span className="font-mono font-bold text-[11px] text-[#17212B] group-hover:text-[#173B57]">
                                A <span className="font-normal text-[9px] text-[#17212B]/60 block font-serif">Líder</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={proc.A === 5}
                                onChange={(e) =>
                                  handleUpdateProcessField(proc.id, { A: e.target.checked ? 5 : 0 })
                                }
                                className="w-4 h-4 accent-[#173B57] cursor-pointer"
                              />
                              <span className="text-[10px] font-mono text-[#17212B]/70">
                                {proc.A || 0} pts
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Section 2: Mutually exclusive M, B, C */}
                        <div className="sm:col-span-3 bg-[#F6F4EF]/50 p-2.5 border border-[#D9D5CC]/70 rounded-xl">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#17212B]/60 block mb-1.5">
                            Criterio M / B / C (Único)
                          </span>
                          <div className="grid grid-cols-2 gap-1 text-[11px]">
                            {(['NONE', 'M', 'B', 'C'] as LevelMBC[]).map((lvl) => {
                              const isChecked = (proc.levelMBC || 'NONE') === lvl;
                              const tooltips: Record<string, string> = {
                                NONE: 'Sin calificación',
                                M: 'M – Malas: Actividades con deficiencias importantes o que requieren mejora (10 pts)',
                                B: 'B – Buenas: Actividades funcionales con oportunidad de mejora (20 pts)',
                                C: 'C – Correctas: Actividades adecuadas, estandarizadas y conforme a lo esperado (30 pts)',
                              };
                              return (
                                <button
                                  key={lvl}
                                  type="button"
                                  title={tooltips[lvl]}
                                  onClick={() => handleUpdateProcessField(proc.id, { levelMBC: lvl })}
                                  className={`py-1 px-1.5 text-center font-mono rounded-xl border transition-colors cursor-pointer ${
                                    isChecked
                                      ? 'bg-[#173B57] text-white border-[#173B57] font-bold'
                                      : 'bg-white text-[#17212B] border-[#D9D5CC] hover:bg-[#F6F4EF]'
                                  }`}
                                >
                                  {lvl === 'NONE' ? 'Ninguno' : `${lvl} (${LEVEL_MBC_LABELS[lvl].points})`}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section 3: Level K Select */}
                        <div className="sm:col-span-4 bg-[#F6F4EF]/50 p-2.5 border border-[#D9D5CC]/70 rounded-xl flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#17212B]/60 block mb-1">
                              Nivel K (Madurez Procesos Q)
                            </span>
                            <select
                              value={proc.levelK || 'NE'}
                              onChange={(e) =>
                                handleUpdateProcessField(proc.id, {
                                  levelK: e.target.value as LevelK,
                                })
                              }
                              className="w-full bg-white border border-[#D9D5CC] focus:border-[#173B57] px-2 py-1.5 text-xs font-mono rounded-xl outline-hidden cursor-pointer"
                            >
                              {(Object.keys(LEVEL_K_LABELS) as LevelK[]).map((kKey) => (
                                <option key={kKey} value={kKey}>
                                  {kKey} — {LEVEL_K_LABELS[kKey].label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* PSMI Jump Helper */}
                          <div className="mt-2 text-right">
                            {scores.isPSMIEnabled ? (
                              <button
                                onClick={onNavigateToPSMI}
                                className="text-[11px] font-semibold text-[#173B57] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Ver análisis PSMI ({proc.psmis?.length || 1})</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-mono text-[#C85B3C]">
                                Faltan {scores.pointsToPSMI} pts para PSMI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
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
