// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  CampanhaDigitalIA â€” Types: Multi-Tenant Core
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Campanhas disponÃ­veis no sistema */
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

export type ElectionScope = 'municipal' | 'estadual' | 'federal';

export interface CampaignIdentity {
  // Dados Pessoais
  name: string;              // Nome Civil ou Completo
  urnName: string;           // Nome de Urna
  cpf?: string;              // CPF do candidato
  candidateNumber?: string;  // Numero TSE (ex: 10, 4015, 45678)

  // Dados Eleitorais
  position: string;          // Cargo (Ex: Prefeito, Deputado Estadual)
  electionScope?: ElectionScope; // Ambito da eleicao
  location: string;          // Cidade sede ou comite central
  state: string;             // Estado (UF)
  party: string;             // Partido
  coalition?: string;        // Coligacao

  // Contato Oficial
  whatsappOfficial?: string; // WhatsApp oficial da campanha
  socialMedia?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
  };

  // IA & Narrativa
  history: string;           // Historico politico
  bio_base: string;          // Biografia Base
  ai_directives?: string;    // Diretrizes extras de tom para a IA

  // Foto
  photoOfficial?: string;    // Base64 ou URL da foto oficial

  // Equipe
  subCharacters?: {          // Vices, suplentes ou figuras-chave
    role: string;
    name: string;
    photo?: string;
  }[];
}

export interface Competitor {
  id: string;
  name: string;
  party?: string;             // Partido do concorrente
  position?: string;          // Cargo disputado
  candidateNumber?: string;   // Número TSE
  aiSuggested?: boolean;      // true = sugerido pela IA, aguardando validação
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
  organization_id: string; // VÃ­nculo com a OrganizaÃ§Ã£o
  year: CampaignYear;
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  identity?: CampaignIdentity;
  competitors?: Competitor[];
  neighborhood?: string[]; // IDs/Nomes de cidades/regiÃµes vizinhas
  base_city?: string;    // Ponto de partida padrÃ£o para rotas
  
  // HeranÃ§a e Dados HistÃ³ricos
  legacy_campaign_id?: string;
  admin_email: string;
  financeConfig?: {
    monthlyGoal: number;
    spendingLimit: number; // Teto definido pelo usuÃ¡rio
    tseSpendingLimit?: number; // Teto oficial do TSE para referÃªncia
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

/** Modo de visualizaÃ§Ã£o: ativa ou histÃ³rica */
export type ViewMode = 'active' | 'historical';

/** Base obrigatÃ³ria em todos os documentos Firestore */
export interface BaseDocument {
  id: string;
  campaign_id: string; // OBRIGATÃ“RIO â€” isolamento multi-tenant
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
  organization_id?: string; // VÃ­nculo com a OrganizaÃ§Ã£o
  campaigns: string[]; // campanhas que o usuÃ¡rio tem acesso
}

/** Contato genÃ©rico */
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

/** Log de interaÃ§Ã£o */
export interface Interaction extends BaseDocument {
  contactId: string;
  type: 'call' | 'meeting' | 'email' | 'whatsapp' | 'visit' | 'other';
  subject: string;
  description?: string;
  date: Date;
  outcome?: string;
}

/** TransaÃ§Ã£o Financeira */
export interface CashTransaction extends BaseDocument {
  description: string;
  type: 'income' | 'expense';
  category: 'fundoPartidario' | 'doacaoFisica' | 'vaquinha' | 'eventos' | 'pessoal' | 'grafica' | 'marketing' | 'outros';
  amount: number;
  date: string;
  status: 'pending' | 'completed';
  paidStatus?: 'provisioned' | 'paid'; // Controle de efetivaÃ§Ã£o de caixa
  supplierId?: string; // Link com fornecedor/contrato validado
  attachmentUrl?: string; // Link para NF ou Comprovante
  linkedCampaignId?: string; // Vinculo com Vaquinha ou Evento (para deduÃ§Ã£o de taxas e update de progresso)
}

/** Campanhas de ArrecadaÃ§Ã£o (Vaquinhas / Eventos) */
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

/** LogÃ­stica Administrativa */
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

/** MCP â€” Mensagem para agentes autÃ´nomos */
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  Intelligence Hub â€” Monitoramento Centralizado
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  | 'mcp_manus'
  | 'bluesky'
  | 'nitter'
  | 'telegram_public'
  | 'youtube'
  | 'reddit'
  | 'newsapi_custom';

export type MonitoringType =
  | 'news'       // notÃ­cia de mÃ­dia
  | 'social'     // post / menÃ§Ã£o em rede social
  | 'legal'      // processo, notificaÃ§Ã£o judicial
  | 'official'   // publicaÃ§Ã£o em DiÃ¡rio Oficial
  | 'competitor' // inteligÃªncia sobre concorrente
  | 'poll';      // pesquisa de intenÃ§Ã£o de voto

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
  /** Se IA jÃ¡ processou e classificou este item */
  processed?: boolean;
  /** Item salvo/bookmarkado pelo usuario */
  saved?: boolean;
  savedAt?: Date;
  savedNotes?: string;
  /** Score de importancia 1-10 atribuido pela IA */
  importance?: number;
  /** Sentimento geral do item */
  aiSentiment?: 'positive' | 'negative' | 'neutral';
  /** Quando a IA classificou */
  aiClassifiedAt?: Date;
  /** Canal especifico de origem (ex: 'Globo News', '@canal', 'r/brasil') */
  sourceChannel?: string;
}

/** Fonte de RSS configurÃ¡vel pelo usuÃ¡rio */
export interface RSSFeedConfig {
  id: string;
  campaign_id: string;
  name: string;
  url: string;
  type: MonitoringType;
  active: boolean;
  createdAt: Date;
}

/** IA adicional configurÃ¡vel pelo usuÃ¡rio */
export interface ExtraAIConfig {
  id: 'openai' | 'perplexity' | 'groq' | 'anthropic';
  name: string;
  apiKey: string;
  model: string;
  active: boolean;
  /** Tier gratuito disponÃ­vel */
  freeTier: boolean;
  freeTierNote?: string;
}

/** ConfiguraÃ§Ã£o global dos mecanismos de busca para a campanha */
export interface SearchEngineConfig {
  campaign_id: string;
  /** Keywords extras aplicadas a todos os mecanismos */
  globalKeywords: string[];
  /** Quais mecanismos estÃ£o habilitados no ciclo de monitoramento */
  activeEngines: {
    rss: boolean;
    gemini: boolean;
    manus: boolean;
    tse: boolean;
    tre: boolean;
    extraAIs: string[]; // IDs das ExtraAIConfig ativas
  };
  /** Modelo Gemini preferido */
  geminiModel: string;
  /** Diretrizes globais adicionadas a todos prompts Gemini */
  geminiGlobalDirective: string;
  /** Token/API key do Manus IA */
  manusToken: string;
  /** UF para busca TRE */
  treUF: string;
  /** IAs extras configuradas */
  extraAIs: ExtraAIConfig[];
  updatedAt: Date;
}


