import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Building2, Check, ClipboardList, Download, Home, Link2, Loader2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { buildWorkspaceInviteUrl, updateWorkspaceName } from '../utils/workspaceService';

interface HeaderProps {
  workspaceId: string; companyName: string; activeView: 'home' | 'dopyme' | 'psmi';
  setActiveView: (view: 'home' | 'dopyme' | 'psmi') => void; onExportPdf: () => void;
  isExportingPdf: boolean; sustainableScore: number; inviteToken: string | null;
  isWorkspaceOwner: boolean; onRegenerateInvitation: () => Promise<void>;
}

const items = [
  { id: 'home' as const, label: 'Resumen', hint: 'Avance del expediente', icon: Home },
  { id: 'dopyme' as const, label: 'Diagnóstico DOPYME', hint: 'Etapa 1 · Diagnóstico operativo', icon: BarChart3 },
  { id: 'psmi' as const, label: 'Procesos PSMI', hint: 'Etapa 2 · Mejora inmediata', icon: ClipboardList },
];

export const Header: React.FC<HeaderProps> = (props) => {
  const [localName, setLocalName] = useState(props.companyName);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => setLocalName(props.companyName), [props.companyName]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const rename = (value: string) => {
    setLocalName(value); setSaveStatus('saving');
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      try { await updateWorkspaceName(props.workspaceId, value); setSaveStatus('saved'); window.setTimeout(() => setSaveStatus('idle'), 1800); }
      catch { setSaveStatus('idle'); }
    }, 650);
  };
  const copy = async () => {
    if (!props.inviteToken) return;
    await navigator.clipboard.writeText(buildWorkspaceInviteUrl(props.workspaceId, props.inviteToken));
    setCopied(true); window.setTimeout(() => setCopied(false), 2000);
  };
  const rotate = async () => {
    if (!confirm('El enlace anterior y las sesiones invitadas dejarán de funcionar. ¿Generar uno nuevo?')) return;
    setRotating(true); try { await props.onRegenerateInvitation(); setCopied(true); } finally { setRotating(false); }
  };

  const navigation = (
    <nav className="space-y-1" aria-label="Etapas del expediente">
      {items.map(({ id, label, hint, icon: Icon }, index) => (
        <button key={id} onClick={() => props.setActiveView(id)} aria-current={props.activeView === id ? 'page' : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${props.activeView === id ? 'bg-[#173B57] text-white shadow-sm' : 'text-[#4D5964] hover:bg-[#EEF1F4] hover:text-[#17212B]'}`}>
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${props.activeView === id ? 'bg-white/12' : 'bg-white border border-[#E1DED7]'}`}><Icon className="h-4 w-4" /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className={`block text-[11px] ${props.activeView === id ? 'text-white/65' : 'text-[#7A8490]'}`}>{hint}</span></span>
          {index > 0 && <span className={`ml-auto h-2 w-2 rounded-full ${props.activeView === id ? 'bg-[#F4A261]' : 'bg-[#D9D5CC]'}`} />}
        </button>
      ))}
    </nav>
  );

  return <>
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col border-r border-[#E1DED7] bg-[#FBFAF7] px-4 py-5">
      <div className="flex items-center gap-3 px-2 mb-7"><img src="/assets/idpn.png" alt="IDPN" className="h-11 w-11 object-contain"/><div><div className="font-serif font-bold">DIAGNÓSTICO OPERATIVO</div><div className="text-xs text-[#7A8490]">DOPYME + PSMI</div></div></div>
      <label className="px-2 text-[11px] font-semibold uppercase tracking-[.14em] text-[#7A8490]">Expediente</label>
      <div className="mt-2 mb-6 rounded-xl border border-[#E1DED7] bg-white p-3">
        <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#173B57]"/><input value={localName} onChange={e => rename(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" /></div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#7A8490]"><span>{props.workspaceId.slice(0, 13)}…</span><span>{saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Guardado ✓' : 'Autoguardado'}</span></div>
      </div>
      {navigation}
      <div className="mt-6 rounded-xl bg-[#EEF3F6] p-4"><div className="flex items-end justify-between"><span className="text-xs font-semibold text-[#53616D]">Madurez general</span><span className="font-serif text-2xl font-bold text-[#173B57]">{props.sustainableScore}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#173B57]" style={{width:`${Math.min(props.sustainableScore,100)}%`}} /></div></div>
      <div className="mt-auto space-y-2">
        <button onClick={copy} disabled={!props.inviteToken} className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D9D5CC] bg-white px-3 py-2.5 text-sm font-semibold hover:bg-[#F6F4EF] disabled:opacity-50">{copied ? <Check className="h-4 w-4"/> : <Link2 className="h-4 w-4"/>}{copied ? 'Enlace copiado' : 'Compartir acceso'}</button>
        {props.isWorkspaceOwner && <button onClick={rotate} disabled={rotating} className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#7A8490] hover:bg-[#FFF2ED] hover:text-[#C85B3C]"><RefreshCw className={`h-3.5 w-3.5 ${rotating?'animate-spin':''}`}/>Regenerar enlace</button>}
        <button onClick={props.onExportPdf} disabled={props.isExportingPdf} className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#173B57] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#102D43]">{props.isExportingPdf?<Loader2 className="h-4 w-4 animate-spin"/>:<Download className="h-4 w-4"/>}Exportar expediente</button>
        <a href="/" className="flex items-center justify-center gap-2 py-2 text-xs text-[#7A8490] hover:text-[#17212B]"><LogOut className="h-3.5 w-3.5"/>Salir del expediente</a>
      </div>
    </aside>
    <header className="lg:hidden sticky top-0 z-40 border-b border-[#E1DED7] bg-white/95 backdrop-blur">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
        <img src="/assets/idpn.png" alt="IDPN" className="h-9 w-9 shrink-0 object-contain"/>
        <div className="min-w-0 flex-1">
          <input aria-label="Nombre de la empresa" value={localName} onChange={e => rename(e.target.value)} className="block w-full truncate bg-transparent text-sm font-bold outline-none" />
          <div className="text-[10px] text-[#7A8490]">{saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Guardado ✓' : 'Expediente activo'}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={copy} disabled={!props.inviteToken} aria-label="Compartir acceso" className="grid h-9 w-9 place-items-center rounded-lg border border-[#D9D5CC] disabled:opacity-40">{copied?<Check className="h-4 w-4"/>:<Link2 className="h-4 w-4"/>}</button>
          <button onClick={props.onExportPdf} disabled={props.isExportingPdf} aria-label="Exportar expediente" className="grid h-9 w-9 place-items-center rounded-lg bg-[#173B57] text-white disabled:opacity-50">{props.isExportingPdf?<Loader2 className="h-4 w-4 animate-spin"/>:<Download className="h-4 w-4"/>}</button>
          <a href="/" aria-label="Salir del expediente" className="grid h-9 w-9 place-items-center rounded-lg border border-[#D9D5CC] text-[#53616D]"><LogOut className="h-4 w-4"/></a>
        </div>
      </div>
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 pb-2.5 [scrollbar-width:none]">{items.map(({id,label,icon:Icon})=><button key={id} onClick={()=>props.setActiveView(id)} className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${props.activeView===id?'bg-[#173B57] text-white':'bg-[#F6F4EF] text-[#53616D]'}`}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>
    </header>
  </>;
};
