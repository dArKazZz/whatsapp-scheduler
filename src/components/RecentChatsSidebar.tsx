import React, { useState } from 'react';
import { Search, User, MessageSquare, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { ChatItem } from '../types';

interface RecentChatsSidebarProps {
  chats: ChatItem[];
  selectedPhone?: string;
  onSelectChat: (chat: ChatItem) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const RecentChatsSidebar: React.FC<RecentChatsSidebarProps> = ({
  chats,
  selectedPhone,
  onSelectChat,
  isOpen,
  onToggle
}) => {
  const [query, setQuery] = useState('');

  const filteredChats = chats.filter((c) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      c.phone.includes(q) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const formatPhone = (phone: string) => {
    if (phone.length === 11 && phone.startsWith('51')) {
      return `+51 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`;
    }
    return `+${phone}`;
  };

  const formatTime = (time?: string | Date) => {
    if (!time) return '';
    try {
      const d = new Date(time);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (!isOpen) {
    return (
      <div className="hidden lg:flex flex-col items-center py-4 px-2 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 w-12 shrink-0">
        <button
          onClick={onToggle}
          title="Abrir contactos recientes"
          className="p-2 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] text-zinc-900 dark:text-zinc-100 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-zinc-500" />
          <span className="font-semibold text-sm font-sans tracking-tight">Chats Recientes</span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono">
            {chats.length}
          </span>
        </div>
        <button
          onClick={onToggle}
          title="Colapsar sidebar"
          className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors hidden lg:block"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Buscador */}
      <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o número..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-xs font-sans placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
      </div>

      {/* Lista de contactos */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/40">
        {filteredChats.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 space-y-1 font-sans">
            <User size={20} className="mx-auto text-zinc-300 dark:text-zinc-600" />
            <p>No se encontraron contactos</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = selectedPhone && chat.phone.replace(/\D/g, '') === selectedPhone.replace(/\D/g, '');
            const initial = chat.name ? chat.name.charAt(0).toUpperCase() : '#';

            return (
              <button
                key={chat.phone}
                onClick={() => onSelectChat(chat)}
                className={`w-full text-left p-3 flex items-start gap-3 transition-colors duration-150 ${
                  isSelected
                    ? 'bg-zinc-100 dark:bg-zinc-800/90 font-medium'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {initial}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate font-sans">
                      {chat.name || formatPhone(chat.phone)}
                    </span>
                    {chat.timestamp && (
                      <span className="text-[10px] text-zinc-400 shrink-0 font-mono ml-1">
                        {formatTime(chat.timestamp)}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-mono text-zinc-500 truncate">
                    {formatPhone(chat.phone)}
                  </div>

                  {chat.lastMessage && (
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-sans">
                      {chat.lastMessage}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
