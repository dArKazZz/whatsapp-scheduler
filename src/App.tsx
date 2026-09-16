import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { WhatsAppStatusCard } from './components/WhatsAppStatusCard';
import { MessageSchedulerForm } from './components/MessageSchedulerForm';
import { MessageQueueTable } from './components/MessageQueueTable';
import { WhatsAppStatus, StatsSummary, MessageItem } from './types';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false,
    qr: null,
    user: null,
    lastPing: undefined
  });
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch Status de WhatsApp (/api/status & /api/debug)
  const fetchStatus = useCallback(async () => {
    try {
      const startTime = performance.now();
      const res = await fetch('/api/status');
      const pingTime = Math.round(performance.now() - startTime);
      const data = await res.json();

      let user = null;
      try {
        const debugRes = await fetch('/api/debug');
        const debugData = await debugRes.json();
        user = debugData.user || null;
      } catch (e) {}

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

  // 2. Fetch Historial de Mensajes (/api/messages)
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

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    const statusInterval = setInterval(fetchStatus, 4000);
    const messagesInterval = setInterval(fetchMessages, 10000);
    return () => {
      clearInterval(statusInterval);
      clearInterval(messagesInterval);
    };
  }, [fetchStatus, fetchMessages]);

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
      showToast('Mensaje cancelado');
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
      showToast('Fecha actualizada');
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
      showToast('Mensaje devuelto a la cola');
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
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-[#09090b]' : 'bg-zinc-50'} text-zinc-100 flex flex-col font-sans transition-colors duration-150`}>
      {/* Slim Navbar */}
      <Navbar
        status={status}
        stats={stats}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Content Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Panel Izquierdo: WhatsApp Status Card (4 columnas) */}
          <div className="lg:col-span-4 flex flex-col">
            <WhatsAppStatusCard
              status={status}
              onRefreshQr={fetchStatus}
              onDisconnect={handleLogout}
            />
          </div>

          {/* Panel Derecho: Formulario de Programación (8 columnas) */}
          <div className="lg:col-span-8 flex flex-col">
            <MessageSchedulerForm
              onSubmit={handleScheduleMessage}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>

        {/* Tabla de Cola e Historial */}
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
          />
        </section>
      </main>

      {/* Toast Notification Minimalista */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div
            className={`px-3 py-2 rounded text-xs font-mono border shadow-2xl ${
              toastMessage.type === 'success'
                ? 'bg-[#121215] border-emerald-800 text-emerald-300'
                : 'bg-[#121215] border-red-800 text-red-300'
            }`}
          >
            {toastMessage.text}
          </div>
        </div>
      )}
    </div>
  );
};
