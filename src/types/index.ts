// ──────────────────────────────────────────────────────────────
//  CampanhaDigitalIA — Types: Multi-Tenant Core
// ──────────────────────────────────────────────────────────────

/** Campanhas disponíveis no sistema */
export type CampaignYear = 2024 | 2026 | 2028;

export type Sentiment = 'positivo' | 'neutro' | 'negativo' | 'critico';

export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  active: boolean;
  createdAt: Date;
  gemini_token_usage?: number;
  api_config?: {
    gemini?: string;
    manus?: string;
  };
}

export interface CampaignIdentity {
  name: string;
  position: string;
  location: string;
  party: string;
  bio_base: string;
}

export interface Competitor {
  id: string;
  name: string;
  socials: {
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    facebook?: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative' | 'critical';
  lastAnalysis?: Date;
}

export interface Campaign {
  id: string;
  organization_id: string; // Vínculo com a Organização
  year: CampaignYear;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  identity?: CampaignIdentity;
  competitors?: Competitor[];
  neighborhood?: string[]; // IDs/Nomes de cidades/regiões vizinhas
  base_city?: string;    // Ponto de partida padrão para rotas
  
  // Herança e Dados Históricos
  legacy_campaign_id?: string;
  admin_email: string;
  historical_results?: {
    city: string;
    real_votes: number;
    real_percentage: number;
    opponent_percentage: number;
  }[];
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
export type UserRole = 'Proprietor' | 'Admin' | 'Manager' | 'Volunteer';

export interface UserProfile extends BaseDocument {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  organization_id?: string; // Vínculo com a Organização
  campaigns: string[]; // campanhas que o usuário tem acesso
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

export interface Mention {
  id: string;
  region: string;
  topic: string;
  platform: 'Twitter' | 'Facebook' | 'Instagram';
  text: string;
  sentiment?: 'positivo' | 'neutro' | 'negativo' | 'critico';
  timestamp: string;
}

export interface AIReply {
  persona: 'Conciliador' | 'Técnico' | 'Firme';
  text: string;
}
