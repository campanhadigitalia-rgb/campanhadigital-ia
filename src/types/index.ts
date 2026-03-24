// ──────────────────────────────────────────────────────────────
//  ERP Piratini — Types: Multi-Tenant Core
// ──────────────────────────────────────────────────────────────

/** Campanhas disponíveis no sistema */
export type CampaignYear = 2026 | 2028;

export interface Campaign {
  id: string;
  year: CampaignYear;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
}

/** Modo de visualização: ativa ou histórica */
export type ViewMode = 'active' | 'historical';

/** Base obrigatória em todos os documentos Firestore */
export interface BaseDocument {
  id: string;
  campaign_id: string; // OBRIGATÓRIO — isolamento multi-tenant
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/** Roles RBAC */
export type UserRole = 'Admin' | 'Manager' | 'Volunteer';

export interface UserProfile extends BaseDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  campaigns: string[]; // camapnhas que o usuário tem acesso
}

/** Contato genérico */
export interface Contact extends BaseDocument {
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  city?: string;
  state?: string;
  role?: string;
  party?: string;
  tags?: string[];
  notes?: string;
  photoURL?: string;
}

/** Log de interação */
export interface Interaction extends BaseDocument {
  contactId: string;
  type: 'call' | 'meeting' | 'email' | 'whatsapp' | 'visit' | 'other';
  subject: string;
  description?: string;
  date: Date;
  outcome?: string;
}

/** Tarefa / atividade */
export interface Task extends BaseDocument {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'todo' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
}

/** MCP — Mensagem para agentes autônomos */
export interface MCPMessage {
  id: string;
  campaign_id: string;
  source: string;       // ex: 'meta-agent' | 'user' | 'system'
  action: string;       // ex: 'sync_contacts' | 'generate_report'
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'done' | 'error';
  timestamp: Date;
  response?: Record<string, unknown>;
}
