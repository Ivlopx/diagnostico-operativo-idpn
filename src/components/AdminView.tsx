import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  ArrowLeft,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Activity,
  ExternalLink,
  Loader2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  AlertCircle,
  FolderOpen,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  X,
  KeyRound,
} from 'lucide-react';
import {
  fetchAdminWorkspacesSummary,
  fetchWorkspaceFullData,
  deleteWorkspace,
  logoutAdmin,
  verifyAdminSession,
  openWorkspaceAsAdmin,
  setupAdminPassword,
  changeAdminPassword,
  AdminWorkspaceRow,
} from '../utils/workspaceService';
import { exportWorkspaceToExcel } from '../utils/excelExport';

interface AdminViewProps {
  onNavigateToWorkspace: (workspaceId: string) => void;
  onBackToHome: () => void;
  onSetupComplete?: () => void;
}

type SortColumn = 'name' | 'createdAt' | 'areasCount' | 'processesCount' | 'sustainableScore';
type SortDirection = 'asc' | 'desc';

export const AdminView: React.FC<AdminViewProps> = ({
  onNavigateToWorkspace,
  onBackToHome,
  onSetupComplete,
}) => {
  const handleOpenWorkspace = async (workspaceId: string) => {
    try {
      await openWorkspaceAsAdmin(workspaceId);
      onNavigateToWorkspace(workspaceId);
    } catch {
      setNotification({ type: 'error', message: 'No se pudo abrir el expediente con la sesión administrativa.' });
    }
  };
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Data state
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Selection state
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);

  // Action states
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<AdminWorkspaceRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Verify password with backend API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Por favor ingresa la contraseña.');
      return;
    }

    setIsVerifying(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setAuthError(data.error || 'Contraseña incorrecta.');
      }
    } catch (err) {
      console.error('Error logging in as admin:', err);
      setAuthError('Error al contactar con el servidor. Intenta de nuevo.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.length < 12) return setAuthError('Usa al menos 12 caracteres.');
    if (passwordInput !== passwordConfirmation) return setAuthError('Las contraseñas no coinciden.');
    setIsVerifying(true);
    setAuthError(null);
    try {
      await setupAdminPassword(passwordInput);
      setSetupRequired(false);
      setIsAuthenticated(true);
      onSetupComplete?.();
      setPasswordInput('');
      setPasswordConfirmation('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'No se pudo completar la configuración.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 12) return setPasswordChangeError('Usa al menos 12 caracteres.');
    if (newPassword !== newPasswordConfirmation) return setPasswordChangeError('Las contraseñas nuevas no coinciden.');
    setIsChangingPassword(true);
    setPasswordChangeError(null);
    try {
      await changeAdminPassword(currentPassword, newPassword);
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setNotification({ type: 'success', message: 'Contraseña actualizada. Las demás sesiones administrativas fueron cerradas.' });
    } catch (error) {
      setPasswordChangeError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    void logoutAdmin();
    setIsAuthenticated(false);
    setPasswordInput('');
    setWorkspaces([]);
    setSelectedWorkspaceId(null);
  };

  useEffect(() => {
    verifyAdminSession()
      .then(({ authenticated, setupRequired: required }) => { setIsAuthenticated(authenticated); setSetupRequired(required); })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsCheckingSession(false));
  }, []);

  // Load workspaces data
  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const rows = await fetchAdminWorkspacesSummary();
      setWorkspaces(rows);
    } catch (err) {
      console.error('Error loading admin workspaces:', err);
      setNotification({
        type: 'error',
        message: 'No se pudieron cargar los datos del servidor.',
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'name' ? 'asc' : 'desc');
    }
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    let result = [...workspaces];

    // Filter by company name or ID
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return result;
  }, [workspaces, searchTerm, sortColumn, sortDirection]);

  // Global metrics summary
  const summaryMetrics = useMemo(() => {
    const totalCompanies = workspaces.length;
    let totalAreas = 0;
    let totalProcesses = 0;
    let sumScore = 0;

    workspaces.forEach((w) => {
      totalAreas += w.areasCount;
      totalProcesses += w.processesCount;
      sumScore += w.sustainableScore;
    });

    const avgScore = totalCompanies > 0
      ? parseFloat((sumScore / totalCompanies).toFixed(1))
      : 0;

    return { totalCompanies, totalAreas, totalProcesses, avgScore };
  }, [workspaces]);

  // Selected row reference
  const selectedWorkspace = useMemo(() => {
    if (!selectedWorkspaceId) return null;
    return workspaces.find((w) => w.id === selectedWorkspaceId) || null;
  }, [selectedWorkspaceId, workspaces]);

  // Export to Excel handler
  const handleExportExcel = async (row: AdminWorkspaceRow) => {
    setExportingId(row.id);
    try {
      const fullData = await fetchWorkspaceFullData(row.id);
      if (!fullData.workspace) {
        setNotification({
          type: 'error',
          message: `No se encontró la información completa de ${row.name}.`,
        });
        return;
      }

      await exportWorkspaceToExcel(fullData.workspace, fullData.areas, fullData.processes);
      setNotification({
        type: 'success',
        message: `Se descargó el archivo Excel de "${row.name}" con 4 pestañas (Dashboard, Resumen, DOPYME y PSMI).`,
      });
    } catch (err) {
      console.error('Error exporting workspace to Excel:', err);
      setNotification({
        type: 'error',
        message: `Error al generar el archivo Excel para ${row.name}.`,
      });
    } finally {
      setExportingId(null);
    }
  };

  // Confirm delete workspace handler
  const handleConfirmDelete = async () => {
    if (!companyToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWorkspace(companyToDelete.id);

      // Remove from state
      setWorkspaces((prev) => prev.filter((w) => w.id !== companyToDelete.id));
      if (selectedWorkspaceId === companyToDelete.id) {
        setSelectedWorkspaceId(null);
      }

      setNotification({
        type: 'success',
        message: `La empresa "${companyToDelete.name}" y todos sus datos fueron eliminados permanentemente.`,
      });
      setCompanyToDelete(null);
    } catch (err) {
      console.error('Error deleting workspace:', err);
      setNotification({
        type: 'error',
        message: `Ocurrió un error al eliminar la empresa "${companyToDelete.name}".`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for rendering sort arrow
  const renderSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-[#17212B]/30 ml-1 inline-block" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-[#173B57] ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-[#173B57] ml-1 inline-block" />
    );
  };

  // ----------------- LOGIN VIEW -----------------
  if (isCheckingSession) {
    return <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center"><Loader2 className="w-7 h-7 text-[#173B57] animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] text-[#17212B] flex flex-col justify-between selection:bg-[#173B57]/20">
        <header className="border-b border-[#D9D5CC] bg-white px-4 py-3 sm:px-6 sm:py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#17212B]/70 hover:text-[#17212B] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la aplicación</span>
            </button>
            <span className="text-[11px] font-mono text-[#17212B]/60 bg-[#F6F4EF] px-2.5 py-1 rounded-xl border border-[#D9D5CC]">
              Área Restringida
            </span>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-3 py-8 sm:px-4 sm:py-12">
          <div className="max-w-md w-full bg-white border-2 border-[#D9D5CC] p-5 sm:p-8 rounded-xl shadow-sm relative overflow-hidden space-y-6">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#173B57]" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#173B57]/10 text-[#173B57] flex items-center justify-center shrink-0">
                {setupRequired ? <KeyRound className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-[#17212B]">
                  {setupRequired ? 'Configuración inicial' : 'Acceso administrativo'}
                </h1>
                <p className="text-xs text-[#17212B]/60 font-mono">
                  {setupRequired ? 'Protege el panel administrativo' : 'Área privada'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[#17212B]/75 leading-relaxed">
              {setupRequired
                ? 'Crea la contraseña que se usará para administrar la aplicación. Debe contener al menos 12 caracteres.'
                : 'Ingresa la credencial autorizada para continuar.'}
            </p>

            <form onSubmit={setupRequired ? handleSetup : handleLogin} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-[#17212B]/70 block mb-1.5">
                  Contraseña de Administrador
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={setupRequired ? 'Crea una contraseña segura…' : 'Introduce tu clave secreta…'}
                  className="w-full px-3 py-2.5 bg-[#F6F4EF]/40 focus:bg-white border border-[#D9D5CC] focus:border-[#173B57] text-sm font-mono rounded-xl outline-hidden transition-colors"
                  disabled={isVerifying}
                  autoFocus
                />
              </div>

              {setupRequired && (
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[#17212B]/70 block mb-1.5">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    placeholder="Repite la contraseña…"
                    className="w-full px-3 py-2.5 bg-[#F6F4EF]/40 focus:bg-white border border-[#D9D5CC] focus:border-[#173B57] text-sm font-mono rounded-xl outline-hidden transition-colors"
                    disabled={isVerifying}
                  />
                </div>
              )}

              {authError && (
                <div className="p-3 bg-[#FFF2ED] border border-[#C85B3C]/30 rounded-xl flex items-center gap-2 text-xs text-[#C85B3C]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-2.5 px-4 bg-[#173B57] hover:bg-[#102D43] text-white font-serif font-bold text-sm rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{setupRequired ? 'Guardando configuración…' : 'Verificando credencial…'}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{setupRequired ? 'Crear contraseña y continuar' : 'Entrar al Panel'}</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-[#D9D5CC] text-center">
              <button
                type="button"
                onClick={onBackToHome}
                className="text-xs text-[#17212B]/60 hover:text-[#173B57] underline cursor-pointer"
              >
                ← Regresar al inicio
              </button>
            </div>
          </div>
        </main>

      </div>
    );
  }

  // ----------------- DASHBOARD VIEW -----------------
  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17212B] flex flex-col justify-between selection:bg-[#173B57]/20">
      {/* Header */}
      <header className="border-b border-[#D9D5CC] bg-white px-3 py-3 sm:px-6 sm:py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToHome}
              className="p-1.5 hover:bg-[#F6F4EF] border border-[#D9D5CC] rounded-xl text-[#17212B] transition-colors cursor-pointer"
              title="Volver al inicio"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <img src="/assets/idpn.png" alt="IDPN" className="h-9 w-9 shrink-0 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-base font-bold tracking-tight text-[#17212B]">
                  Panel de Administrador
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[#173B57]/10 text-[#173B57] rounded-xl font-semibold border border-[#173B57]/20">
                  ADMIN ACTIVO
                </span>
              </div>
              <span className="text-[11px] text-[#17212B]/60 font-mono block">
                Supervisión centralizada, descarga en Excel y eliminación de expedientes
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPasswordChange(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#17212B] bg-white hover:bg-[#F6F4EF] border border-[#D9D5CC] rounded-xl transition-colors cursor-pointer"
              title="Cambiar contraseña administrativa"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Contraseña</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoadingData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#17212B] bg-[#F6F4EF] hover:bg-[#E2E6DF] border border-[#D9D5CC] rounded-xl transition-colors cursor-pointer disabled:opacity-60"
              title="Recargar datos del servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#C85B3C] hover:bg-[#FFF2ED] border border-[#D9D5CC] hover:border-[#C85B3C]/40 rounded-xl transition-colors cursor-pointer bg-white"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed inset-x-3 top-20 z-50 animate-in fade-in slide-in-from-top duration-200 sm:inset-x-auto sm:right-6 sm:max-w-md">
          <div
            className={`p-3.5 rounded-xl border shadow-md flex items-start gap-2.5 text-xs ${
              notification.type === 'success'
                ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#166534]'
                : 'bg-[#FFF2ED] border-[#C85B3C]/40 text-[#C85B3C]'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#166534]" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#C85B3C]" />
            )}
            <div className="flex-1 font-medium leading-relaxed">
              {notification.message}
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-[#17212B]/40 hover:text-[#17212B] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 py-5 sm:px-6 sm:py-8 flex-1 w-full space-y-5 sm:space-y-6">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-[#D9D5CC] p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#17212B]/60 text-xs font-mono">
              <span>Empresas Registradas</span>
              <Building2 className="w-4 h-4 text-[#173B57]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#17212B]">
              {summaryMetrics.totalCompanies}
            </div>
            <div className="text-[10px] text-[#17212B]/60 font-mono">
              Expedientes en PostgreSQL
            </div>
          </div>

          <div className="bg-white border border-[#D9D5CC] p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#17212B]/60 text-xs font-mono">
              <span>Áreas Organizacionales</span>
              <Layers className="w-4 h-4 text-[#173B57]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#17212B]">
              {summaryMetrics.totalAreas}
            </div>
            <div className="text-[10px] text-[#17212B]/60 font-mono">
              Áreas activas creadas
            </div>
          </div>

          <div className="bg-white border border-[#D9D5CC] p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#17212B]/60 text-xs font-mono">
              <span>Procesos Evaluados</span>
              <FileSpreadsheet className="w-4 h-4 text-[#173B57]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#17212B]">
              {summaryMetrics.totalProcesses}
            </div>
            <div className="text-[10px] text-[#17212B]/60 font-mono">
              Procesos totales en plataforma
            </div>
          </div>

          <div className="bg-white border border-[#D9D5CC] p-4 rounded-xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#17212B]/60 text-xs font-mono">
              <span>Promedio Sustentable</span>
              <Activity className="w-4 h-4 text-[#173B57]" />
            </div>
            <div className="text-2xl font-serif font-bold text-[#173B57]">
              {summaryMetrics.avgScore} <span className="text-xs font-normal text-[#17212B]/60">/ 100</span>
            </div>
            <div className="text-[10px] text-[#17212B]/60 font-mono">
              Madurez global de empresas
            </div>
          </div>
        </div>

        {/* Action Toolbar for Selected Company */}
        {selectedWorkspace && (
          <div className="bg-[#173B57]/10 border-2 border-[#173B57] p-3.5 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-[#173B57] text-white flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div>
                <span className="text-xs font-serif font-bold text-[#17212B] block">
                  Empresa Seleccionada: <span className="text-[#173B57]">{selectedWorkspace.name}</span>
                </span>
                <span className="text-[10px] font-mono text-[#17212B]/70">
                  ID: {selectedWorkspace.id} • {selectedWorkspace.areasCount} áreas • {selectedWorkspace.processesCount} procesos
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
              <button
                onClick={() => handleExportExcel(selectedWorkspace)}
                disabled={exportingId === selectedWorkspace.id}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#173B57] hover:bg-[#102D43] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {exportingId === selectedWorkspace.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                <span>Bajar en Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => handleOpenWorkspace(selectedWorkspace.id)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F6F4EF] text-[#17212B] border border-[#D9D5CC] text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#173B57]" />
                <span>Abrir</span>
              </button>

              <button
                onClick={() => setCompanyToDelete(selectedWorkspace)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#C85B3C] hover:bg-[#923e1f] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>

              <button
                onClick={() => setSelectedWorkspaceId(null)}
                className="p-1.5 text-[#17212B]/60 hover:text-[#17212B] cursor-pointer"
                title="Deseleccionar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-[#D9D5CC] p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#17212B]/40 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre de empresa o ID…"
              className="w-full pl-9 pr-8 py-2 bg-[#F6F4EF]/40 focus:bg-white border border-[#D9D5CC] focus:border-[#173B57] text-xs font-medium rounded-xl outline-hidden transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-xs text-[#17212B]/40 hover:text-[#17212B] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs font-mono text-[#17212B]/70 flex items-center justify-between sm:justify-end gap-3">
            <span>
              Mostrando <strong>{filteredAndSortedRows.length}</strong> de {workspaces.length} empresas
            </span>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white border border-[#D9D5CC] rounded-xl shadow-sm overflow-hidden">
          {isLoadingData ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#173B57] animate-spin mx-auto" />
              <p className="font-serif text-sm font-bold text-[#17212B]">
                Consultando expedientes…
              </p>
              <p className="text-xs text-[#17212B]/60 font-mono">
                Calculando áreas, procesos y resultado sustentable por empresa
              </p>
            </div>
          ) : filteredAndSortedRows.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <FolderOpen className="w-10 h-10 text-[#17212B]/30 mx-auto" />
              <h3 className="font-serif text-base font-bold text-[#17212B]">
                No se encontraron empresas
              </h3>
              <p className="text-xs text-[#17212B]/65 max-w-sm mx-auto">
                {searchTerm
                  ? 'No hay ninguna empresa que coincida con el filtro de búsqueda ingresado.'
                  : 'Aún no se han creado expedientes de empresas en la plataforma.'}
              </p>
            </div>
          ) : (
            <>
            <div className="divide-y divide-[#D9D5CC] md:hidden">
              {filteredAndSortedRows.map((row) => (
                <article key={row.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><Building2 className="h-4 w-4 shrink-0 text-[#173B57]"/><h3 className="truncate text-sm font-bold">{row.name}</h3></div>
                      <p className="mt-1 truncate pl-6 font-mono text-[10px] text-[#17212B]/50">ID: {row.id}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-[#173B57]/10 px-2 py-1 font-mono text-xs font-bold text-[#173B57]">{row.sustainableScore}/100</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#F6F4EF] p-3 text-center">
                    <div><span className="block text-[10px] text-[#17212B]/60">Áreas</span><strong className="font-mono text-sm">{row.areasCount}</strong></div>
                    <div><span className="block text-[10px] text-[#17212B]/60">Procesos</span><strong className="font-mono text-sm">{row.processesCount}</strong></div>
                    <div><span className="block text-[10px] text-[#17212B]/60">Creación</span><strong className="text-[10px] leading-tight">{row.createdAtFormatted}</strong></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleExportExcel(row)} disabled={exportingId === row.id} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-[#D9D5CC] text-xs font-semibold disabled:opacity-60"><Download className="h-3.5 w-3.5"/>Excel</button>
                    <button onClick={() => handleOpenWorkspace(row.id)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg bg-[#173B57] text-xs font-semibold text-white"><ExternalLink className="h-3.5 w-3.5"/>Abrir</button>
                    <button onClick={() => setCompanyToDelete(row)} className="inline-flex min-h-10 items-center justify-center gap-1 rounded-lg border border-[#C85B3C]/30 text-xs font-semibold text-[#C85B3C]"><Trash2 className="h-3.5 w-3.5"/>Eliminar</button>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#D9D5CC] bg-[#F6F4EF]/70 text-[11px] font-mono uppercase tracking-wider text-[#17212B]/80">
                    <th className="py-3 px-3 w-10 text-center">
                      <span className="sr-only">Seleccionar</span>
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-4 font-bold cursor-pointer hover:bg-[#E2E6DF] transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Nombre de la empresa</span>
                        {renderSortIndicator('name')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('createdAt')}
                      className="py-3 px-4 font-bold cursor-pointer hover:bg-[#E2E6DF] transition-colors select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>Fecha de creación</span>
                        {renderSortIndicator('createdAt')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('areasCount')}
                      className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-[#E2E6DF] transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Áreas</span>
                        {renderSortIndicator('areasCount')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('processesCount')}
                      className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-[#E2E6DF] transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Procesos</span>
                        {renderSortIndicator('processesCount')}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('sustainableScore')}
                      className="py-3 px-4 font-bold text-center cursor-pointer hover:bg-[#E2E6DF] transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Resultado sustentable</span>
                        {renderSortIndicator('sustainableScore')}
                      </div>
                    </th>
                    <th className="py-3 px-4 font-bold text-right min-w-[240px]">
                      <span>Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D9D5CC] text-xs">
                  {filteredAndSortedRows.map((row) => {
                    const isSelected = selectedWorkspaceId === row.id;
                    const scoreColor =
                      row.sustainableScore >= 60
                        ? 'text-[#173B57]'
                        : row.sustainableScore >= 40
                        ? 'text-[#9C662A]'
                        : 'text-[#C85B3C]';

                    const scoreBarColor =
                      row.sustainableScore >= 60
                        ? 'bg-[#173B57]'
                        : row.sustainableScore >= 40
                        ? 'bg-[#D4A373]'
                        : 'bg-[#C85B3C]';

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedWorkspaceId(isSelected ? null : row.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#173B57]/10'
                            : 'hover:bg-[#F7F9F6]'
                        }`}
                      >
                        {/* Selector checkbox */}
                        <td
                          className="py-3.5 px-3 text-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorkspaceId(isSelected ? null : row.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 accent-[#173B57] rounded-xl cursor-pointer"
                          />
                        </td>

                        {/* Company Name & ID */}
                        <td className="py-3.5 px-4 font-medium text-[#17212B]">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-[#173B57] shrink-0" />
                            <div>
                              <div className="font-bold text-sm text-[#17212B]">
                                {row.name}
                              </div>
                              <div className="text-[10px] font-mono text-[#17212B]/50">
                                ID: {row.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#17212B]/75">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#17212B]/40 shrink-0" />
                            <span>{row.createdAtFormatted}</span>
                          </div>
                        </td>

                        {/* Areas Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-mono font-bold bg-[#F6F4EF] text-[#17212B] border border-[#D9D5CC] rounded-xl">
                            {row.areasCount}
                          </span>
                        </td>

                        {/* Processes Count */}
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 text-xs font-mono font-bold bg-[#F6F4EF] text-[#17212B] border border-[#D9D5CC] rounded-xl">
                            {row.processesCount}
                          </span>
                        </td>

                        {/* Sustainable Score */}
                        <td className="py-3.5 px-4">
                          <div className="max-w-[140px] mx-auto space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono font-bold">
                              <span className={scoreColor}>
                                {row.sustainableScore}
                              </span>
                              <span className="text-[10px] text-[#17212B]/50 font-normal">
                                / 100
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-[#F6F4EF] border border-[#D9D5CC]/70 rounded-xl overflow-hidden">
                              <div
                                className={`h-full ${scoreBarColor} transition-all duration-300`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, row.sustainableScore))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Action Buttons */}
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Download Excel */}
                            <button
                              onClick={() => handleExportExcel(row)}
                              disabled={exportingId === row.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#F6F4EF] hover:bg-[#E2E6DF] text-[#17212B] hover:text-[#173B57] border border-[#D9D5CC] rounded-xl text-[11px] font-mono transition-colors cursor-pointer disabled:opacity-60"
                              title={`Bajar información de ${row.name} en Excel`}
                            >
                              {exportingId === row.id ? (
                                <Loader2 className="w-3 h-3 animate-spin text-[#173B57]" />
                              ) : (
                                <FileSpreadsheet className="w-3 h-3 text-[#173B57]" />
                              )}
                              <span>Excel</span>
                            </button>

                            {/* Open Workspace */}
                            <button
                              onClick={() => handleOpenWorkspace(row.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#173B57] hover:bg-[#102D43] text-white text-[11px] font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                              title={`Abrir expediente de ${row.name}`}
                            >
                              <span>Abrir</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>

                            {/* Delete Workspace */}
                            <button
                              onClick={() => setCompanyToDelete(row)}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-[#FFF2ED] text-[#C85B3C] border border-[#D9D5CC] hover:border-[#C85B3C]/40 text-[11px] rounded-xl transition-colors cursor-pointer"
                              title={`Eliminar expediente de ${row.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Eliminar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 z-50 bg-[#17212B]/60 backdrop-blur-xs flex items-center justify-center overflow-y-auto p-3 sm:p-4">
          <form onSubmit={handlePasswordChange} className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto max-w-md w-full bg-white border-2 border-[#D9D5CC] p-5 sm:p-6 rounded-xl shadow-xl space-y-5 relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#173B57]" />
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#173B57]/10 text-[#173B57] flex items-center justify-center shrink-0"><KeyRound className="w-5 h-5" /></div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-bold">Cambiar contraseña</h3>
                <p className="text-xs text-[#17212B]/65 mt-1">Al guardarla se cerrarán las demás sesiones administrativas.</p>
              </div>
              <button type="button" onClick={() => setShowPasswordChange(false)} disabled={isChangingPassword} className="text-[#17212B]/40 hover:text-[#17212B] p-1 cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            {[
              ['Contraseña actual', currentPassword, setCurrentPassword],
              ['Nueva contraseña', newPassword, setNewPassword],
              ['Confirmar nueva contraseña', newPasswordConfirmation, setNewPasswordConfirmation],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block text-[11px] font-mono uppercase tracking-wider text-[#17212B]/70">
                {label as string}
                <input type="password" value={value as string} onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)} disabled={isChangingPassword} className="mt-1.5 w-full px-3 py-2.5 bg-[#F6F4EF]/40 focus:bg-white border border-[#D9D5CC] focus:border-[#173B57] text-sm font-mono rounded-xl outline-hidden" />
              </label>
            ))}
            {passwordChangeError && <div className="p-3 bg-[#FFF2ED] border border-[#C85B3C]/30 rounded-xl flex items-center gap-2 text-xs text-[#C85B3C]"><AlertCircle className="w-4 h-4 shrink-0" />{passwordChangeError}</div>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowPasswordChange(false)} disabled={isChangingPassword} className="px-3.5 py-2 border border-[#D9D5CC] text-xs rounded-xl cursor-pointer">Cancelar</button>
              <button type="submit" disabled={isChangingPassword} className="inline-flex items-center gap-2 px-4 py-2 bg-[#173B57] hover:bg-[#102D43] text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-60">
                {isChangingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar contraseña
              </button>
            </div>
          </form>
        </div>
      )}

      {companyToDelete && (
        <div className="fixed inset-0 z-50 bg-[#17212B]/60 backdrop-blur-xs flex items-center justify-center overflow-y-auto p-3 sm:p-4">
          <div className="max-h-[calc(100dvh-1.5rem)] overflow-y-auto max-w-md w-full bg-white border-2 border-[#D9D5CC] p-5 sm:p-6 rounded-xl shadow-xl space-y-5 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#C85B3C]" />

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2ED] border border-[#C85B3C]/30 text-[#C85B3C] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-lg font-bold text-[#17212B]">
                  ¿Eliminar empresa permanentemente?
                </h3>
                <p className="text-xs text-[#17212B]/65 font-mono mt-0.5">
                  Confirmación de borrado en base de datos
                </p>
              </div>
              <button
                onClick={() => setCompanyToDelete(null)}
                disabled={isDeleting}
                className="text-[#17212B]/40 hover:text-[#17212B] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-[#F6F4EF]/60 border border-[#D9D5CC] rounded-xl space-y-1.5 text-xs">
              <div className="font-bold text-[#17212B] flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#173B57]" />
                <span>{companyToDelete.name}</span>
              </div>
              <div className="font-mono text-[11px] text-[#17212B]/70">
                ID: {companyToDelete.id}
              </div>
              <div className="text-[11px] text-[#17212B]/70">
                Registra <strong>{companyToDelete.areasCount} áreas</strong> y{' '}
                <strong>{companyToDelete.processesCount} procesos evaluados</strong>.
              </div>
            </div>

            <p className="text-xs text-[#C85B3C] leading-relaxed">
              <strong>Atención:</strong> Esta acción borrará de forma irreversible el expediente, eliminando todas sus áreas, procesos y análisis PSMI vinculados.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 bg-white hover:bg-[#F6F4EF] text-[#17212B] border border-[#D9D5CC] text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#C85B3C] hover:bg-[#923e1f] text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Borrando expediente…</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sí, eliminar definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
