import React, { useState, useRef } from 'react';
import {
  Clock,
  Send,
  Paperclip,
  X
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !message.trim() || !rawDateTime) return;

    const localDate = new Date(rawDateTime);
    let fullPhone = phoneNumber.replace(/\D/g, '');
    if (!fullPhone.startsWith(selectedCountry.dialCode)) {
      fullPhone = `${selectedCountry.dialCode}${fullPhone}`;
    }

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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#121215] p-5 sm:p-6 shadow-sm text-zinc-900 dark:text-zinc-100 select-none">
      <div className="pb-4 mb-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Clock size={18} className="text-zinc-500" />
          <h2 className="text-base font-semibold font-sans tracking-tight">
            Programar Nuevo Mensaje
          </h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-sans">
        {/* Campo Teléfono */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Destinatario
          </label>
          <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/60 focus-within:border-zinc-900 dark:focus-within:border-zinc-400 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-colors shadow-xs">
            <select
              value={selectedCountry.code}
              onChange={(e) => {
                const found = COUNTRIES.find((c) => c.code === e.target.value);
                if (found) setSelectedCountry(found);
              }}
              className="bg-transparent border-r border-zinc-200 dark:border-zinc-700 text-sm font-mono text-zinc-700 dark:text-zinc-300 px-3 py-2.5 outline-none cursor-pointer"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
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
              className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
            />
          </div>
        </div>

        {/* Selector de Fecha y Hora */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1.5">
            Fecha y Hora de Envío
          </label>

          <div className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/60 focus-within:border-zinc-900 dark:focus-within:border-zinc-400 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-colors mb-2.5 shadow-xs">
            <input
              type="datetime-local"
              value={rawDateTime}
              onChange={(e) => setRawDateTime(e.target.value)}
              required
              className="w-full bg-transparent px-3.5 py-2.5 text-sm font-mono text-zinc-900 dark:text-zinc-100 outline-none cursor-pointer"
            />
          </div>

          {/* Chips de ajuste rápido */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: '+2m', action: () => addMinutes(2) },
              { label: '+10m', action: () => addMinutes(10) },
              { label: '+30m', action: () => addMinutes(30) },
              { label: '+1h', action: () => addMinutes(60) },
              { label: 'Mañana 09:00', action: setTomorrowMorning }
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.action}
                className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mensaje */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Contenido del Mensaje
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-400">Variables:</span>
              <button
                type="button"
                onClick={() => insertVariable('nombre')}
                className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900 hover:bg-zinc-200 text-xs font-mono text-zinc-700 dark:text-zinc-300"
              >
                {'{nombre}'}
              </button>
              <button
                type="button"
                onClick={() => insertVariable('hora')}
                className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900 hover:bg-zinc-200 text-xs font-mono text-zinc-700 dark:text-zinc-300"
              >
                {'{hora}'}
              </button>
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            maxLength={1000}
            required
            placeholder="Escribe el contenido del mensaje a programar..."
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/60 p-3.5 text-sm font-sans text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400 focus:bg-white dark:focus:bg-zinc-900 transition-colors resize-none shadow-xs"
          />

          <div className="flex items-center justify-between mt-1 text-xs text-zinc-400 font-mono">
            <span>{message.length} / 1000 caracteres</span>
          </div>
        </div>

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={isSubmitting || !phoneNumber || !message.trim()}
          className="w-full py-3 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          {isSubmitting ? (
            <span>Guardando mensaje...</span>
          ) : (
            <>
              <Send size={16} />
              <span>Programar Envío</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
