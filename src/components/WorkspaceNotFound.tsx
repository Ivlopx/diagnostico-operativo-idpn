import React from 'react';
import { AlertTriangle, ArrowLeft, Building2 } from 'lucide-react';

interface WorkspaceNotFoundProps {
  onBackToHome: () => void;
}

export const WorkspaceNotFound: React.FC<WorkspaceNotFoundProps> = ({ onBackToHome }) => {
  return (
    <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border border-[#D9D5CC] p-8 rounded-xl shadow-sm text-center space-y-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#C85B3C]" />

        <div className="w-14 h-14 rounded-full bg-[#FFF2ED] border border-[#C85B3C]/30 flex items-center justify-center mx-auto text-[#C85B3C]">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#C85B3C] block mb-1">
            Acceso no autorizado
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#17212B]">
            El enlace no es válido o fue revocado
          </h1>
          <p className="text-xs text-[#17212B]/70 mt-2 leading-relaxed">
            Comprueba que abriste el enlace privado completo. El propietario también puede haber regenerado la invitación por seguridad.
          </p>
        </div>

        <div className="pt-2 border-t border-[#D9D5CC]">
          <button
            onClick={onBackToHome}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#173B57] hover:bg-[#102D43] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a "/" y crear una empresa nueva</span>
          </button>
        </div>
      </div>
    </div>
  );
};
