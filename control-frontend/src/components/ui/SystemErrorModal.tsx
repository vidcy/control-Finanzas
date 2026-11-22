import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  X,
  FileText,
  RefreshCw,
  Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SystemErrorInfo } from '../../utils/systemErrorHandler';

interface SystemErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: SystemErrorInfo | null;
  onRetry?: () => void;
}

export default function SystemErrorModal({
  isOpen,
  onClose,
  error,
  onRetry,
}: SystemErrorModalProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen || !error) return null;

  const handleAction = () => {
    if (error.actionUrl) {
      onClose();
      navigate(error.actionUrl);
    }
  };

  const getCategoryBadge = () => {
    switch (error.category) {
      case 'SUNAT':
        return {
          bg: 'bg-rose-50 border-rose-200 text-rose-700',
          dot: 'bg-rose-500',
          label: 'Diagnóstico Oficial SUNAT',
        };
      case 'VALIDATION':
        return {
          bg: 'bg-amber-50 border-amber-200 text-amber-700',
          dot: 'bg-amber-500',
          label: 'Validación de Parámetros',
        };
      case 'NETWORK':
        return {
          bg: 'bg-blue-50 border-blue-200 text-blue-700',
          dot: 'bg-blue-500',
          label: 'Conectividad del Facturador',
        };
      case 'BUSINESS':
        return {
          bg: 'bg-purple-50 border-purple-200 text-purple-700',
          dot: 'bg-purple-500',
          label: 'Control Operativo de Negocio',
        };
      default:
        return {
          bg: 'bg-slate-50 border-slate-200 text-slate-700',
          dot: 'bg-slate-500',
          label: 'Aviso del Sistema',
        };
    }
  };

  const badge = getCategoryBadge();

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* MODAL CARD */}
      <div
        className="relative bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* HEADER */}
        <div className="flex-shrink-0 flex items-start justify-between p-6 pb-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-sm flex-shrink-0">
              {error.category === 'SUNAT' ? (
                <ShieldAlert className="w-6 h-6" />
              ) : error.category === 'VALIDATION' ? (
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              ) : (
                <HelpCircle className="w-6 h-6 text-indigo-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${badge.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
                {error.code && (
                  <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {error.code}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {error.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* EXPLANATION */}
          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-sm leading-relaxed text-slate-700">
            <p className="font-semibold text-slate-900 mb-1">¿Qué sucedió?</p>
            <p>{error.message}</p>

            {error.cause && (
              <div className="mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Causa principal: </span>
                {error.cause}
              </div>
            )}
          </div>

          {/* ACTION PLAN */}
          {error.actionPlan && error.actionPlan.length > 0 && (
            <div className="border border-indigo-100 bg-indigo-50/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Pasos sugeridos para solucionar
                </h4>
              </div>

              <div className="space-y-2">
                {error.actionPlan.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium leading-relaxed">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TECHNICAL DETAILS (ACCORDION) */}
          {error.technicalDetails && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTechnical(!showTechnical)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 text-left text-xs font-bold text-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Detalles técnicos de diagnóstico</span>
                </div>
                {showTechnical ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showTechnical && (
                <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] max-h-40 overflow-y-auto whitespace-pre-wrap break-all select-all">
                  {error.technicalDetails}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          {error.actionUrl && (
            <button
              type="button"
              onClick={handleAction}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100 active:scale-95"
            >
              <span>{error.actionText || 'Ir a Configuración'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}

          {onRetry && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar Operación</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-all active:scale-95"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
