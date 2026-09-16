import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  LogOut,
  Wifi,
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
      <header className="h-16 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex items-center justify-between px-3 sm:px-6 lg:px-8 sticky top-0 z-40 select-none transition-colors shadow-xs">
        {/* Brand & Status */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <span className="font-mono text-base sm:text-lg tracking-tight font-bold text-zinc-900 dark:text-white shrink-0">
            WA / Scheduler
          </span>

          <div className="h-4 sm:h-5 w-[1px] bg-zinc-200 dark:bg-zinc-800 shrink-0" />

          {status.connected ? (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-sans min-w-0">
              <span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500 shadow-xs shrink-0" />
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                Conectado
              </span>
              {formatConnectedPhone() && (
                <span className="hidden xl:inline-block font-mono text-xs px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold truncate max-w-[160px]">
                  {formatConnectedPhone()}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-sans min-w-0">
              <span className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full ${status.qr ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'} shrink-0`} />
              <span className="font-semibold text-zinc-500 dark:text-zinc-400 shrink-0">
                {status.qr ? 'Esperando QR' : 'Desconectado'}
              </span>
            </div>
          )}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {status.connected && (
            <div className="hidden lg:flex items-center gap-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-mono">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats.pendingCount}</span>
              <span>pendientes</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats.sentTodayCount}</span>
              <span>enviados</span>
            </div>
          )}

          {/* Toggle Theme */}
          <button
            onClick={onToggleTheme}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center transition-colors shrink-0"
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* Session Dropdown */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs sm:text-sm font-semibold transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-300 shrink-0">
                {status.user?.name ? status.user.name.charAt(0).toUpperCase() : 'W'}
              </div>
              <span className="hidden md:inline max-w-[130px] truncate">
                {status.user?.name || (status.connected ? 'Mi Cuenta' : 'Sesión')}
              </span>
              <ChevronDown size={14} className="text-zinc-400 shrink-0" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] py-2 shadow-xl z-50 text-sm font-sans">
                <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Número vinculado</div>
                  <div className="text-zinc-900 dark:text-zinc-100 font-mono font-semibold truncate mt-0.5">
                    {formatConnectedPhone() || 'Sin dispositivo activo'}
                  </div>
                </div>

                <div className="px-4 py-2 flex items-center justify-between text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 lg:hidden text-xs">
                  <span>Mensajes</span>
                  <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                    {stats.pendingCount} en cola · {stats.sentTodayCount} enviados
                  </span>
                </div>

                <div className="px-4 py-2 flex items-center justify-between text-zinc-600 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Wifi size={14} className="text-zinc-400" />
                    <span>Ping Servidor</span>
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
                    className="w-full px-4 py-2.5 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-semibold transition-colors"
                  >
                    <LogOut size={15} />
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
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-base font-bold text-zinc-900 dark:text-zinc-100">
                <AlertTriangle size={18} className="text-amber-500" />
                <span>Desvincular WhatsApp</span>
              </div>
              <button
                onClick={() => setLogoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              {stats.pendingCount > 0 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 mb-3 font-medium">
                  Atención: Tienes <strong>{stats.pendingCount} mensaje(s) programado(s)</strong>.
                </div>
              )}
              Se cerrará la conexión activa y se borrarán las credenciales locales de la sesión.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors"
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
