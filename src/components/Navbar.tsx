import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Wifi,
  Sliders,
  ChevronDown,
  AlertTriangle,
  X
} from 'lucide-react';
import { WhatsAppStatus, StatsSummary } from '../types';

interface NavbarProps {
  status: WhatsAppStatus;
  stats: StatsSummary;
  onLogout: () => Promise<void>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  stats,
  onLogout,
  theme,
  onToggleTheme
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
      setLogoutModalOpen(false);
      setMenuOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getStatusColor = () => {
    if (status.connected) return 'bg-emerald-500';
    if (status.qr) return 'bg-amber-500';
    return 'bg-zinc-600';
  };

  const getStatusLabel = () => {
    if (status.connected) return 'En línea';
    if (status.qr) return 'Esperando QR';
    return 'Desconectado';
  };

  return (
    <>
      <header className="h-12 border-b border-zinc-800 bg-[#09090b] text-zinc-100 flex items-center justify-between px-4 sticky top-0 z-40 select-none">
        {/* Extremo Izquierdo: Brand & Status Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tracking-tight font-semibold text-zinc-100">
              WA / Scheduler
            </span>
          </div>

          <div className="h-4 w-[1px] bg-zinc-800" />

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()}`} />
            <span className="font-medium text-zinc-300">{getStatusLabel()}</span>
          </div>
        </div>

        {/* Extremo Derecho: Stats, Theme & User Menu */}
        <div className="flex items-center gap-4">
          {/* Contador plano de actividad */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <span className="text-zinc-200">{stats.pendingCount}</span>
            <span>pendientes</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-200">{stats.sentTodayCount}</span>
            <span>enviados hoy</span>
          </div>

          <div className="hidden sm:block h-4 w-[1px] bg-zinc-800" />

          {/* Toggle de tema */}
          <button
            onClick={onToggleTheme}
            className="w-8 h-8 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 flex items-center justify-center transition-colors duration-150"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            aria-label="Cambiar tema"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* User / Session Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs font-medium transition-colors duration-150"
            >
              <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-mono text-zinc-300">
                {status.user?.name ? status.user.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <span className="hidden md:inline max-w-[120px] truncate text-zinc-300">
                {status.user?.name || (status.connected ? 'Conectado' : 'Sesión')}
              </span>
              <ChevronDown size={14} className="text-zinc-500" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 rounded border border-zinc-800 bg-[#121215] py-1 shadow-2xl z-50 text-xs">
                {/* Info de sesión */}
                <div className="px-3 py-2 border-b border-zinc-800/80">
                  <div className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Identificador</div>
                  <div className="text-zinc-200 font-mono truncate mt-0.5">
                    {status.user?.id ? `+${status.user.id.split(':')[0]}` : 'Sin vincular'}
                  </div>
                </div>

                <div className="px-3 py-2 flex items-center justify-between text-zinc-400 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Wifi size={13} className="text-zinc-500" />
                    <span>Latencia / Ping</span>
                  </div>
                  <span className="font-mono text-zinc-300 text-[11px]">
                    {status.lastPing ? `${status.lastPing}ms` : 'Activo'}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setLogoutModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-red-400 hover:bg-red-950/30 transition-colors duration-150"
                >
                  <LogOut size={13} />
                  <span>Desvincular sesión</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Sobrio de Confirmación de Desvinculación */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded border border-zinc-800 bg-[#121215] text-zinc-200 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <AlertTriangle size={16} className="text-amber-500" />
                <span>Desvincular sesión</span>
              </div>
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 text-xs text-zinc-400 leading-relaxed">
              {stats.pendingCount > 0 ? (
                <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 text-amber-300 mb-2">
                  Atención: Tienes <strong>{stats.pendingCount} mensaje(s) pendiente(s)</strong> en cola. Si desvinculas, no se enviarán hasta que vuelvas a vincular el dispositivo.
                </div>
              ) : null}
              Esta acción cerrará la sesión del socket y eliminará las credenciales activas. Deberás escanear un nuevo código QR para volver a programar envíos.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="px-3 py-1.5 text-xs rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-3 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
              >
                {isLoggingOut ? 'Desvinculando...' : 'Confirmar desvinculación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
