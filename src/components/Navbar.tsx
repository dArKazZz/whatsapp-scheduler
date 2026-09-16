import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Wifi,
  ChevronDown,
  AlertTriangle,
  X,
  Smartphone
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

  const formatConnectedPhone = () => {
    const phone = status.user?.phone || (status.user?.id ? status.user.id.split(':')[0].replace(/\D/g, '') : null);
    if (!phone) return null;
    if (phone.length === 11 && phone.startsWith('51')) {
      return `+51 ${phone.substring(2, 5)} ${phone.substring(5, 8)} ${phone.substring(8)}`;
    }
    return `+${phone}`;
  };

  return (
    <>
      <header className="h-13 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-40 select-none transition-colors">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-base tracking-tight font-bold text-zinc-900 dark:text-white">
            WA / Scheduler
          </span>

          <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

          {status.connected ? (
            <div className="flex items-center gap-2 text-xs font-sans">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                Conectado
              </span>
              {formatConnectedPhone() && (
                <span className="hidden sm:inline-block font-mono text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {formatConnectedPhone()} {status.user?.name ? `· ${status.user.name}` : ''}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-sans">
              <span className={`w-2 h-2 rounded-full ${status.qr ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`} />
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {status.qr ? 'Esperando escaneo QR' : 'Desconectado'}
              </span>
            </div>
          )}
        </div>

        {/* Right: Stats, Theme, User Session */}
        <div className="flex items-center gap-3 sm:gap-4">
          {status.connected && (
            <div className="hidden md:flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{stats.pendingCount}</span>
              <span>pendientes</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-200">{stats.sentTodayCount}</span>
              <span>enviados</span>
            </div>
          )}

          {/* Toggle Theme */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Session Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-sans font-medium transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-700 dark:text-zinc-300">
                {status.user?.name ? status.user.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <span className="hidden sm:inline max-w-[130px] truncate">
                {status.user?.name || (status.connected ? 'Mi Cuenta' : 'Sesión')}
              </span>
              <ChevronDown size={14} className="text-zinc-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] py-1 shadow-lg z-50 text-xs font-sans">
                <div className="px-3.5 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Número vinculado</div>
                  <div className="text-zinc-900 dark:text-zinc-100 font-mono font-medium truncate mt-0.5">
                    {formatConnectedPhone() || 'Sin dispositivo activo'}
                  </div>
                </div>

                <div className="px-3.5 py-2 flex items-center justify-between text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Wifi size={13} className="text-zinc-400" />
                    <span>Ping Keep-Alive</span>
                  </div>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">
                    {status.lastPing ? `${status.lastPing}ms` : 'Activo'}
                  </span>
                </div>

                {status.connected && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setLogoutModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors font-medium"
                  >
                    <LogOut size={14} />
                    <span>Desvincular WhatsApp</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Desvinculación */}
      {logoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-800 dark:text-zinc-200 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <AlertTriangle size={16} className="text-amber-500" />
                <span>Desvincular sesión de WhatsApp</span>
              </div>
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              {stats.pendingCount > 0 && (
                <div className="p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 mb-3">
                  Atención: Tienes <strong>{stats.pendingCount} mensaje(s) programado(s)</strong>. Si desvinculas ahora, no saldrán hasta volver a vincular.
                </div>
              )}
              Se cerrará la conexión activa y se borrarán las credenciales locales de la sesión.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="px-3.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-3.5 py-1.5 text-xs rounded-md bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
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
