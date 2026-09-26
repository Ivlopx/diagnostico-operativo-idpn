import React, { useEffect, useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Clock3, FileKey2, FolderOpen, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { createWorkspace, getRecentWorkspaces, RecentWorkspace } from '../utils/workspaceService';

interface Props { onNavigateToWorkspace: (workspaceId: string, inviteToken?: string) => void; }
export const LandingPage: React.FC<Props> = ({ onNavigateToWorkspace }) => {
  const [companyName, setCompanyName] = useState('');
  const [privateLink, setPrivateLink] = useState('');
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setRecent(getRecentWorkspaces()), []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault(); if (!companyName.trim()) return setError('Escribe el nombre de la empresa.');
    setCreating(true); setError(null);
    try { const invitation = await createWorkspace(companyName); onNavigateToWorkspace(invitation.workspaceId, invitation.inviteToken); }
    catch { setError('No fue posible crear el expediente. Intenta nuevamente.'); setCreating(false); }
  };
  const open = (event: React.FormEvent) => {
    event.preventDefault(); const workspace = privateLink.match(/\/w\/([a-zA-Z0-9_-]+)/)?.[1]; const invite = privateLink.match(/[#&?]invite=([a-zA-Z0-9_-]+)/)?.[1];
    if (!workspace || !invite) return setError('Pega el enlace privado completo, incluida la invitación.');
    onNavigateToWorkspace(workspace, invite);
  };

  return <div className="min-h-screen bg-[#F6F4EF] text-[#17212B]">
    <header className="border-b border-[#E1DED7] bg-[#FBFAF7]"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4"><div className="flex min-w-0 items-center gap-2.5 sm:gap-3"><img src="/assets/idpn.png" alt="IDPN" className="h-9 w-9 shrink-0 object-contain sm:h-11 sm:w-11"/><div className="min-w-0"><div className="truncate font-serif text-sm font-bold sm:text-base">DIAGNÓSTICO OPERATIVO</div><div className="text-[11px] text-[#7A8490] sm:text-xs">DOPYME + PSMI</div></div></div><div className="flex shrink-0 items-center gap-2"><div className="hidden sm:flex items-center gap-2 rounded-full bg-[#EAF0F3] px-3 py-1.5 text-xs font-semibold text-[#173B57]"><ShieldCheck className="h-3.5 w-3.5"/>Acceso privado</div><a href="/admin" aria-label="Administración" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#D9D5CC] bg-white px-2.5 py-2 text-xs font-semibold text-[#53616D] transition-colors hover:border-[#173B57] hover:text-[#173B57] sm:px-3"><LockKeyhole className="h-3.5 w-3.5"/><span className="hidden min-[390px]:inline">Administración</span></a></div></div></header>
    <main className="mx-auto grid min-h-[calc(100vh-145px)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] lg:gap-12">
      <section className="max-w-xl animate-fade-in">
        <p className="mb-4 text-xs font-bold uppercase tracking-[.18em] text-[#C85B3C]">Expediente operativo</p>
        <h1 className="font-serif text-3xl font-extrabold leading-tight tracking-[-.04em] min-[390px]:text-4xl sm:text-5xl">Entiende cómo opera tu empresa. Documenta cómo mejorarla.</h1>
        <p className="mt-5 text-base leading-7 text-[#5F6B76]">Realiza el Diagnóstico Operativo de Pequeñas y Medianas Empresas (DOPYME) e identifica los Procesos Sujetos a Mejora Inmediata (PSMI) en un expediente compartido.</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[['01','Diagnóstico','Madurez por área y proceso'],['02','Documentación','Procedimientos y responsables'],['03','Resultados','Indicadores y expediente PDF']].map(([n,title,text])=><div key={n} className="rounded-xl border border-[#E1DED7] bg-white p-4"><span className="text-xs font-bold text-[#C85B3C]">{n}</span><div className="mt-2 text-sm font-bold">{title}</div><div className="mt-1 text-xs leading-5 text-[#7A8490]">{text}</div></div>)}
        </div>
        {recent.length > 0 && <div className="mt-8"><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#687480]"><Clock3 className="h-4 w-4"/>Recientes en este dispositivo</div><div className="flex flex-wrap gap-2">{recent.map(item=><button key={item.id} onClick={()=>onNavigateToWorkspace(item.id,item.inviteToken)} className="flex items-center gap-2 rounded-xl border border-[#E1DED7] bg-white px-3 py-2 text-sm font-semibold hover:border-[#173B57]"><Building2 className="h-4 w-4 text-[#173B57]"/>{item.companyName}</button>)}</div></div>}
      </section>
      <section className="min-w-0 rounded-2xl border border-[#DEDAD1] bg-white p-5 shadow-[0_18px_55px_rgba(23,33,43,.08)] sm:p-8">
        <div className="mb-6"><div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-[#EAF0F3] text-[#173B57]"><FolderOpen className="h-5 w-5"/></div><h2 className="font-serif text-2xl font-bold">Comenzar expediente</h2><p className="mt-2 text-sm leading-6 text-[#687480]">Crea un espacio nuevo o continúa mediante un enlace privado.</p></div>
        <form onSubmit={create} className="space-y-3"><label className="block text-xs font-semibold text-[#4D5964]">Nombre de la empresa</label><input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Ej. Taller Norte" className="w-full rounded-xl border border-[#D9D5CC] bg-[#FCFBF9] px-4 py-3 text-sm outline-none focus:border-[#173B57] focus:bg-white"/><button disabled={creating} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#173B57] px-4 py-3 text-sm font-bold text-white hover:bg-[#102D43] disabled:opacity-60">{creating?<Loader2 className="h-4 w-4 animate-spin"/>:<ArrowRight className="h-4 w-4"/>}{creating?'Creando expediente…':'Crear expediente'}</button></form>
        <div className="my-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-[#A0A7AD]"><span className="h-px flex-1 bg-[#E6E2DA]"/>o continuar<span className="h-px flex-1 bg-[#E6E2DA]"/></div>
        <form onSubmit={open} className="space-y-3"><label className="block text-xs font-semibold text-[#4D5964]">Enlace privado</label><div className="relative"><FileKey2 className="absolute left-3.5 top-3.5 h-4 w-4 text-[#7A8490]"/><input value={privateLink} onChange={e=>setPrivateLink(e.target.value)} placeholder="https://…/w/…#invite=…" className="w-full rounded-xl border border-[#D9D5CC] bg-[#FCFBF9] py-3 pl-10 pr-4 text-sm outline-none focus:border-[#173B57] focus:bg-white"/></div><button className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D9D5CC] px-4 py-3 text-sm font-bold hover:bg-[#F6F4EF]"><LockKeyhole className="h-4 w-4"/>Abrir expediente</button></form>
        {error && <div role="alert" className="mt-4 rounded-xl bg-[#FFF2ED] px-4 py-3 text-sm text-[#A7472F]">{error}</div>}
        <div className="mt-6 flex items-start gap-2 border-t border-[#EEEAE3] pt-5 text-xs leading-5 text-[#7A8490]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#3B7A65]"/><span>El nombre de la empresa no permite localizar un expediente. Conserva el enlace como credencial privada.</span></div>
      </section>
    </main>
  </div>;
};
