import React, { useState, useEffect } from 'react';
import { RefreshCw, QrCode, Smartphone, Power, CheckCircle2, ShieldCheck } from 'lucide-react';
import { WhatsAppStatus } from '../types';

interface WhatsAppStatusCardProps {
  status: WhatsAppStatus;
  onRefreshQr?: () => void;
  onDisconnect?: () => void;
}

export const WhatsAppStatusCard: React.FC<WhatsAppStatusCardProps> = ({
  status,
  onRefreshQr,
  onDisconnect
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(45);

  // Timer para refresh visual del QR si está desconectado
  useEffect(() => {
    if (status.connected || !status.qr) return;
    setSecondsRemaining(45);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          onRefreshQr?.();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status.connected, status.qr, onRefreshQr]);

  const formatPhoneNumber = (rawId?: string) => {
    if (!rawId) return 'No disponible';
    const number = rawId.split(':')[0].replace(/\D/g, '');
    if (number.length === 11 && number.startsWith('51')) {
      return `+51 ${number.substring(2, 5)} ${number.substring(5, 8)} ${number.substring(8)}`;
    }
    return `+${number}`;
  };

  return (
    <div className="rounded border border-zinc-800 bg-[#121215] p-4 text-zinc-100 flex flex-col justify-between select-none">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
            Vinculación WhatsApp
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
            status.connected
              ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              status.connected ? 'bg-emerald-400' : 'bg-zinc-500'
            }`}
          />
          {status.connected ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {status.connected ? (
        /* ESTADO: CONECTADO */
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-sm text-zinc-200 shrink-0">
              {status.user?.name ? status.user.name.charAt(0).toUpperCase() : 'WA'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-zinc-100 truncate">
                {status.user?.name || 'Cuenta Vinculada'}
              </div>
              <div className="text-xs font-mono text-zinc-400">
                {formatPhoneNumber(status.user?.id)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px] font-mono text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-zinc-500" />
              <span>Multi-dispositivo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500" />
              <span>Socket listo</span>
            </div>
          </div>

          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition-colors duration-150"
            >
              <Power size={13} />
              <span>Desconectar socket</span>
            </button>
          )}
        </div>
      ) : status.qr ? (
        /* ESTADO: DESCONECTADO (QR DIRECTO) */
        <div className="flex flex-col items-center justify-center py-2 gap-3">
          <div className="p-2 rounded bg-white border border-zinc-300 shadow-sm inline-block">
            <img
              src={status.qr}
              alt="Código QR de WhatsApp"
              className="w-44 h-44 block object-contain"
            />
          </div>

          <div className="flex items-center justify-between w-full px-1 text-xs text-zinc-400 font-mono">
            <span>Expira en {secondsRemaining}s</span>
            <button
              onClick={onRefreshQr}
              className="inline-flex items-center gap-1 text-zinc-300 hover:text-white transition-colors"
            >
              <RefreshCw size={12} />
              <span>Recargar</span>
            </button>
          </div>
        </div>
      ) : (
        /* ESTADO: CARGANDO O INICIALIZANDO */
        <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500 gap-2">
          <RefreshCw size={18} className="animate-spin text-zinc-400" />
          <span className="text-xs font-mono">Generando credenciales de enlace...</span>
        </div>
      )}
    </div>
  );
};
