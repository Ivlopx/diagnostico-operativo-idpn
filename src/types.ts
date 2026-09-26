export type LevelMBC = 'NONE' | 'M' | 'B' | 'C';

export type LevelK = 'NE' | 'E' | 'D' | 'I' | 'U' | 'MC';

export const LEVEL_K_LABELS: Record<LevelK, { label: string; points: number }> = {
  NE: { label: 'No existe (0 pts)', points: 0 },
  E: { label: 'Existe (10 pts)', points: 10 },
  D: { label: 'Documentado (20 pts)', points: 20 },
  I: { label: 'Implementado (30 pts)', points: 30 },
  U: { label: 'Utilizado (40 pts)', points: 40 },
  MC: { label: 'Mejora continua (50 pts)', points: 50 },
};

export const LEVEL_MBC_LABELS: Record<LevelMBC, { label: string; points: number }> = {
  NONE: { label: 'Ninguno (0 pts)', points: 0 },
  M: { label: 'Nivel M (10 pts)', points: 10 },
  B: { label: 'Nivel B (20 pts)', points: 20 },
  C: { label: 'Nivel C (30 pts)', points: 30 },
};

export interface PSMIActivityTools {
  formato: string;
  registroInfo: string;
  software: string;
  links: string;
  revisionCumplimiento: string;
  instrucciones: string;
}

export interface PSMIActivity {
  id: string;
  no: number;
  detalle: string;
  actividad: string;
  etapa: string;
  esCiclo: boolean;
  competencia: string;
  responsable: string;
  agregaValor: boolean;
  esRequisito: boolean;
  satisfaceCliente: boolean;
  herramientas: PSMIActivityTools;
  tiempoActividad: number;
  tiempoProceso: number;
}

export interface PSMIMapping {
  id: string;
  processName: string;
  entradas: string;
  salidas: string;
  unidadTiempo: 'Minutos' | 'Horas' | 'Días';
  reviso: string;
  autorizo: string;
  actividades: PSMIActivity[];
}

export interface ProcessDoc {
  id: string;
  workspaceId: string;
  areaId: string;
  name: string;
  order: number;
  O: 0 | 5;
  P: 0 | 5;
  E: 0 | 5;
  A: 0 | 5;
  levelMBC: LevelMBC;
  levelK: LevelK;
  psmis: PSMIMapping[];
  revision: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface AreaDoc {
  id: string;
  workspaceId: string;
  name: string;
  order: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface WorkspaceDoc {
  id: string;
  name: string;
  companyName?: string;
  ownerUid?: string;
  inviteGeneration?: number;
  createdAt?: any;
  updatedAt?: any;
}

// ----------------- CALCULATION FUNCTIONS -----------------

export function calculateProcessScores(p: ProcessDoc) {
  const mbcPoints =
    p.levelMBC === 'M' ? 10 : p.levelMBC === 'B' ? 20 : p.levelMBC === 'C' ? 30 : 0;
  const J = (p.O || 0) + (p.P || 0) + (p.E || 0) + (p.A || 0) + mbcPoints; // Max: 5+5+5+5 + 30 = 50
  const Q = LEVEL_K_LABELS[p.levelK]?.points || 0; // Max: 50
  const R = J + Q; // Max: 100
  const isPSMIEnabled = R >= 60;
  const pointsToPSMI = Math.max(0, 60 - R);

  return { J, Q, R, isPSMIEnabled, pointsToPSMI };
}

export function calculateAreaScores(processes: ProcessDoc[]) {
  if (!processes || processes.length === 0) {
    return { J: 0, Q: 0, R: 0, count: 0, enabledCount: 0 };
  }
  let sumJ = 0;
  let sumQ = 0;
  let enabledCount = 0;

  for (const p of processes) {
    const scores = calculateProcessScores(p);
    sumJ += scores.J;
    sumQ += scores.Q;
    if (scores.isPSMIEnabled) enabledCount++;
  }

  const count = processes.length;
  const J = parseFloat((sumJ / count).toFixed(2));
  const Q = parseFloat((sumQ / count).toFixed(2));
  const R = parseFloat((J + Q).toFixed(2));

  return { J, Q, R, count, enabledCount };
}

export function calculateWorkspaceSustainableScore(
  areas: AreaDoc[],
  processes: ProcessDoc[]
) {
  if (!areas || areas.length === 0) {
    return { sustainableScore: 0, areaScoresMap: {} };
  }

  const areaScoresMap: Record<string, ReturnType<typeof calculateAreaScores>> = {};
  let sumAreaR = 0;

  for (const area of areas) {
    const areaProcesses = processes.filter((p) => p.areaId === area.id);
    const scores = calculateAreaScores(areaProcesses);
    areaScoresMap[area.id] = scores;
    sumAreaR += scores.R;
  }

  const sustainableScore = parseFloat((sumAreaR / areas.length).toFixed(2));

  return { sustainableScore, areaScoresMap };
}

export function calculateActivityClassification(act: {
  agregaValor: boolean;
  esRequisito: boolean;
  satisfaceCliente: boolean;
}): 'AGREGA VALOR' | 'ELIMINAR' {
  return act.agregaValor || act.esRequisito || act.satisfaceCliente
    ? 'AGREGA VALOR'
    : 'ELIMINAR';
}

export function calculateActivityCriticality(act: {
  agregaValor: boolean;
  esRequisito: boolean;
  satisfaceCliente: boolean;
}): 'CRITICA' | 'NORMAL' {
  return act.agregaValor && act.esRequisito && act.satisfaceCliente
    ? 'CRITICA'
    : 'NORMAL';
}

export function calculatePSMISummary(psmi: PSMIMapping) {
  const acts = psmi.actividades || [];
  const uniqueCompetencias = new Set<string>();
  const uniqueResponsables = new Set<string>();

  let sumTiempoProceso = 0;
  let totalCriticas = 0;
  let totalCiclicas = 0;
  let sumTiempoCriticas = 0;
  let totalCiclosCriticos = 0;

  for (const act of acts) {
    if (act.competencia && act.competencia.trim()) {
      uniqueCompetencias.add(act.competencia.trim().toLowerCase());
    }
    if (act.responsable && act.responsable.trim()) {
      uniqueResponsables.add(act.responsable.trim().toLowerCase());
    }

    const tProceso = Number(act.tiempoProceso) || 0;
    sumTiempoProceso += tProceso;

    const isCritica = calculateActivityCriticality(act) === 'CRITICA';
    if (isCritica) {
      totalCriticas++;
      sumTiempoCriticas += tProceso;
    }

    if (act.esCiclo) {
      totalCiclicas++;
      if (isCritica) {
        totalCiclosCriticos++;
      }
    }
  }

  return {
    totalCompetencias: uniqueCompetencias.size,
    totalPuestos: uniqueResponsables.size,
    sumTiempoProceso: parseFloat(sumTiempoProceso.toFixed(2)),
    totalCriticas,
    totalCiclicas,
    sumTiempoCriticas: parseFloat(sumTiempoCriticas.toFixed(2)),
    totalCiclosCriticos,
    totalActividades: acts.length,
  };
}

export function createEmptyPSMI(processName: string = ''): PSMIMapping {
  return {
    id: 'psmi_' + Math.random().toString(36).substring(2, 11),
    processName,
    entradas: '',
    salidas: '',
    unidadTiempo: 'Minutos',
    reviso: '',
    autorizo: '',
    actividades: [],
  };
}
