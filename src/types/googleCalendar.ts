// Google Calendar Integration Types

export type GoogleSyncType = 'local' | 'importado' | 'espelhado' | 'enviado' | 'ignorado' | 'cancelado';

export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  status: string;
  htmlLink: string;
  recurrence?: string[];
  recurringEventId?: string;
}

// Estrutura para agrupar eventos recorrentes
export interface RecurringEventSeries {
  masterId: string;
  summary: string;
  instances: GoogleEvent[];
  firstInstance: GoogleEvent;
  lastInstance: GoogleEvent;
  totalCount: number;
  recurrenceRule?: string;
}

// Helper para verificar se evento é parte de série recorrente
export const isRecurringEvent = (event: GoogleEvent): boolean => {
  return !!(event.recurringEventId || (event.recurrence && event.recurrence.length > 0));
};

// Helper para obter o ID master da série
export const getRecurringMasterId = (event: GoogleEvent): string | null => {
  return event.recurringEventId || (event.recurrence ? event.id : null);
};

export interface PlatformSession {
  id: string;
  data: string;
  horario: string;
  status: string;
  valor?: number;
  anotacoes?: string;
  client_id: string;
  package_id?: string;
  recurring_session_id?: string;
  google_event_id?: string;
  google_sync_type?: GoogleSyncType;
  google_ignored?: boolean;
  google_attendees?: any[];
  google_location?: string;
  google_html_link?: string;
  google_recurrence_id?: string;
  google_last_synced?: string;
  clients?: {
    id: string;
    nome: string;
    email?: string;
    avatar_url?: string;
  };
}

export interface SyncAction {
  type: 'import' | 'copy' | 'mirror' | 'send' | 'ignore' | 'mark-client';
  label: string;
  description: string;
  icon: string;
}

export const SYNC_ACTIONS: Record<string, SyncAction> = {
  import: {
    type: 'import',
    label: 'Importar do Google',
    description: 'Traz o evento como cópia somente leitura. Alterações no Google não afetam a cópia.',
    icon: 'Download'
  },
  copy: {
    type: 'copy',
    label: 'Criar cópia editável',
    description: 'Duplica o evento como sessão editável. Não altera o evento original.',
    icon: 'Copy'
  },
  mirror: {
    type: 'mirror',
    label: 'Espelhar com Google',
    description: 'Sincronização bidirecional. Alterações em ambos os lados são refletidas.',
    icon: 'RefreshCw'
  },
  send: {
    type: 'send',
    label: 'Enviar para Google',
    description: 'Publica o evento no Google Calendar. Alterações no Google não afetam a plataforma.',
    icon: 'Upload'
  },
  ignore: {
    type: 'ignore',
    label: 'Ignorar',
    description: 'Remove o evento da lista sem afetar o Google.',
    icon: 'EyeOff'
  },
  'mark-client': {
    type: 'mark-client',
    label: 'Marcar como cliente',
    description: 'Conecta os participantes à lista de clientes automaticamente.',
    icon: 'UserPlus'
  }
};

export const SYNC_TYPE_LABELS: Record<GoogleSyncType, { label: string; color: string; description: string }> = {
  local: {
    label: 'Local',
    color: 'secondary',
    description: 'Criado apenas na plataforma'
  },
  importado: {
    label: 'Importado',
    color: 'info',
    description: 'Importado do Google (somente leitura)'
  },
  espelhado: {
    label: 'Espelhado',
    color: 'success',
    description: 'Sincronização bidirecional com Google'
  },
  enviado: {
    label: 'Enviado',
    color: 'warning',
    description: 'Enviado para o Google (one-way)'
  },
  ignorado: {
    label: 'Ignorado',
    color: 'outline',
    description: 'Evento ignorado do Google'
  },
  cancelado: {
    label: 'Cancelado',
    color: 'destructive',
    description: 'Evento cancelado no Google Calendar'
  }
};

// Tipos para detecção de conflitos
export type ConflictField = 'date' | 'time' | 'description' | 'location' | 'attendees';

export interface ConflictDiff {
  field: ConflictField;
  platformValue: string;
  googleValue: string;
}

export interface SyncConflict {
  id: string;
  sessionId: string;
  googleEventId: string;
  sessionData: PlatformSession;
  googleEventData: GoogleEvent;
  differences: ConflictDiff[];
  detectedAt: string;
  severity: 'low' | 'medium' | 'high';
}

export type ConflictResolution = 'keep_platform' | 'keep_google' | 'merge' | 'dismiss';

export interface ConflictResolutionChoice {
  conflictId: string;
  resolution: ConflictResolution;
  mergedData?: Partial<PlatformSession>;
}
