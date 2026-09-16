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
  FileText
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
}

export const MessageQueueTable: React.FC<MessageQueueTableProps> = ({
  messages,
  isLoading,
  onRefresh,
  onDelete,
  onEditMessage,
  onReschedule,
  onSendNow,
  onRetry
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      // Filtro por Tab
      if (activeTab === 'pending' && msg.status !== 'PENDIENTE' && msg.status !== 'PROCESANDO') return false;
      if (activeTab === 'sent' && msg.status !== 'ENVIADO') return false;
      if (activeTab === 'error' && msg.status !== 'ERROR') return false;

      // Filtro por Texto / Teléfono
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

  // Helpers de fecha y hora
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
    <div className="rounded border border-zinc-800 bg-[#121215] text-zinc-100 flex flex-col">
      {/* Toolbar Superior */}
      <div className="p-3 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Input de Búsqueda */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Filtrar por número o texto..."
            className="w-full bg-[#0b0f17] border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Tabs Planas */}
          <div className="flex items-center rounded border border-zinc-800 bg-[#0b0f17] p-0.5 text-xs font-mono">
            <button
              onClick={() => {
                setActiveTab('all');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'all'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => {
                setActiveTab('pending');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'pending'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              En Cola
            </button>
            <button
              onClick={() => {
                setActiveTab('sent');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'sent'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Enviados
            </button>
            <button
              onClick={() => {
                setActiveTab('error');
                setPage(1);
              }}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'error'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Fallidos
            </button>
          </div>

          {/* Botón Actualizar */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Actualizar tabla"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0b0f17] border-b border-zinc-800/80 text-[11px] font-mono uppercase text-zinc-500 tracking-wider select-none">
            <tr>
              <th className="py-2.5 px-3">Destinatario</th>
              <th className="py-2.5 px-3">Mensaje</th>
              <th className="py-2.5 px-3">Programación</th>
              <th className="py-2.5 px-3">Estado</th>
              <th className="py-2.5 px-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-mono">
            {paginatedMessages.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-zinc-600 font-mono text-xs">
                  {searchQuery ? 'No se encontraron mensajes con el criterio buscado.' : 'No hay mensajes en la cola.'}
                </td>
              </tr>
            ) : (
              paginatedMessages.map((msg) => {
                const isExpanded = expandedMessageId === msg._id;
                const isPending = msg.status === 'PENDIENTE' || msg.status === 'PROCESANDO';
                const isError = msg.status === 'ERROR';

                return (
                  <tr key={msg._id} className="hover:bg-zinc-900/30 transition-colors">
                    {/* Destinatario */}
                    <td className="py-2.5 px-3 text-zinc-200 font-medium whitespace-nowrap">
                      +{msg.phone}
                    </td>

                    {/* Mensaje con Truncado inteligente y click para expandir */}
                    <td className="py-2.5 px-3 max-w-xs md:max-w-md">
                      <div
                        onClick={() => setExpandedMessageId(isExpanded ? null : msg._id)}
                        className={`font-sans cursor-pointer text-zinc-300 text-xs leading-relaxed ${
                          isExpanded ? 'break-words' : 'truncate'
                        }`}
                        title="Haz clic para ver texto completo"
                      >
                        {msg.message}
                      </div>
                      {msg.attachment && (
                        <div className="inline-flex items-center gap-1 mt-1 text-[10px] text-zinc-500 font-mono">
                          <FileText size={10} />
                          <span>{msg.attachment.name}</span>
                        </div>
                      )}
                    </td>

                    {/* Programación */}
                    <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap text-[11px]">
                      {formatDateTime(msg.scheduledAt)}
                    </td>

                    {/* Estado */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {msg.status === 'ENVIADO' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/30 border border-emerald-900/40 text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Enviado
                        </span>
                      )}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-amber-950/30 border border-amber-900/40 text-amber-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          En cola
                        </span>
                      )}
                      {isError && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-red-950/30 border border-red-900/40 text-red-400 cursor-help"
                          title={msg.error || 'Fallo desconocido'}
                        >
                          <AlertCircle size={11} />
                          Error
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-2.5 px-3 text-right relative whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1">
                        {/* Botón rápido Enviar Ahora si está pendiente */}
                        {isPending && (
                          <button
                            onClick={() => handleExecuteAction(() => onSendNow(msg._id))}
                            className="px-2 py-1 rounded border border-zinc-800 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                            title="Enviar inmediatamente"
                          >
                            Disparar
                          </button>
                        )}

                        {/* Botón rápido Reintentar si dio error */}
                        {isError && (
                          <button
                            onClick={() => handleExecuteAction(() => onRetry(msg._id))}
                            className="px-2 py-1 rounded border border-zinc-800 text-[11px] text-amber-400 hover:bg-amber-950/30 transition-colors"
                            title="Reintentar envío"
                          >
                            Reintentar
                          </button>
                        )}

                        {/* Menú de 3 puntos */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === msg._id ? null : msg._id)}
                            className="w-7 h-7 rounded flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                          >
                            <MoreHorizontal size={14} />
                          </button>

                          {activeMenuId === msg._id && (
                            <div className="absolute right-0 mt-1 w-44 rounded border border-zinc-800 bg-[#121215] py-1 shadow-2xl z-40 text-xs text-left">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleOpenEdit(msg)}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Edit2 size={12} />
                                    <span>Editar texto</span>
                                  </button>
                                  <button
                                    onClick={() => handleOpenReschedule(msg)}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 text-zinc-300 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Calendar size={12} />
                                    <span>Reprogramar</span>
                                  </button>
                                </>
                              )}

                              <div className="h-[1px] bg-zinc-800 my-1" />

                              <button
                                onClick={() => handleExecuteAction(() => onDelete(msg._id))}
                                className="w-full px-3 py-1.5 flex items-center gap-2 text-red-400 hover:bg-red-950/30 transition-colors"
                              >
                                <Trash2 size={12} />
                                <span>Cancelar / Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación Inferior */}
      <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono text-zinc-400 select-none">
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-[#0b0f17] border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>por página</span>
        </div>

        <div className="flex items-center gap-3">
          <span>
            {filteredMessages.length === 0
              ? '0 de 0'
              : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filteredMessages.length)} de ${filteredMessages.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded border border-zinc-800 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Editar Mensaje */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded border border-zinc-800 bg-[#121215] p-4 text-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
              <span className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                Editar Mensaje
              </span>
              <button onClick={() => setEditingItem(null)} className="text-zinc-500 hover:text-zinc-200">
                <X size={15} />
              </button>
            </div>
            <textarea
              rows={5}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-[#0b0f17] border border-zinc-800 rounded p-2.5 text-xs text-zinc-100 outline-none focus:border-zinc-600 resize-y"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs rounded bg-white text-black font-semibold hover:bg-zinc-200"
              >
                {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reprogramar */}
      {reschedulingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded border border-zinc-800 bg-[#121215] p-4 text-zinc-100 shadow-2xl">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
              <span className="text-xs font-mono font-semibold text-zinc-200 uppercase tracking-wider">
                Reprogramar Envío
              </span>
              <button onClick={() => setReschedulingItem(null)} className="text-zinc-500 hover:text-zinc-200">
                <X size={15} />
              </button>
            </div>
            <input
              type="datetime-local"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              className="w-full bg-[#0b0f17] border border-zinc-800 rounded p-2.5 text-xs font-mono text-zinc-200 outline-none [color-scheme:dark]"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setReschedulingItem(null)}
                className="px-3 py-1.5 text-xs rounded border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveReschedule}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs rounded bg-white text-black font-semibold hover:bg-zinc-200"
              >
                {actionLoading ? 'Guardando...' : 'Actualizar Fecha'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
