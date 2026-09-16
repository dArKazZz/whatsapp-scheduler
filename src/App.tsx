import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WhatsAppStatusCard } from './components/WhatsAppStatusCard';
import { RecentChatsSidebar } from './components/RecentChatsSidebar';
import { MessageSchedulerForm } from './components/MessageSchedulerForm';
import { MessageQueueTable } from './components/MessageQueueTable';
import { WhatsAppStatus, StatsSummary, MessageItem, ChatItem } from './types';

export const App: React.FC = () => {
  // Modo claro por defecto
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    qr: null,
    user: null,
    lastPing: undefined
  });
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<{ phone: string; name?: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Status de WhatsApp
  const fetchStatus = useCallback(async () => {
    try {
      const startTime = performance.now();
      const res = await fetch('/api/status');
      const pingTime = Math.round(performance.now() - startTime);
      const data = await res.json();

      let user = data.user || null;
      if (!user) {
        try {
          const debugRes = await fetch('/api/debug');
          const debugData = await debugRes.json();
          user = debugData.user || null;
        } catch (e) {}
      }

      setStatus({
        connected: !!data.connected,
        qr: data.qr || null,
        user,
        lastPing: String(pingTime)
      });
    } catch (e) {
      setStatus((prev) => ({ ...prev, connected: false }));
    }
  }, []);

  // 2. Fetch Historial de Mensajes
  const fetchMessages = useCallback(async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch('/api/messages');
      const json = await res.json();
      setMessages(json.data || []);
    } catch (e) {
      showToast('Error al obtener lista de mensajes', 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // 3. Fetch Chats y Contactos Recientes
  const fetchChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats');
      const json = await res.json();
      setChats(json.data || []);
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    fetchChats();
    const statusInterval = setInterval(fetchStatus, 4000);
    const messagesInterval = setInterval(fetchMessages, 8000);
    const chatsInterval = setInterval(fetchChats, 12000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(messagesInterval);
      clearInterval(chatsInterval);
    };
  }, [fetchStatus, fetchMessages, fetchChats]);

  // Estadísticas calculadas
  const stats: StatsSummary = {
    pendingCount: messages.filter((m) => m.status === 'PENDIENTE' || m.status === 'PROCESANDO').length,
    sentTodayCount: messages.filter((m) => {
      if (m.status !== 'ENVIADO' || !m.sentAt) return false;
      const sentDate = new Date(m.sentAt);
      const today = new Date();
      return (
        sentDate.getDate() === today.getDate() &&
        sentDate.getMonth() === today.getMonth() &&
        sentDate.getFullYear() === today.getFullYear()
      );
    }).length
  };

  // Handlers de Acciones
  const handleScheduleMessage = async (payload: {
    phone: string;
    message: string;
    scheduledAt: string;
    attachment?: any;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al programar');
      showToast('Mensaje programado exitosamente');
      fetchMessages();
      fetchChats();
      return true;
    } catch (err: any) {
      showToast(err.message, 'error');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al cancelar mensaje');
      showToast('Mensaje eliminado');
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    try {
      const res = await fetch('/api/messages/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en eliminación masiva');
      showToast(`${json.count || ids.length} mensajes eliminados`);
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleBulkSendNow = async (ids: string[]) => {
    try {
      const res = await fetch('/api/messages/bulk-send-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en envío masivo');
      showToast(`${json.count || ids.length} mensajes activados para envío`);
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleEditMessage = async (id: string, newMessage: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage })
      });
      if (!res.ok) throw new Error('Error al editar mensaje');
      showToast('Mensaje actualizado');
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReschedule = async (id: string, newDateTime: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newDateTime })
      });
      if (!res.ok) throw new Error('Error al reprogramar mensaje');
      showToast('Fecha reprogramada');
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleSendNow = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}/send-now`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al forzar envío');
      showToast('Envío inmediato iniciado');
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRetry = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}/retry`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al reintentar mensaje');
      showToast('Mensaje re-encolado para envío');
      fetchMessages();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/session/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Error al desvincular sesión');
      showToast('Sesión desvinculada');
      fetchStatus();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-[#09090b]' : 'bg-[#f8fafc]'} text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-150`}>
      {/* Slim Navbar */}
      <Navbar
        status={status}
        stats={stats}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Si NO está conectado: Solo mostrar la pantalla de vincular QR */}
      {!status.connected ? (
        <main className="flex-1 flex items-center justify-center p-6">
          <WhatsAppStatusCard
            status={status}
            onRefreshQr={fetchStatus}
            onDisconnect={handleLogout}
          />
        </main>
      ) : (
        /* Si ESTÁ conectado: Ocultar la tarjeta de vinculación y mostrar Sidebar de contactos + Formulario + Tabla */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar de Chats Recientes */}
          <RecentChatsSidebar
            chats={chats}
            selectedPhone={selectedContact?.phone}
            onSelectChat={(chat) => setSelectedContact({ phone: chat.phone, name: chat.name })}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          />

          {/* Área Principal de Contenido */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6 max-w-6xl">
            {/* Formulario de Programación */}
            <MessageSchedulerForm
              onSubmit={handleScheduleMessage}
              isSubmitting={isSubmitting}
              prefillContact={selectedContact}
            />

            {/* Tabla de Mensajes con Bulk Actions */}
            <section className="w-full">
              <MessageQueueTable
                messages={messages}
                isLoading={isLoadingMessages}
                onRefresh={fetchMessages}
                onDelete={handleDeleteMessage}
                onEditMessage={handleEditMessage}
                onReschedule={handleReschedule}
                onSendNow={handleSendNow}
                onRetry={handleRetry}
                onBulkDelete={handleBulkDelete}
                onBulkSendNow={handleBulkSendNow}
              />
            </section>
          </main>
        </div>
      )}

      {/* Toast Notification Minimalista */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className={`px-4 py-2.5 rounded-lg text-xs font-sans font-medium border shadow-lg ${
              toastMessage.type === 'success'
                ? 'bg-zinc-900 border-zinc-800 text-white dark:bg-white dark:border-zinc-200 dark:text-zinc-900'
                : 'bg-rose-600 border-rose-700 text-white'
            }`}
          >
            {toastMessage.text}
          </div>
        </div>
      )}
    </div>
  );
};
