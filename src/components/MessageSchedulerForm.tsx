import React, { useState, useRef } from 'react';
import {
  Calendar,
  Send,
  Paperclip,
  X,
  Clock,
  Check,
  FileText
} from 'lucide-react';
import { AttachmentItem, CountryPrefix } from '../types';

interface MessageSchedulerFormProps {
  onSubmit: (payload: {
    phone: string;
    message: string;
    scheduledAt: string;
    attachment?: AttachmentItem;
  }) => Promise<boolean>;
  isSubmitting?: boolean;
}

const COUNTRIES: CountryPrefix[] = [
  { code: 'PE', name: 'Perú', dialCode: '51', formatPlaceholder: '954 584 523' },
  { code: 'US', name: 'EE.UU.', dialCode: '1', formatPlaceholder: '202 555 0123' },
  { code: 'MX', name: 'México', dialCode: '52', formatPlaceholder: '55 1234 5678' },
  { code: 'CO', name: 'Colombia', dialCode: '57', formatPlaceholder: '300 123 4567' },
  { code: 'CL', name: 'Chile', dialCode: '56', formatPlaceholder: '9 1234 5678' },
  { code: 'AR', name: 'Argentina', dialCode: '549', formatPlaceholder: '11 1234 5678' },
  { code: 'ES', name: 'España', dialCode: '34', formatPlaceholder: '612 345 678' },
];

export const MessageSchedulerForm: React.FC<MessageSchedulerFormProps> = ({
  onSubmit,
  isSubmitting = false
}) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryPrefix>(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [rawDateTime, setRawDateTime] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${mins}`;
  });
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<AttachmentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numeric = e.target.value.replace(/\D/g, '');
    setPhoneNumber(numeric);
  };

  const addMinutes = (mins: number) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + mins);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    setRawDateTime(`${year}-${month}-${day}T${hours}:${m}`);
  };

  const setTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setRawDateTime(`${year}-${month}-${day}T09:00`);
  };

  const insertVariable = (variableName: string) => {
    setMessage((prev) => `${prev} {${variableName}} `);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment({
        name: file.name,
        size: file.size,
        type: file.type
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !message.trim() || !rawDateTime) return;

    // Conversión a ISO UTC limpio
    const localDate = new Date(rawDateTime);
    const fullPhone = `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;

    const success = await onSubmit({
      phone: fullPhone,
      message: message.trim(),
      scheduledAt: localDate.toISOString(),
      attachment: attachment || undefined
    });

    if (success) {
      setMessage('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded border border-zinc-800 bg-[#121215] p-4 text-zinc-100 flex flex-col justify-between">
      <div className="pb-3 mb-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-zinc-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
            Programar Mensaje
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Campo Teléfono con selector de código de país */}
        <div>
          <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
            Destinatario
          </label>
          <div className="flex rounded border border-zinc-800 bg-[#0b0f17] focus-within:border-zinc-600 transition-colors">
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const found = COUNTRIES.find((c) => c.code === e.target.value);
                if (found) setSelectedCountry(found);
              }}
              className="bg-transparent border-r border-zinc-800 text-xs font-mono text-zinc-300 px-2.5 py-2 outline-none cursor-pointer hover:bg-zinc-900/50"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-zinc-900 text-zinc-200">
                  {c.code} +{c.dialCode}
                </option>
              ))}
            </select>
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder={selectedCountry.formatPlaceholder}
              required
              className="flex-1 bg-transparent px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 outline-none"
            />
          </div>
        </div>

        {/* Selector de Fecha y Hora con Chips Rápidos */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Fecha y Hora de Disparo (Hora Local)
            </label>
          </div>

          <div className="relative flex items-center rounded border border-zinc-800 bg-[#0b0f17] focus-within:border-zinc-600 mb-2">
            <input
              type="datetime-local"
              value={rawDateTime}
              onChange={(e) => setRawDateTime(e.target.value)}
              required
              className="w-full bg-transparent px-3 py-2 text-xs font-mono text-zinc-200 outline-none cursor-pointer [color-scheme:dark]"
            />
          </div>

          {/* Chips compactos de ajuste de tiempo */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => addMinutes(2)}
              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              +2m
            </button>
            <button
              type="button"
              onClick={() => addMinutes(10)}
              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              +10m
            </button>
            <button
              type="button"
              onClick={() => addMinutes(30)}
              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              +30m
            </button>
            <button
              type="button"
              onClick={() => addMinutes(60)}
              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              +1h
            </button>
            <button
              type="button"
              onClick={setTomorrowMorning}
              className="px-2 py-1 rounded border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Mañana 09:00
            </button>
          </div>
        </div>

        {/* Caja de Mensaje */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Contenido del Mensaje
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => insertVariable('nombre')}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                {'{nombre}'}
              </button>
              <button
                type="button"
                onClick={() => insertVariable('hora')}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                {'{hora}'}
              </button>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-[#0b0f17] focus-within:border-zinc-600">
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe el mensaje..."
              maxLength={1000}
              required
              className="w-full bg-transparent p-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none resize-y min-h-[90px] leading-relaxed"
            />

            {/* Píldora de adjunto si existe */}
            {attachment && (
              <div className="px-3 pb-2 flex items-center">
                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/80 border border-zinc-700 text-xs text-zinc-300 font-mono">
                  <FileText size={12} className="text-zinc-400" />
                  <span className="max-w-[200px] truncate">{attachment.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachment(null)}
                    className="text-zinc-500 hover:text-zinc-200 ml-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Toolbar inferior con clip y contador de caracteres */}
            <div className="px-3 py-2 border-t border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Adjuntar archivo o imagen"
                >
                  <Paperclip size={14} />
                  <span className="text-[11px] font-mono">Adjuntar</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-zinc-500">
                {message.length} / 1000
              </div>
            </div>
          </div>
        </div>

        {/* Botón de Envío de Alto Contraste */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition-colors duration-150 shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="inline-flex items-center gap-2 font-mono">
              <span className="w-3 h-3 rounded-full border-2 border-black border-t-transparent animate-spin" />
              <span>Programando...</span>
            </span>
          ) : (
            <>
              <Send size={14} />
              <span>Programar Envío</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
