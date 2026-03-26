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
  name: string;         // Nome Civil ou Completo
  urnName: string;      // Nome de Urna
  position: string;
  location: string;
  party: string;
  coalition?: string;   // Coligação
  state: string;        // Estado (UF)
  history: string;      // Histórico político
  bio_base: string;     // Biografia Base
  ai_directives?: string; // Diretrizes extras de tom para a IA
  photoOfficial?: string; // Base64 ou URL da foto oficial
  subCharacters?: {     // Vices, suplentes ou figuras-chave
    role: string;
    name: string;
    photo?: string;
  }[];
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
  financeConfig?: {
    monthlyGoal: number;
    spendingLimit: number; // Teto definido pelo usuário
    tseSpendingLimit?: number; // Teto oficial do TSE para referência
    categoryGoals: {
      fundoPartidario: number;
      doacaoFisica: number;
      vaquinha: number;
      eventos: number;
      outros: number;
    };
    sources: {
      fundoPartidario: boolean;
      doacaoFisica: boolean;
      vaquinha: boolean;
      eventos: boolean;
    };
  };
  legalConfig?: {
    cnpj: string;
    bankAccount: string;
    pix?: string;
    bankDetails?: string;
    checklist: {
      docs: boolean;
      tre: boolean;
      fidelidade: boolean;
      cnpj_emitted: boolean;
      spce_setup: boolean;
    };
    [key: string]: unknown;
  };
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

/** Transação Financeira */
export interface CashTransaction extends BaseDocument {
  description: string;
  type: 'income' | 'expense';
  category: 'fundoPartidario' | 'doacaoFisica' | 'vaquinha' | 'eventos' | 'pessoal' | 'grafica' | 'marketing' | 'outros';
  amount: number;
  date: string;
  status: 'pending' | 'completed';
  paidStatus?: 'provisioned' | 'paid'; // Controle de efetivação de caixa
  supplierId?: string; // Link com fornecedor/contrato validado
  attachmentUrl?: string; // Link para NF ou Comprovante
  linkedCampaignId?: string; // Vinculo com Vaquinha ou Evento (para dedução de taxas e update de progresso)
}

/** Campanhas de Arrecadação (Vaquinhas / Eventos) */
export interface FundraisingCampaign extends BaseDocument {
  type: 'vaquinha' | 'evento';
  title: string;
  description: string;
  goal: number;
  raised?: number;
  pixKey: string;
  eventDate?: string;
  eventLocation?: string;
  status: 'Ativa' | 'Encerrada' | 'Rascunho';
  shareLink?: string;
  feePercentage?: number; // % deduzido pela plataforma / produtora
}

/** Logística Administrativa */
export interface Vehicle extends BaseDocument {
  plate: string;
  model: string;
  driver: string;
  contract_type: 'alugado' | 'cedido' | 'proprio';
  fuel_quota: number;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface MaterialItem extends BaseDocument {
  name: string;
  type: 'santinho' | 'adesivo' | 'praguinha' | 'bandeira' | 'cartaz' | 'outros';
  quantity_in_stock: number;
  unit_cost: number;
  supplier?: string;
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

// ──────────────────────────────────────────────────────────────
//  Intelligence Hub — Monitoramento Centralizado
// ──────────────────────────────────────────────────────────────

/** Dados de candidatura retornados pelo TSE DivulgaCand */
export interface CandidacyInfo {
  nomeUrna: string;
  cargo:    string;
  partido:  string;
  situacao: string;
  numero:   string;
  uf:       string;
  ano:      number;
  link:     string;
}

export type MonitoringPlatform =
  | 'google_news'
  | 'x_rss'
  | 'x_manus'
  | 'facebook_manus'
  | 'instagram_manus'
  | 'tse'
  | 'tre'
  | 'dou'
  | 'dou_rs'
  | 'rss_custom'
  | 'rss_politica'
  | 'mcp_manus';

export type MonitoringType =
  | 'news'       // notícia de mídia
  | 'social'     // post / menção em rede social
  | 'legal'      // processo, notificação judicial
  | 'official'   // publicação em Diário Oficial
  | 'competitor' // inteligência sobre concorrente
  | 'poll';      // pesquisa de intenção de voto

export type MonitoringSubject = 'candidate' | 'competitor' | 'party' | 'campaign';

export interface MonitoringItem {
  id: string;
  campaign_id: string;
  type: MonitoringType;
  platform: MonitoringPlatform;
  subject: MonitoringSubject;
  title: string;
  summary: string;
  url?: string;
  imageUrl?: string;
  sentiment?: Sentiment;
  /** Nome da pessoa referenciada (candidato ou concorrente) */
  relatedPerson?: string;
  rawData?: Record<string, unknown>;
  fetchedAt: Date;
  /** Se IA já processou e classificou este item */
  processed?: boolean;
}

/** Fonte de RSS configurável pelo usuário */
export interface RSSFeedConfig {
  id: string;
  campaign_id: string;
  name: string;
  url: string;
  type: MonitoringType;
  active: boolean;
  createdAt: Date;
}
