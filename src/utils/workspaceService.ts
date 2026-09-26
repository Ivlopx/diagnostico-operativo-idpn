import { AreaDoc, ProcessDoc, WorkspaceDoc, calculateWorkspaceSustainableScore } from '../types';

class ApiError extends Error {
  constructor(message: string, public status: number, public payload?: unknown) { super(message); }
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(payload?.error || `HTTP ${response.status}`, response.status, payload);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
const body = (value: unknown): RequestInit => ({ method: 'POST', body: JSON.stringify(value) });
const patch = (value: unknown): RequestInit => ({ method: 'PATCH', body: JSON.stringify(value) });

export interface WorkspaceInvitation { workspaceId: string; inviteToken: string; }
export interface WorkspaceAccess { role: 'owner' | 'editor'; generation: number; }

export function buildWorkspaceInviteUrl(workspaceId: string, inviteToken: string) {
  return `${window.location.origin}/w/${workspaceId}#invite=${encodeURIComponent(inviteToken)}`;
}
export function createWorkspace(companyName: string) {
  return api<WorkspaceInvitation>('/api/workspaces', body({ companyName }));
}
export function authorizeWorkspaceAccess(workspaceId: string, inviteToken?: string | null) {
  return api<WorkspaceAccess>(`/api/workspaces/${workspaceId}/access`, body({ inviteToken })).catch(() => null);
}
export async function regenerateWorkspaceInvitation(workspaceId: string) {
  return (await api<{ inviteToken: string }>(`/api/workspaces/${workspaceId}/invitation/regenerate`, body({}))).inviteToken;
}

function poll<T>(load: () => Promise<T>, onData: (data: T) => void, onError: (error: unknown) => void) {
  let stopped = false;
  const run = async () => { try { const data = await load(); if (!stopped) onData(data); } catch (error) { if (!stopped) onError(error); } };
  void run();
  const timer = window.setInterval(run, 2500);
  return () => { stopped = true; window.clearInterval(timer); };
}
export function subscribeToWorkspace(workspaceId: string, onData: (data: WorkspaceDoc | null) => void, onError: (error: unknown) => void) {
  return poll(() => api<WorkspaceDoc>(`/api/workspaces/${workspaceId}`), onData, onError);
}
export function subscribeToAreas(workspaceId: string, onData: (data: AreaDoc[]) => void, onError: (error: unknown) => void) {
  return poll(() => api<AreaDoc[]>(`/api/workspaces/${workspaceId}/areas`), onData, onError);
}
export function subscribeToProcesses(workspaceId: string, onData: (data: ProcessDoc[]) => void, onError: (error: unknown) => void) {
  return poll(() => api<ProcessDoc[]>(`/api/workspaces/${workspaceId}/processes`), (processes) => {
    processes.forEach((process) => processRevisions.set(process.id, process.revision));
    onData(processes);
  }, onError);
}

export function updateWorkspaceName(workspaceId: string, name: string) { return api<void>(`/api/workspaces/${workspaceId}`, patch({ name })); }
export async function addArea(workspaceId: string, name: string, currentCount = 0) { return (await api<{ id: string }>(`/api/workspaces/${workspaceId}/areas`, body({ name, order: currentCount + 1 }))).id; }
export function updateArea(workspaceId: string, areaId: string, name: string) { return api<void>(`/api/workspaces/${workspaceId}/areas/${areaId}`, patch({ name })); }
export function deleteAreaWithProcesses(workspaceId: string, areaId: string) { return api<void>(`/api/workspaces/${workspaceId}/areas/${areaId}`, { method: 'DELETE' }); }
export async function addProcess(workspaceId: string, areaId: string, name = '', currentCount = 0) { return (await api<{ id: string }>(`/api/workspaces/${workspaceId}/processes`, body({ areaId, name, order: currentCount + 1 }))).id; }
const processRevisions = new Map<string, number>();
const processQueues = new Map<string, Promise<void>>();

export function updateProcess(workspaceId: string, processId: string, updates: Partial<ProcessDoc>) {
  const previous = processQueues.get(processId) || Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    const revision = processRevisions.get(processId);
    if (!revision) throw new Error('No se ha cargado la versión actual del proceso.');
    try {
      const saved = await api<ProcessDoc>(`/api/workspaces/${workspaceId}/processes/${processId}`, patch({ ...updates, revision }));
      processRevisions.set(processId, saved.revision);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const current = (error.payload as { current?: ProcessDoc } | null)?.current;
        if (current) processRevisions.set(processId, current.revision);
        window.dispatchEvent(new CustomEvent('dopyme:process-conflict', { detail: error.message }));
      }
      throw error;
    }
  });
  processQueues.set(processId, operation);
  void operation.finally(() => { if (processQueues.get(processId) === operation) processQueues.delete(processId); }).catch(() => undefined);
  return operation;
}
export function deleteProcess(workspaceId: string, processId: string) { return api<void>(`/api/workspaces/${workspaceId}/processes/${processId}`, { method: 'DELETE' }); }
export function clearWorkspaceData(workspaceId: string) { return api<void>(`/api/workspaces/${workspaceId}/data`, { method: 'DELETE' }); }
export function resetAllProcessesToBlank(workspaceId: string) { return api<void>(`/api/workspaces/${workspaceId}/processes/reset`, body({})); }

export interface RecentWorkspace { id: string; companyName: string; lastVisited: number; inviteToken?: string; }
const RECENT_KEY = 'dopyme_recent_workspaces';
export function getRecentWorkspaces(): RecentWorkspace[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
export function saveRecentWorkspace(id: string, companyName: string, inviteToken?: string) {
  const previous = getRecentWorkspaces();
  const savedToken = inviteToken || previous.find((item) => item.id === id)?.inviteToken;
  localStorage.setItem(RECENT_KEY, JSON.stringify([{ id, companyName, lastVisited: Date.now(), inviteToken: savedToken }, ...previous.filter((item) => item.id !== id)].slice(0, 10)));
}

export interface AdminWorkspaceRow { id: string; name: string; createdAt: number; createdAtFormatted: string; areasCount: number; processesCount: number; sustainableScore: number; }
export function verifyAdminSession() { return api<{ authenticated: boolean; setupRequired: boolean }>('/api/admin/session'); }
export function setupAdminPassword(password: string) { return api<{ success: boolean }>('/api/admin/setup', body({ password })); }
export function changeAdminPassword(currentPassword: string, newPassword: string) { return api<{ success: boolean }>('/api/admin/password', body({ currentPassword, newPassword })); }
export function logoutAdmin() { return api<void>('/api/admin/logout', body({})); }
export function fetchAdminWorkspacesSummary() { return api<AdminWorkspaceRow[]>('/api/admin/workspaces'); }
export function deleteWorkspace(workspaceId: string) { return api<void>(`/api/admin/workspaces/${workspaceId}`, { method: 'DELETE' }); }
export function openWorkspaceAsAdmin(workspaceId: string) { return api<void>(`/api/admin/workspaces/${workspaceId}/open`, body({})); }
export function fetchWorkspaceFullData(workspaceId: string) { return api<{ workspace: WorkspaceDoc | null; areas: AreaDoc[]; processes: ProcessDoc[] }>(`/api/admin/workspaces/${workspaceId}`); }

export { calculateWorkspaceSustainableScore };
