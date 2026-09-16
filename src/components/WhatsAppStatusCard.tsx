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

  // Si ya está conectado, esta tarjeta NO debe salir en la interfaz (según requerimiento de diseño)
  if (status.connected) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-6 shadow-sm text-zinc-800 dark:text-zinc-100 select-none">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Smartphone size={18} className="text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100 font-sans">
            Vincular WhatsApp
          </span>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Desconectado
        </span>
      </div>

      {status.qr ? (
        <div className="flex flex-col items-center justify-center gap-5">
          <div className="p-3 rounded-lg bg-white border border-zinc-200 shadow-sm inline-block">
            <img
              src={status.qr}
              alt="Código QR de WhatsApp"
              className="w-56 h-56 block object-contain"
            />
          </div>

          <div className="text-center space-y-1 text-sm text-zinc-600 dark:text-zinc-400 font-sans">
            <p className="font-medium text-zinc-900 dark:text-zinc-200">
              1. Abre WhatsApp en tu teléfono
            </p>
            <p>2. Toca <strong>Menú</strong> o <strong>Configuración</strong> y selecciona <strong>Dispositivos vinculados</strong></p>
            <p>3. Toca <strong>Vincular un dispositivo</strong> y apunta con la cámara al código QR</p>
          </div>

          <div className="flex items-center justify-between w-full pt-3 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 font-mono">
            <span>Expira en {secondsRemaining}s</span>
            <button
              onClick={onRefreshQr}
              className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-sans font-medium transition-colors"
            >
              <RefreshCw size={13} />
              <span>Recargar código QR</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 gap-3">
          <RefreshCw size={24} className="animate-spin text-zinc-400" />
          <span className="text-sm font-sans font-medium">Generando código QR de WhatsApp...</span>
        </div>
      )}
    </div>
  );
};
