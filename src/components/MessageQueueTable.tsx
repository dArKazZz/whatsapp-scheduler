import React, { useState, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  MoreHorizontal,
  Edit2,
  Calendar,
  Send,
  RotateCcw,
  Trash2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  CheckSquare
} from 'lucide-react';
import { MessageItem, FilterTab } from '../types';

interface MessageQueueTableProps {
  messages: MessageItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onDelete: (id: string) => Promise<void>;
  onEditMessage: (id: string, newMessage: string) => Promise<void>;
  onReschedule: (id: string, newDateTime: string) => Promise<void>;
  onSendNow: (id: string) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkSendNow?: (ids: string[]) => Promise<void>;
}

export const MessageQueueTable: React.FC<MessageQueueTableProps> = ({
  messages,
  isLoading,
  onRefresh,
  onDelete,
  onEditMessage,
  onReschedule,
  onSendNow,
  onRetry,
  onBulkDelete,
  onBulkSendNow
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selección Múltiple (Bulk Actions)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Estados de Modales y Acciones
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MessageItem | null>(null);
  const [editText, setEditText] = useState('');
  const [reschedulingItem, setReschedulingItem] = useState<MessageItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);

  // Filtrado de Mensajes
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (activeTab === 'pending' && msg.status !== 'PENDIENTE' && msg.status !== 'PROCESANDO') return false;
      if (activeTab === 'sent' && msg.status !== 'ENVIADO') return false;
      if (activeTab === 'error' && msg.status !== 'ERROR') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchPhone = msg.phone.toLowerCase().includes(query);
        const matchMsg = msg.message.toLowerCase().includes(query);
        return matchPhone || matchMsg;
      }
      return true;
    });
  }, [messages, activeTab, searchQuery]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredMessages.length / pageSize));
  const paginatedMessages = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredMessages.slice(start, start + pageSize);
  }, [filteredMessages, page, pageSize]);

  // Selección en bloque
  const allVisibleSelected = paginatedMessages.length > 0 && paginatedMessages.every((m) => selectedIds.includes(m._id));

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(paginatedMessages.map((m) => m._id));
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const newIds = new Set([...selectedIds, ...paginatedMessages.map((m) => m._id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.length === 0) return;
    if (!window.confirm(`¿Estás seguro de eliminar los ${selectedIds.length} mensajes seleccionados?`)) return;

    setActionLoading(true);
    try {
      await onBulkDelete(selectedIds);
      setSelectedIds([]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkSendNow = async () => {
    if (!onBulkSendNow || selectedIds.length === 0) return;
    if (!window.confirm(`¿Disparar envío inmediato para los ${selectedIds.length} mensajes seleccionados?`)) return;

    setActionLoading(true);
    try {
      await onBulkSendNow(selectedIds);
      setSelectedIds([]);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatPhoneNumber = (raw: string) => {
    const n = raw.replace(/\D/g, '');
    if (n.length === 11 && n.startsWith('51')) {
      return `+51 ${n.substring(2, 5)} ${n.substring(5, 8)} ${n.substring(8)}`;
    }
    return `+${n}`;
  };

  const handleOpenEdit = (msg: MessageItem) => {
    setEditingItem(msg);
    setEditText(msg.message);
    setActiveMenuId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editText.trim()) return;
    setActionLoading(true);
    try {
      await onEditMessage(editingItem._id, editText.trim());
      setEditingItem(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReschedule = (msg: MessageItem) => {
    setReschedulingItem(msg);
    const d = new Date(msg.scheduledAt);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    setRescheduleDate(`${year}-${month}-${day}T${hours}:${mins}`);
    setActiveMenuId(null);
  };

  const handleSaveReschedule = async () => {
    if (!reschedulingItem || !rescheduleDate) return;
    setActionLoading(true);
    try {
      const utcDate = new Date(rescheduleDate).toISOString();
      await onReschedule(reschedulingItem._id, utcDate);
      setReschedulingItem(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteAction = async (action: () => Promise<void>) => {
    setActionLoading(true);
    setActiveMenuId(null);
    try {
      await action();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 flex flex-col shadow-sm">
      {/* Barra de Acciones Masivas (Bulk Actions Bar) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-b border-zinc-800 dark:border-zinc-200 font-sans text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckSquare size={16} />
            <span className="font-semibold">{selectedIds.length} elemento(s) seleccionado(s)</span>
          </div>

          <div className="flex items-center gap-2">
            {onBulkSendNow && (
              <button
                type="button"
                onClick={handleBulkSendNow}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800 dark:bg-zinc-200 hover:bg-zinc-700 dark:hover:bg-zinc-300 font-medium transition-colors cursor-pointer"
              >
                <Zap size={14} />
                <span>Disparar ahora</span>
              </button>
            )}
            {onBulkDelete && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>Eliminar seleccionados</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-zinc-900 transition-colors"
              title="Deseleccionar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Toolbar Superior */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        {/* Input de Búsqueda */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por número o mensaje..."
            className="w-full bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:border-zinc-900 dark:focus:border-zinc-400 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Tabs Planas */}
          <div className="flex items-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/80 p-1 text-xs font-sans">
            {(['all', 'pending', 'sent', 'error'] as FilterTab[]).map((tabKey) => {
              const labelMap: Record<FilterTab, string> = {
                all: 'Todos',
                pending: 'En Cola',
                sent: 'Enviados',
                error: 'Fallidos'
              };
              return (
                <button
                  key={tabKey}
                  onClick={() => {
                    setActiveTab(tabKey);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    activeTab === tabKey
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  {labelMap[tabKey]}
                </button>
              );
            })}
          </div>

          {/* Botón Actualizar */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="Actualizar tabla"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-sm font-sans">
          <thead className="bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase text-zinc-500 tracking-wider select-none">
            <tr>
              <th className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                  title="Seleccionar todos"
                />
              </th>
              <th className="py-3 px-4">Destinatario</th>
              <th className="py-3 px-4">Mensaje</th>
              <th className="py-3 px-4">Programación</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {paginatedMessages.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-14 text-center text-zinc-400 font-sans text-sm">
                  {searchQuery ? 'No se encontraron mensajes con el criterio buscado.' : 'No hay mensajes registrados.'}
                </td>
              </tr>
            ) : (
              paginatedMessages.map((msg) => {
                const isExpanded = expandedMessageId === msg._id;
                const isSelected = selectedIds.includes(msg._id);

                return (
                  <tr
                    key={msg._id}
                    className={`transition-colors duration-150 ${
                      isSelected
                        ? 'bg-zinc-100/70 dark:bg-zinc-800/50'
                        : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    {/* Checkbox de Fila */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(msg._id)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 cursor-pointer"
                      />
                    </td>

                    {/* Teléfono */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-zinc-800 dark:text-zinc-200">
                      {formatPhoneNumber(msg.phone)}
                    </td>

                    {/* Mensaje */}
                    <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                      <div
                        onClick={() => setExpandedMessageId(isExpanded ? null : msg._id)}
                        className="cursor-pointer group flex flex-col gap-1"
                      >
                        <p
                          className={`text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed ${
                            isExpanded ? 'whitespace-pre-wrap' : 'truncate'
                          }`}
                        >
                          {msg.message}
                        </p>
                        {msg.error && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                            <AlertCircle size={12} />
                            <span className="truncate">{msg.error}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Fecha Programada */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-mono text-zinc-600 dark:text-zinc-400">
                      <div>{formatDateTime(msg.scheduledAt)}</div>
                      {msg.sentAt && (
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          Enviado: {formatDateTime(msg.sentAt)}
                        </div>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {msg.status === 'ENVIADO' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
                          Enviado
                        </span>
                      )}
                      {msg.status === 'PENDIENTE' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50">
                          En Cola
                        </span>
                      )}
                      {msg.status === 'PROCESANDO' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50">
                          Procesando
                        </span>
                      )}
                      {msg.status === 'ERROR' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50">
                          Error
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1 relative">
                        {/* Acciones Rápidas */}
                        {msg.status === 'PENDIENTE' && (
                          <button
                            onClick={() => handleExecuteAction(() => onSendNow(msg._id))}
                            disabled={actionLoading}
                            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            title="Disparar envío inmediato"
                          >
                            <Zap size={15} />
                          </button>
                        )}
                        {msg.status === 'ERROR' && (
                          <button
                            onClick={() => handleExecuteAction(() => onRetry(msg._id))}
                            disabled={actionLoading}
                            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            title="Reintentar envío"
                          >
                            <RotateCcw size={15} />
                          </button>
                        )}

                        {/* Menú Tres Puntos */}
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === msg._id ? null : msg._id)}
                          className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                          title="Más opciones"
                        >
                          <MoreHorizontal size={15} />
                        </button>

                        {/* Dropdown flotante */}
                        {activeMenuId === msg._id && (
                          <div className="absolute right-0 top-8 w-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] py-1 shadow-xl z-30 text-xs font-sans text-left">
                            <button
                              onClick={() => handleOpenEdit(msg)}
                              className="w-full px-3 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Edit2 size={13} />
                              <span>Editar texto</span>
                            </button>

                            <button
                              onClick={() => handleOpenReschedule(msg)}
                              className="w-full px-3 py-2 flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <Calendar size={13} />
                              <span>Reprogramar</span>
                            </button>

                            <div className="h-[1px] bg-zinc-100 dark:bg-zinc-800 my-1" />

                            <button
                              onClick={() => handleExecuteAction(() => onDelete(msg._id))}
                              className="w-full px-3 py-2 flex items-center gap-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              <Trash2 size={13} />
                              <span>Eliminar mensaje</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs font-sans text-zinc-500 select-none">
        <div className="flex items-center gap-2">
          <span>Filas por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 outline-none font-mono text-zinc-700 dark:text-zinc-300 cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="font-mono ml-2">
            Total: {filteredMessages.length} mensajes
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Editar Texto */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Edit2 size={16} />
                <span>Editar Contenido del Mensaje</span>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={4}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm font-sans focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 resize-none shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={actionLoading || !editText.trim()}
                className="px-3.5 py-1.5 text-xs rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold transition-colors"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reprogramar Fecha */}
      {reschedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar size={16} />
                <span>Reprogramar Fecha y Hora</span>
              </div>
              <button
                onClick={() => setReschedulingItem(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1.5">
                Nueva Fecha y Hora (Hora Local)
              </label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm font-mono focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 shadow-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setReschedulingItem(null)}
                className="px-3.5 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                disabled={actionLoading || !rescheduleDate}
                className="px-3.5 py-1.5 text-xs rounded-md bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold transition-colors"
              >
                {actionLoading ? 'Actualizando...' : 'Confirmar Reprogramación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
