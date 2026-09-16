export type MessageStatus = 'PENDIENTE' | 'PROCESANDO' | 'ENVIADO' | 'ERROR';

export interface AttachmentItem {
  name: string;
  size?: number;
  type?: string;
  url?: string;
}

export interface MessageItem {
  _id: string;
  phone: string;
  message: string;
  scheduledAt: string;
  status: MessageStatus;
  messageId?: string | null;
  error?: string | null;
  sentAt?: string | null;
  attachment?: AttachmentItem | null;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppUser {
  id: string;
  name?: string;
  lid?: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  qr: string | null;
  user?: WhatsAppUser | null;
  lastPing?: string;
}

export interface StatsSummary {
  pendingCount: number;
  sentTodayCount: number;
}

export type FilterTab = 'all' | 'pending' | 'sent' | 'error';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface CountryPrefix {
  code: string;
  name: string;
  dialCode: string;
  formatPlaceholder: string;
}
