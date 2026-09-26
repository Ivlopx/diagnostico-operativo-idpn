/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import {
  WorkspaceDoc,
  AreaDoc,
  ProcessDoc,
  calculateWorkspaceSustainableScore,
  calculateAreaScores,
  calculateProcessScores,
  calculatePSMISummary,
  calculateActivityClassification,
  calculateActivityCriticality,
} from './types';
import {
  subscribeToWorkspace,
  subscribeToAreas,
  subscribeToProcesses,
  authorizeWorkspaceAccess,
  buildWorkspaceInviteUrl,
  regenerateWorkspaceInvitation,
  saveRecentWorkspace,
  verifyAdminSession,
} from './utils/workspaceService';
import { renderComparativeRadarToDataURL, renderRadarToDataURL } from './utils/radarRenderer';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { WorkspaceHome } from './components/WorkspaceHome';
import { WorkspaceNotFound } from './components/WorkspaceNotFound';
import { Loader2 } from 'lucide-react';

const DopymeView = lazy(() => import('./components/DopymeView').then((module) => ({ default: module.DopymeView })));
const PSMIView = lazy(() => import('./components/PSMIView').then((module) => ({ default: module.PSMIView })));
const AdminView = lazy(() => import('./components/AdminView').then((module) => ({ default: module.AdminView })));

function PageLoader() {
  return <div className="min-h-[40vh] grid place-items-center"><Loader2 className="w-7 h-7 text-[#173B57] animate-spin" aria-label="Cargando" /></div>;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    return new URLSearchParams(window.location.hash.slice(1)).get('invite');
  });
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);
  const [adminSetupRequired, setAdminSetupRequired] = useState<boolean | null>(null);

  useEffect(() => {
    verifyAdminSession()
      .then(({ setupRequired }) => setAdminSetupRequired(setupRequired))
      .catch(() => setAdminSetupRequired(false));
  }, []);

  // Workspace state synchronized with the SQL API
  const [workspace, setWorkspace] = useState<WorkspaceDoc | null>(null);
  const [areas, setAreas] = useState<AreaDoc[]>([]);
  const [processes, setProcesses] = useState<ProcessDoc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [workspaceNotFound, setWorkspaceNotFound] = useState<boolean>(false);

  // Active view inside workspace: 'home' | 'dopyme' | 'psmi'
  const [activeView, setActiveView] = useState<'home' | 'dopyme' | 'psmi'>('home');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: number | undefined;
    const handleConflict = (event: Event) => {
      setConflictMessage((event as CustomEvent<string>).detail);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setConflictMessage(null), 8000);
    };
    window.addEventListener('dopyme:process-conflict', handleConflict);
    return () => { window.removeEventListener('dopyme:process-conflict', handleConflict); window.clearTimeout(timer); };
  }, []);

  // Listen to browser history navigation (back / forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      setInviteToken(new URLSearchParams(window.location.hash.slice(1)).get('invite'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Parse path for /w/:id
  useEffect(() => {
    const match = currentPath.match(/^\/w\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      setWorkspaceId(match[1]);
    } else {
      setWorkspaceId(null);
      setIsLoading(false);
    }
  }, [currentPath]);

  // Navigate helper
  const navigateTo = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  }, []);

  // Poll the SQL API while a workspace is open
  useEffect(() => {
    if (adminSetupRequired !== false) return;
    if (!workspaceId) {
      setWorkspace(null);
      setAreas([]);
      setProcesses([]);
      setWorkspaceNotFound(false);
      setIsWorkspaceOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setWorkspaceNotFound(false);

    let unsubWorkspace: (() => void) | null = null;
    let unsubAreas: (() => void) | null = null;
    let unsubProcesses: (() => void) | null = null;

    let cancelled = false;

    authorizeWorkspaceAccess(workspaceId, inviteToken).then((access) => {
      if (cancelled) return;
      if (!access) {
        setWorkspaceNotFound(true);
        setIsLoading(false);
        return;
      }
      setIsWorkspaceOwner(access.role === 'owner');

      // 1. Poll workspace metadata while it is open
      unsubWorkspace = subscribeToWorkspace(
        workspaceId,
        (data) => {
          if (!data) {
            setWorkspaceNotFound(true);
          } else {
            setWorkspace(data);
            setWorkspaceNotFound(false);
            const wsName = data.name || data.companyName || 'Mi Empresa';
            if (data.id) {
              saveRecentWorkspace(data.id, wsName, inviteToken || undefined);
            }
          }
          setIsLoading(false);
        },
        (err) => {
          console.error('Error in workspace subscription:', err);
          setWorkspaceNotFound(true);
          setIsLoading(false);
        }
      );

      // 2. Subscribe to Areas collection
      unsubAreas = subscribeToAreas(
        workspaceId,
        (areaList) => {
          setAreas(areaList);
        },
        (err) => {
          console.error('Error in areas subscription:', err);
        }
      );

      // 3. Subscribe to Processes collection (EACH PROCESS IS ITS OWN DOCUMENT!)
      unsubProcesses = subscribeToProcesses(
        workspaceId,
        (processList) => {
          setProcesses(processList);
        },
        (err) => {
          console.error('Error in processes subscription:', err);
        }
      );
    }).catch((err) => {
      if (cancelled) return;
      console.error('Error authorizing workspace access:', err);
      setWorkspaceNotFound(true);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      if (unsubWorkspace) unsubWorkspace();
      if (unsubAreas) unsubAreas();
      if (unsubProcesses) unsubProcesses();
    };
  }, [workspaceId, inviteToken, adminSetupRequired]);

  const handleRegenerateInvitation = async () => {
    if (!workspaceId) return;
    const newToken = await regenerateWorkspaceInvitation(workspaceId);
    const nextUrl = buildWorkspaceInviteUrl(workspaceId, newToken);
    window.history.replaceState({}, '', `/w/${workspaceId}#invite=${encodeURIComponent(newToken)}`);
    setInviteToken(newToken);
    if (workspace) saveRecentWorkspace(workspaceId, workspace.name, newToken);
    await navigator.clipboard.writeText(nextUrl);
  };

  // Sustainable score calculation
  const { sustainableScore, areaScoresMap } = calculateWorkspaceSustainableScore(
    areas,
    processes
  );

  // PDF Export Handler
  const handleExportPdf = async () => {
    if (!workspace) return;
    setIsExportingPdf(true);

    try {
      // 1. Generate radar chart base64 PNG images directly via canvas
      const operationData = areas.map((a) => ({
        label: a.name,
        value: areaScoresMap[a.id]?.J || 0,
      }));
      const processesData = areas.map((a) => ({
        label: a.name,
        value: areaScoresMap[a.id]?.Q || 0,
      }));
      const generalData = areas.map((a) => ({
        label: a.name,
        value: areaScoresMap[a.id]?.R || 0,
      }));

      const comparisonImg = renderComparativeRadarToDataURL([
        { label: 'Operación J', color: '#4D9DE0', data: operationData.map((item) => ({ ...item, value: item.value * 2 })) },
        { label: 'Procesos Q', color: '#58B368', data: processesData.map((item) => ({ ...item, value: item.value * 2 })) },
        { label: 'Resultado R', color: '#FF6B78', data: generalData },
      ], 'Comparativa Integral por Área', 520);

      // 2. Build area-level detail and area radar images
      const areasPayload = areas.map((area) => {
        const aScores = areaScoresMap[area.id] || { J: 0, Q: 0, R: 0 };
        const areaProcs = processes.filter((p) => p.areaId === area.id);

        const areaProcRadarData = areaProcs.map((p) => ({
          label: p.name,
          value: calculateProcessScores(p).R,
        }));

        const areaChartImg = renderRadarToDataURL(
          areaProcRadarData,
          100,
          `Resultado R de Procesos - ${area.name}`,
          400,
          '#173B57'
        );

        return {
          id: area.id,
          name: area.name,
          J: aScores.J,
          Q: aScores.Q,
          R: aScores.R,
          chartImageBase64: areaChartImg,
          processes: areaProcs.map((p) => {
            const pScores = calculateProcessScores(p);
            return {
              name: p.name,
              O: p.O,
              P: p.P,
              E: p.E,
              A: p.A,
              levelMBC: p.levelMBC || 'NONE',
              levelK: p.levelK || 'NE',
              J: pScores.J,
              Q: pScores.Q,
              R: pScores.R,
              psmis: (p.psmis || []).map((psmi) => ({
                processName: psmi.processName || p.name,
                entradas: psmi.entradas || '',
                salidas: psmi.salidas || '',
                unidadTiempo: psmi.unidadTiempo || 'Minutos',
                reviso: psmi.reviso || '',
                autorizo: psmi.autorizo || '',
                summary: calculatePSMISummary(psmi),
                actividades: (psmi.actividades || []).map((act) => ({
                  no: act.no,
                  actividad: act.actividad || '',
                  etapa: act.etapa || '',
                  detalle: act.detalle || '',
                  competencia: act.competencia || '',
                  responsable: act.responsable || '',
                  esCiclo: !!act.esCiclo,
                  agregaValor: !!act.agregaValor,
                  esRequisito: !!act.esRequisito,
                  satisfaceCliente: !!act.satisfaceCliente,
                  clasificacion: calculateActivityClassification(act),
                  criticidad: calculateActivityCriticality(act),
                  tiempoActividad: Number(act.tiempoActividad) || 0,
                  tiempoProceso: Number(act.tiempoProceso) || 0,
                  herramientas: {
                    formato: act.herramientas?.formato || '',
                    registroInfo: act.herramientas?.registroInfo || '',
                    software: act.herramientas?.software || '',
                    links: act.herramientas?.links || '',
                    revisionCumplimiento: act.herramientas?.revisionCumplimiento || '',
                    instrucciones: act.herramientas?.instrucciones || '',
                  },
                })),
              })),
            };
          }),
        };
      });

      const payload = {
        workspaceId: workspace.id,
        companyName: workspace.name || 'Mi Empresa',
        generatedDate: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        sustainableScore,
        summaryCharts: [{ title: 'Comparativa Integral por Área', imageBase64: comparisonImg }],
        areas: areasPayload,
      };

      // Send to server PDF generator
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (workspace.name || 'Empresa').toLowerCase().replace(/[^a-z0-9]/g, '_');
      a.download = `Expediente_Dopyme_PSMI_${cleanName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error during PDF download:', err);
      alert('Hubo un error al generar el PDF. Por favor verifica la conexión y reintenta.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (adminSetupRequired === null) return <PageLoader />;

  // The first installation stays in setup until an administrator password exists.
  if (adminSetupRequired) {
    return <Suspense fallback={<PageLoader />}><AdminView
      onNavigateToWorkspace={(id) => navigateTo(`/w/${id}`)}
      onBackToHome={() => navigateTo('/')}
      onSetupComplete={() => setAdminSetupRequired(false)}
    /></Suspense>;
  }

  // ROUTE 0: Administrator Dashboard (/admin)
  if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
    return <Suspense fallback={<PageLoader />}><AdminView
      onNavigateToWorkspace={(id) => navigateTo(`/w/${id}`)}
      onBackToHome={() => navigateTo('/')}
      onSetupComplete={() => setAdminSetupRequired(false)}
    /></Suspense>;
  }

  // ROUTE 1: Landing Page when path is "/"
  if (!workspaceId) {
    return (
      <LandingPage
        onNavigateToWorkspace={(id, token) => {
          navigateTo(`/w/${id}${token ? `#invite=${encodeURIComponent(token)}` : ''}`);
          setInviteToken(token || null);
        }}
      />
    );
  }

  // ROUTE 2: Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white border border-[#D9D5CC] p-8 rounded-xl shadow-sm space-y-4 max-w-sm w-full">
          <Loader2 className="w-8 h-8 text-[#173B57] animate-spin mx-auto" />
          <h2 className="font-serif text-lg font-bold text-[#17212B]">
            Cargando expediente de la empresa…
          </h2>
          <p className="text-xs text-[#17212B]/60 font-mono">
            Sincronizando datos con el servidor
          </p>
        </div>
      </div>
    );
  }

  // ROUTE 3: Workspace Not Found (/w/invalid-id)
  if (workspaceNotFound || !workspace) {
    return (
      <WorkspaceNotFound
        onBackToHome={() => {
          navigateTo('/');
        }}
      />
    );
  }

  // ROUTE 4: Workspace Loaded (/w/:id)
  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17212B] lg:pl-72 flex flex-col justify-between">
      {conflictMessage && (
        <div role="alert" className="fixed inset-x-3 top-3 z-50 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg sm:inset-x-auto sm:right-4 sm:top-4 sm:max-w-md">
          <strong className="block mb-1">Edición simultánea detectada</strong>
          {conflictMessage} La vista se actualizará automáticamente.
        </div>
      )}
      {/* Top Header with autosave company name, share link, and PDF button */}
      <Header
        workspaceId={workspace.id}
        companyName={workspace.name}
        activeView={activeView}
        setActiveView={setActiveView}
        onExportPdf={handleExportPdf}
        isExportingPdf={isExportingPdf}
        sustainableScore={sustainableScore}
        inviteToken={inviteToken}
        isWorkspaceOwner={isWorkspaceOwner}
        onRegenerateInvitation={handleRegenerateInvitation}
      />

      {/* Main Content Body */}
      <main className="flex-1">
        {activeView === 'home' && (
          <WorkspaceHome
            companyName={workspace.name}
            workspaceId={workspace.id}
            areas={areas}
            processes={processes}
            sustainableScore={sustainableScore}
            onSelectActivity={(activity) => setActiveView(activity)}
            onExportPdf={handleExportPdf}
          />
        )}

        <Suspense fallback={<PageLoader />}>
        {activeView === 'dopyme' && (
          <DopymeView
            workspaceId={workspace.id}
            areas={areas}
            processes={processes}
            onNavigateToPSMI={() => setActiveView('psmi')}
          />
        )}

        {activeView === 'psmi' && (
          <PSMIView
            workspaceId={workspace.id}
            areas={areas}
            processes={processes}
            onNavigateToDopyme={() => setActiveView('dopyme')}
          />
        )}
        </Suspense>
      </main>

    </div>
  );
}
