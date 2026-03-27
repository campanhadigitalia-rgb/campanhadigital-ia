// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Search Engines Settings (v2)
//  RSS, Gemini, Manus, TSE, TRE, Redes Sociais (Free + Pago),
//  Painel de Custo, Keywords Globais, Rate Limiting
// ──────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Rss, Brain, Search, Scale, Building2, Bot, Tags,
  Plus, Trash2, Save, CheckCircle, XCircle, Loader2,
  Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink,
  Zap, Info, AlertCircle, RefreshCcw, Tv, MessageCircle
} from 'lucide-react';
import {
  doc, getDoc, setDoc, collection, getDocs, addDoc,
  deleteDoc, query, where, serverTimestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { testGeminiConnection } from '../../services/aiService';
import { fetchTSEElections } from '../../services/tseIntegrationService';
import { DEFAULT_POLITICAL_FEEDS } from '../../services/newsMonitorService';
import { TV_CHANNELS } from '../../services/youtubeService';
import TokenUsageDashboard, { RateLimitSelector } from '../../components/ui/TokenUsageDashboard';
import type { RSSFeedConfig, SearchEngineConfig, ExtraAIConfig } from '../../types';
import type { RateLimitMode } from '../../utils/billingMonitor';

// ── Constantes ─────────────────────────────────────────────────

const GEMINI_MODELS = [
  { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   desc: 'Mais preciso para análises complexas.',  badge: 'Recomendado' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Ultra-rápido, ideal para monitoramento.', badge: 'Mais rápido' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Equilíbrio velocidade/qualidade.',         badge: 'Econômico' },
];

const EXTRA_AIS_CATALOG = [
  {
    id: 'groq' as const, name: 'Groq (LLaMA 3)', model: 'llama-3.1-70b-versatile',
    freeTier: true, freeTierNote: 'Grátis: 14.400 req/dia. Ótimo para análise em lote.',
    getKeyUrl: 'https://console.groq.com/keys',
    useCases: 'Sentimento em massa, resumo rápido, backup do Gemini.',
    dailyLimit: 14400,
  },
  {
    id: 'perplexity' as const, name: 'Perplexity AI', model: 'llama-3.1-sonar-small-128k-online',
    freeTier: true, freeTierNote: 'Trial gratuito disponível. Pago a ~$0.20/1M tokens após.',
    getKeyUrl: 'https://www.perplexity.ai/settings/api',
    useCases: 'Busca web em tempo real com fontes citadas. Alternativa ao Manus.',
    dailyLimit: undefined,
  },
  {
    id: 'openai' as const, name: 'OpenAI GPT-4o', model: 'gpt-4o-mini',
    freeTier: false, paidNote: 'Pago. GPT-4o Mini a ~$0.15/1M tokens.',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    useCases: 'Geração premium de conteúdo, análise jurídica estruturada.',
    dailyLimit: undefined,
  },
  {
    id: 'anthropic' as const, name: 'Anthropic Claude', model: 'claude-3-haiku-20240307',
    freeTier: false, paidNote: 'Pago. Claude Haiku a ~$0.25/1M tokens.',
    getKeyUrl: 'https://console.anthropic.com/keys',
    useCases: 'Excelente para documentos longos, leis e Diário Oficial.',
    dailyLimit: undefined,
  },
];

// Fontes de redes sociais
const SOCIAL_FREE_SOURCES = [
  {
    id: 'bluesky', name: 'Bluesky', icon: '🦋', tier: 'free' as const,
    desc: 'Rede social emergente com forte presença política no Brasil. API completamente aberta.',
    howto: 'Funciona automaticamente, sem qualquer configuração.',
    profile: 'https://bsky.app',
  },
  {
    id: 'nitter', name: 'X / Twitter (público)', icon: '𝕏', tier: 'free' as const,
    desc: 'Posts públicos do X/Twitter via espelhos Nitter. Workaround gratuito sem API.',
    howto: 'Funciona automaticamente usando instâncias públicas do Nitter. Não requer conta no X.',
    profile: 'https://nitter.net',
  },
  {
    id: 'reddit', name: 'Reddit', icon: '🤖', tier: 'free' as const,
    desc: 'Busca em subreddits políticos brasileiros (r/brasil, r/politica).',
    howto: 'API pública, sem configuração. Usa os subreddits padrões.',
    profile: 'https://reddit.com',
  },
];

const SOCIAL_FREE_KEY_SOURCES = [
  {
    id: 'youtube', name: 'YouTube / TV Brasileira', icon: '📺', tier: 'free_key' as const,
    desc: 'Vídeos por keyword + monitoramento automático dos principais canais de TV (Globo News, Band, CNN Brasil).',
    howto: 'Usa a mesma API Key do Google Cloud (Google AI Studio). Grátis até 10.000 unidades/dia.',
    getKeyUrl: 'https://console.cloud.google.com/apis/credentials',
    dailyLimit: 10000,
    unit: 'units',
    configKey: 'youtubeApiKey' as const,
  },
  {
    id: 'newsapi', name: 'NewsAPI.org', icon: '🗞️', tier: 'free_key' as const,
    desc: '70.000 fontes jornalísticas mundiais, inclui veículos brasileiros. Plano dev gratuito.',
    howto: 'Crie conta em newsapi.org → API Keys → copie e cole abaixo.',
    getKeyUrl: 'https://newsapi.org/register',
    dailyLimit: 100,
    unit: 'req',
    configKey: 'newsApiKey' as const,
  },
  {
    id: 'serper', name: 'Serper.dev (Google Search)', icon: '🌐', tier: 'free_key' as const,
    desc: 'Resultados reais do Google Search via API. 2.500 buscas grátis/mês.',
    howto: 'Cadastre em serper.dev → copie sua API key abaixo.',
    getKeyUrl: 'https://serper.dev',
    dailyLimit: undefined,
    unit: 'req',
    configKey: 'serperApiKey' as const,
  },
];

const SOCIAL_PAID_SOURCES = [
  {
    id: 'x_paid', name: 'Twitter/X API (Pago)', icon: '𝕏', tier: 'paid' as const,
    desc: 'Acesso real à API do X para busca e monitoramento em tempo real.',
    cost: '~U$100/mês (Basic). ~U$5.000/mês (Pro com volume).',
    getKeyUrl: 'https://developer.twitter.com/en/portal/dashboard',
    howto: 'Crie app no Twitter Developer Portal → Bearer Token → cole abaixo.',
    configKey: 'xApiKey' as const,
  },
  {
    id: 'knewin', name: 'Knewin (TV, Rádio, Print)', icon: '📡', tier: 'paid' as const,
    desc: 'Clipping completo brasileiro: TV, rádio, impresso, web, redes sociais. A referência nacional.',
    cost: 'Sob consulta. Contato: knewin.com/contato.',
    getKeyUrl: 'https://knewin.com/contato',
    howto: 'Após contratar, solicite credenciais de API ao time Knewin e cole abaixo.',
    configKey: 'knewinApiKey' as const,
  },
  {
    id: 'brand24', name: 'Brand24', icon: '📊', tier: 'paid' as const,
    desc: 'Monitoramento de menções na web e redes sociais com análise de sentimento.',
    cost: '~U$79/mês (Individual). ~U$149/mês (Team).',
    getKeyUrl: 'https://brand24.com',
    howto: 'Após contratar, vá em Configurações → API → copie token de acesso.',
    configKey: 'brand24ApiKey' as const,
  },
];

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

interface ExtendedSearchConfig extends Omit<SearchEngineConfig, 'campaign_id' | 'updatedAt'> {
  youtubeApiKey: string;
  newsApiKey: string;
  serperApiKey: string;
  xApiKey: string;
  knewinApiKey: string;
  brand24ApiKey: string;
  youtubeRateLimit: RateLimitMode;
  newsApiRateLimit: RateLimitMode;
  serperRateLimit: RateLimitMode;
  groqRateLimit: RateLimitMode;
  telegramChannels: string[];
  activeSourceIds: string[];
  monitorTVChannels: string[];
}

const DEFAULT_CONFIG: ExtendedSearchConfig = {
  globalKeywords: [],
  activeEngines: { rss: true, gemini: true, manus: false, tse: true, tre: true, extraAIs: [] },
  geminiModel: 'gemini-1.5-pro',
  geminiGlobalDirective: '',
  manusToken: '',
  treUF: 'RS',
  extraAIs: [],
  youtubeApiKey: '',
  newsApiKey: '',
  serperApiKey: '',
  xApiKey: '',
  knewinApiKey: '',
  brand24ApiKey: '',
  youtubeRateLimit: 'normal',
  newsApiRateLimit: 'normal',
  serperRateLimit: 'normal',
  groqRateLimit: 'normal',
  telegramChannels: [],
  activeSourceIds: ['rss', 'google_news', 'bluesky', 'nitter', 'reddit', 'tse', 'tre', 'dou', 'gemini'],
  monitorTVChannels: Object.values(TV_CHANNELS),
};

// ── Sub-components ──────────────────────────────────────────────

function SectionCard({ title, icon, color, children, defaultOpen = true, badge }: {
  title: string; icon: React.ReactNode; color: string;
  children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center ${color}`}>{icon}</div>
          <span className="font-bold text-slate-200">{title}</span>
          {badge}
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-white/5">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

function MaskedKey({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <input type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "Cole sua chave aqui"}
        className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono" />
      <button onClick={() => setVisible(v => !v)} className="px-3 py-2 rounded-md bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 transition-colors">
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

function TierBadge({ tier }: { tier: 'free' | 'free_key' | 'paid' }) {
  if (tier === 'free') return <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/30">✓ Grátis</span>;
  if (tier === 'free_key') return <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[9px] font-black uppercase border border-sky-500/30">🔑 Grátis c/ Key</span>;
  return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase border border-amber-500/30">$ Pago</span>;
}

// ── Main Component ─────────────────────────────────────────────

export default function SearchEnginesSettings() {
  const { activeCampaign } = useCampaign();
  const campaignId = activeCampaign?.id;

  const [cfg, setCfg] = useState<ExtendedSearchConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // RSS
  const [customFeeds, setCustomFeeds] = useState<RSSFeedConfig[]>([]);
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [addingFeed, setAddingFeed] = useState(false);

  // Gemini
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');

  // TSE
  const [tseElections, setTseElections] = useState<Array<{ id: number; nome: string; ano: number }>>([]);
  const [tseStatus, setTseStatus] = useState<'idle' | 'checking' | 'ok' | 'fail'>('idle');

  // Keywords / Telegram
  const [newKeyword, setNewKeyword] = useState('');
  const [newTgChannel, setNewTgChannel] = useState('');

  // Load config
  useEffect(() => {
    if (!campaignId) return;
    const load = async () => {
      const ref = doc(db, 'search_configs', campaignId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Partial<ExtendedSearchConfig>;
        setCfg(prev => ({ ...prev, ...data }));
      }
      const q = query(collection(db, 'rss_feeds'), where('campaign_id', '==', campaignId));
      const snap2 = await getDocs(q);
      setCustomFeeds(snap2.docs.map(d => ({ id: d.id, ...d.data() } as RSSFeedConfig)));
    };
    load();
  }, [campaignId]);

  const handleSave = useCallback(async () => {
    if (!campaignId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'search_configs', campaignId), { ...cfg, campaign_id: campaignId, updatedAt: serverTimestamp() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }, [cfg, campaignId]);

  const set = <K extends keyof ExtendedSearchConfig>(key: K, val: ExtendedSearchConfig[K]) =>
    setCfg(c => ({ ...c, [key]: val }));

  const setEngine = (key: keyof SearchEngineConfig['activeEngines'], val: boolean) =>
    setCfg(c => ({ ...c, activeEngines: { ...c.activeEngines, [key]: val } }));

  const toggleSource = (id: string) =>
    setCfg(c => ({
      ...c,
      activeSourceIds: c.activeSourceIds.includes(id)
        ? c.activeSourceIds.filter(x => x !== id)
        : [...c.activeSourceIds, id],
    }));

  const setExtraAIKey = (id: string, apiKey: string) => {
    setCfg(c => {
      const catalog = EXTRA_AIS_CATALOG.find(x => x.id === id)!;
      const cur = c.extraAIs.find(x => x.id === id);
      const updated: ExtraAIConfig = cur
        ? { ...cur, apiKey }
        : { id: id as ExtraAIConfig['id'], name: catalog.name, model: catalog.model, freeTier: catalog.freeTier, active: false, apiKey };
      return { ...c, extraAIs: [...c.extraAIs.filter(x => x.id !== id), updated] };
    });
  };

  const getExtraAIKey = (id: string) => cfg.extraAIs.find(x => x.id === id)?.apiKey ?? '';
  const isExtraAIActive = (id: string) => cfg.activeEngines.extraAIs.includes(id);
  const setExtraAIActive = (id: string, active: boolean) => {
    setCfg(c => {
      const cur = c.activeEngines.extraAIs;
      return { ...c, activeEngines: { ...c.activeEngines, extraAIs: active ? [...cur.filter(x => x !== id), id] : cur.filter(x => x !== id) } };
    });
  };

  // RSS
  const handleAddFeed = async () => {
    if (!campaignId || !newFeedName || !newFeedUrl) return;
    setAddingFeed(true);
    try {
      const ref = await addDoc(collection(db, 'rss_feeds'), { campaign_id: campaignId, name: newFeedName, url: newFeedUrl, type: 'news', active: true, createdAt: serverTimestamp() });
      setCustomFeeds(prev => [...prev, { id: ref.id, campaign_id: campaignId, name: newFeedName, url: newFeedUrl, type: 'news', active: true, createdAt: new Date() }]);
      setNewFeedName(''); setNewFeedUrl('');
    } finally { setAddingFeed(false); }
  };

  const handleRemoveFeed = async (id: string) => {
    await deleteDoc(doc(db, 'rss_feeds', id));
    setCustomFeeds(prev => prev.filter(f => f.id !== id));
  };

  if (!activeCampaign) {
    return <div className="flex items-center justify-center py-16 text-slate-500 gap-3"><AlertCircle size={20} /> Selecione uma campanha.</div>;
  }

  const SaveButton = ({ full }: { full?: boolean }) => (
    <button onClick={handleSave} disabled={saving}
      className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors ${full ? 'w-full justify-center shadow-lg shadow-indigo-500/20' : ''}`}>
      {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
      {saved ? 'Salvo!' : 'Salvar Configurações'}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-400">Configure cada fonte de inteligência dos ciclos de monitoramento.</p>
        <SaveButton />
      </div>

      {/* ── Painel de Custo ─────────────────────────────────── */}
      <TokenUsageDashboard />

      {/* ── 1. RSS ──────────────────────────────────────────── */}
      <SectionCard title="RSS / Clipping de Notícias" icon={<Rss size={16} />} color="text-rose-400">
        <div className="flex flex-col gap-4 pt-4">
          <Toggle checked={cfg.activeEngines.rss} onChange={v => setEngine('rss', v)} label="Ativo no monitoramento" />
          <p className="text-xs text-slate-500">Feeds padrão do sistema:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEFAULT_POLITICAL_FEEDS.map(f => (
              <div key={f.name} className="flex items-center gap-2 px-3 py-2 rounded-md bg-black/30 border border-white/5">
                <Rss size={12} className="text-rose-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium truncate">{f.name}</span>
                <span className="ml-auto text-[10px] text-emerald-500 font-bold shrink-0">PADRÃO</span>
              </div>
            ))}
          </div>
          {customFeeds.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-slate-500">Feeds customizados:</p>
              {customFeeds.map(f => (
                <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-black/30 border border-white/5 group">
                  <Rss size={12} className="text-indigo-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 font-medium truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{f.url}</p>
                  </div>
                  <button onClick={() => handleRemoveFeed(f.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-300 transition-all"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="border border-dashed border-white/10 rounded-lg p-4 flex flex-col gap-3 mt-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Plus size={12} /> Adicionar Feed RSS</p>
            <div className="flex gap-2 flex-wrap">
              <input value={newFeedName} onChange={e => setNewFeedName(e.target.value)} placeholder="Nome (ex: GZH)" className="flex-1 min-w-28 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
              <input value={newFeedUrl} onChange={e => setNewFeedUrl(e.target.value)} placeholder="URL do RSS" className="min-w-48 flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
              <button onClick={handleAddFeed} disabled={addingFeed || !newFeedName || !newFeedUrl} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors">
                {addingFeed ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Redes Sociais Gratuitas ───────────────────────── */}
      <SectionCard title="Redes Sociais — Gratuitas (Zero Config)" icon={<MessageCircle size={16} />} color="text-emerald-400"
        badge={<span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/30 ml-2">✓ Já funcionando</span>}>
        <div className="flex flex-col gap-4 pt-4">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex gap-2">
            <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200">Estas fontes funcionam <strong>sem nenhuma API key ou cadastro</strong>. Ativas por padrão.</p>
          </div>

          <div className="flex flex-col gap-3">
            {SOCIAL_FREE_SOURCES.map(src => (
              <div key={src.id} className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{src.icon}</span>
                    <div>
                      <div className="flex items-center gap-2"><span className="font-bold text-slate-200">{src.name}</span><TierBadge tier="free" /></div>
                      <p className="text-xs text-slate-500 mt-0.5">{src.desc}</p>
                    </div>
                  </div>
                  <Toggle checked={cfg.activeSourceIds.includes(src.id)} onChange={() => toggleSource(src.id)} label="Ativo" />
                </div>
                <div className="bg-black/20 rounded-lg px-3 py-2 flex gap-2">
                  <CheckCircle size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500">{src.howto}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Telegram Channels */}
          <div className="border border-sky-500/20 bg-sky-500/5 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-xl">✈️</span>
                <div>
                  <div className="flex items-center gap-2"><span className="font-bold text-slate-200">Telegram (Canais Públicos)</span><TierBadge tier="free" /></div>
                  <p className="text-xs text-slate-500 mt-0.5">Monitora canais públicos do Telegram. Muito usado no interior do RS para política.</p>
                </div>
              </div>
              <Toggle checked={cfg.activeSourceIds.includes('telegram_pub')} onChange={() => toggleSource('telegram_pub')} label="Ativo" />
            </div>
            <p className="text-[10px] text-slate-500">Adicione os @usernames dos canais a monitorar:</p>
            <div className="flex flex-wrap gap-2">
              {cfg.telegramChannels.map(ch => (
                <span key={ch} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
                  @{ch.replace('@','')}
                  <button onClick={() => set('telegramChannels', cfg.telegramChannels.filter(c => c !== ch))} className="text-sky-500 hover:text-rose-400 transition-colors"><XCircle size={11} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newTgChannel} onChange={e => setNewTgChannel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newTgChannel.trim()) { set('telegramChannels', [...cfg.telegramChannels, newTgChannel.trim().replace('@','')]); setNewTgChannel(''); }}}
                placeholder="@camaranoticias ou camaranoticias"
                className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none" />
              <button onClick={() => { if (newTgChannel.trim()) { set('telegramChannels', [...cfg.telegramChannels, newTgChannel.trim().replace('@','')]); setNewTgChannel(''); }}}
                className="flex items-center gap-1 bg-sky-600 hover:bg-sky-500 text-white px-3 py-2 rounded-md text-sm font-bold">
                <Plus size={14} />
              </button>
            </div>
            <div className="bg-black/20 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-500 font-bold mb-1">Sugestões para política gaúcha:</p>
              <div className="flex flex-wrap gap-1.5">
                {['camaranoticias', 'senadofederal', 'agenciabrasil', 'reporterrs', 'correiodopovo'].map(ch => (
                  <button key={ch} onClick={() => !cfg.telegramChannels.includes(ch) && set('telegramChannels', [...cfg.telegramChannels, ch])}
                    className="text-[10px] px-2 py-0.5 rounded bg-black/30 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 border border-white/5 transition-colors">
                    +@{ch}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── 3. Redes Sociais com API Key (Grátis) ───────────── */}
      <SectionCard title="Redes Sociais — Grátis com API Key" icon={<Search size={16} />} color="text-sky-400"
        badge={<span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[9px] font-black uppercase border border-sky-500/30 ml-2">🔑 Key Grátis</span>}
        defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-xs text-slate-500">Gratuitas, mas precisam de uma API Key. Cadastro rápido nos links abaixo.</p>
          {SOCIAL_FREE_KEY_SOURCES.map(src => {
            const keyField = src.configKey;
            const rateField = `${src.id}RateLimit` as keyof ExtendedSearchConfig;
            return (
              <div key={src.id} className="border border-sky-500/20 bg-sky-500/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{src.icon}</span>
                    <div>
                      <div className="flex items-center gap-2"><span className="font-bold text-slate-200">{src.name}</span><TierBadge tier="free_key" /></div>
                      <p className="text-xs text-slate-500 mt-0.5">{src.desc}</p>
                    </div>
                  </div>
                  <Toggle checked={cfg.activeSourceIds.includes(src.id)} onChange={() => toggleSource(src.id)} label="Ativo" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">API Key</label>
                  <MaskedKey value={(cfg[keyField] as string) ?? ''} onChange={v => setCfg(c => ({ ...c, [keyField]: v }))} />
                  <a href={src.getKeyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit">
                    <ExternalLink size={10} /> Obter key grátis em {new URL(src.getKeyUrl).hostname}
                  </a>
                </div>
                {src.dailyLimit && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400">Regime de uso (limite: {src.dailyLimit} {src.unit}/dia)</label>
                    <RateLimitSelector
                      service={src.id}
                      value={(cfg[rateField] as RateLimitMode) ?? 'normal'}
                      onChange={v => setCfg(c => ({ ...c, [rateField]: v }))}
                      dailyLimit={src.dailyLimit}
                      unit={src.unit}
                    />
                  </div>
                )}
                <div className="bg-black/20 rounded-lg px-3 py-2 flex gap-2">
                  <Info size={11} className="text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500">{src.howto}</p>
                </div>

                {/* YouTube: seletor de canais de TV */}
                {src.id === 'youtube' && (
                  <div className="flex flex-col gap-2 mt-1">
                    <label className="text-xs font-semibold text-slate-400 flex items-center gap-2"><Tv size={12} /> Canais de TV para monitorar</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(TV_CHANNELS).map(([name, id]) => (
                        <button key={id} onClick={() => {
                          const cur = cfg.monitorTVChannels;
                          set('monitorTVChannels', cur.includes(id) ? cur.filter(c => c !== id) : [...cur, id]);
                        }}
                          className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${cfg.monitorTVChannels.includes(id) ? 'bg-sky-500/15 border-sky-500/40 text-sky-300' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'}`}>
                          📺 {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* ── 4. Redes Sociais Pagas ───────────────────────────── */}
      <SectionCard title="Redes Sociais — Plataformas Pagas" icon={<Zap size={16} />} color="text-amber-400"
        badge={<span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase border border-amber-500/30 ml-2">$ Pago</span>}
        defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex gap-2">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">Configure quando contratar. Insira a API key para ativar. Enquanto não configuradas, <strong>o sistema usa automaticamente as fontes gratuitas</strong> como alternativa.</p>
          </div>
          {SOCIAL_PAID_SOURCES.map(src => (
            <div key={src.id} className="border border-white/5 bg-black/20 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{src.icon}</span>
                  <div>
                    <div className="flex items-center gap-2"><span className="font-bold text-slate-200">{src.name}</span><TierBadge tier="paid" /></div>
                    <p className="text-xs text-slate-500 mt-0.5">{src.desc}</p>
                    <p className="text-[10px] text-amber-500 mt-1">{src.cost}</p>
                  </div>
                </div>
                <Toggle checked={cfg.activeSourceIds.includes(src.id)} onChange={() => toggleSource(src.id)} label="Ativo" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">API Key / Token</label>
                <MaskedKey value={(cfg[src.configKey] as string) ?? ''} onChange={v => setCfg(c => ({ ...c, [src.configKey]: v }))} />
              </div>
              <div className="bg-black/20 rounded-lg px-3 py-2 flex gap-2">
                <Info size={11} className="text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500">{src.howto}</p>
              </div>
              <a href={src.getKeyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit">
                <ExternalLink size={10} /> {src.getKeyUrl}
              </a>
            </div>
          ))}

          {/* WhatsApp disclaimer */}
          <div className="border border-white/5 bg-black/10 rounded-xl p-4">
            <div className="flex gap-3">
              <span className="text-xl">💬</span>
              <div>
                <p className="font-bold text-slate-400 text-sm">WhatsApp</p>
                <p className="text-xs text-slate-600 mt-1">O WhatsApp <strong>não possui API pública</strong> para monitoramento. A Meta só libera acesso via WhatsApp Business API (paga, para envio) — não para leitura de grupos. Não há workaround gratuito legítimo disponível.</p>
                <p className="text-[10px] text-slate-600 mt-2">Alternativa: use os grupos do Telegram para organizar monitoramento interno da campanha.</p>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ── 5. Gemini ───────────────────────────────────────── */}
      <SectionCard title="Gemini AI (Google)" icon={<Brain size={16} />} color="text-violet-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Toggle checked={cfg.activeEngines.gemini} onChange={v => setEngine('gemini', v)} label="Ativo no monitoramento" />
            <button onClick={async () => { setGeminiStatus('testing'); setGeminiStatus(await testGeminiConnection() ? 'ok' : 'fail'); }}
              className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 px-3 py-2 rounded-lg">
              {geminiStatus === 'testing' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Testar Chave
              {geminiStatus === 'ok' && <CheckCircle size={12} className="text-emerald-400" />}
              {geminiStatus === 'fail' && <XCircle size={12} className="text-rose-400" />}
            </button>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200">Chave configurada em <code className="bg-black/30 px-1 rounded">.env</code> → <code className="bg-black/30 px-1 rounded">VITE_GEMINI_API_KEY</code>. Obtenha gratuitamente em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline text-blue-300">Google AI Studio</a>.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {GEMINI_MODELS.map(m => (
              <button key={m.id} onClick={() => set('geminiModel', m.id)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${cfg.geminiModel === m.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-200">{m.label}</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${cfg.geminiModel === m.id ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{m.badge}</span>
                </div>
                <p className="text-[10px] text-slate-500">{m.desc}</p>
                {cfg.geminiModel === m.id && <CheckCircle size={14} className="text-violet-400 self-end" />}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">Diretriz Global de IA</label>
            <textarea value={cfg.geminiGlobalDirective} onChange={e => set('geminiGlobalDirective', e.target.value)} rows={3}
              placeholder="Ex: O candidato é conservador, focado em segurança pública e interior do RS..."
              className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-violet-500 focus:outline-none resize-none" />
            <p className="text-[10px] text-slate-600">Adicionado ao contexto de TODOS os prompts desta campanha.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── 6. IAs Adicionais ──────────────────────────────── */}
      <SectionCard title="IAs Adicionais" icon={<Bot size={16} />} color="text-emerald-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase border border-emerald-500/30">✓ Com Tier Gratuito</span>
            </div>
            {EXTRA_AIS_CATALOG.filter(ai => ai.freeTier).map(ai => (
              <div key={ai.id} className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200">{ai.name}</span>
                      <TierBadge tier="free" />
                    </div>
                    <p className="text-[10px] text-emerald-400/70 mt-0.5">{ai.freeTierNote}</p>
                  </div>
                  <Toggle checked={isExtraAIActive(ai.id)} onChange={v => setExtraAIActive(ai.id, v)} label="Ativo" />
                </div>
                <p className="text-xs text-slate-500"><span className="text-slate-400 font-semibold">Usos: </span>{ai.useCases}</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">API Key · <code className="text-indigo-400 font-normal">{ai.model}</code></label>
                  <MaskedKey value={getExtraAIKey(ai.id)} onChange={v => setExtraAIKey(ai.id, v)} />
                </div>
                {ai.id === 'groq' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400">Regime de uso (limite: {ai.dailyLimit} req/dia)</label>
                    <RateLimitSelector service="groq" value={cfg.groqRateLimit} onChange={v => set('groqRateLimit', v)} dailyLimit={ai.dailyLimit} unit="req" />
                  </div>
                )}
                <a href={ai.getKeyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit">
                  <ExternalLink size={10} /> Obter em {new URL(ai.getKeyUrl).hostname}
                </a>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 text-[10px] font-black uppercase border border-white/10">$ Somente Pago</span>
            </div>
            {EXTRA_AIS_CATALOG.filter(ai => !ai.freeTier).map(ai => (
              <div key={ai.id} className="border border-white/5 bg-black/20 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-200">{ai.name}</span>
                      <TierBadge tier="paid" />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{(ai as any).paidNote}</p>
                  </div>
                  <Toggle checked={isExtraAIActive(ai.id)} onChange={v => setExtraAIActive(ai.id, v)} label="Ativo" />
                </div>
                <p className="text-xs text-slate-500"><span className="text-slate-400 font-semibold">Usos: </span>{ai.useCases}</p>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-400">API Key · <code className="text-indigo-400 font-normal">{ai.model}</code></label>
                  <MaskedKey value={getExtraAIKey(ai.id)} onChange={v => setExtraAIKey(ai.id, v)} />
                </div>
                <a href={ai.getKeyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit">
                  <ExternalLink size={10} /> {new URL(ai.getKeyUrl).hostname}
                </a>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* ── 7. Manus / TSE / TRE ────────────────────────────── */}
      <SectionCard title="Manus IA (Web Agent)" icon={<Search size={16} />} color="text-indigo-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <Toggle checked={cfg.activeEngines.manus} onChange={v => setEngine('manus', v)} label="Ativo no monitoramento" />
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col gap-2">
            <p className="text-sm font-bold text-amber-400 flex items-center gap-2"><Zap size={14} /> O que é o Manus IA?</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">O Manus é um agente autônomo que <strong>navega na web</strong> por conta própria: pesquisa notícias dinâmicas, perfis de oponentes e acessos que APIs convencionais não alcançam. Está em acesso antecipado via lista de espera.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-300">Token de Acesso Manus</label>
            <MaskedKey value={cfg.manusToken} onChange={v => set('manusToken', v)} />
            <a href="https://manus.ai" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit mt-1"><ExternalLink size={10} /> manus.ai → Configurações → API Access</a>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="TSE (Tribunal Superior Eleitoral)" icon={<Scale size={16} />} color="text-amber-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Toggle checked={cfg.activeEngines.tse} onChange={v => setEngine('tse', v)} label="Buscar TSE no monitoramento" />
            <button onClick={async () => { setTseStatus('checking'); try { setTseElections(await fetchTSEElections()); setTseStatus('ok'); } catch { setTseStatus('fail'); }}}
              className="flex items-center gap-2 text-xs font-bold bg-slate-800 border border-white/5 text-slate-300 px-3 py-2 rounded-lg">
              {tseStatus === 'checking' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Verificar API {tseStatus === 'ok' && <CheckCircle size={12} className="text-emerald-400" />}
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-slate-300">CNPJ vinculado:</p>
            <div className="px-3 py-2 rounded-md bg-black/30 border border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-400 font-mono">{activeCampaign.legalConfig?.cnpj || 'Não configurado'}</span>
              <span className="text-[10px] text-slate-600">Configure na aba Legal</span>
            </div>
          </div>
          {tseElections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tseElections.map(e => <span key={e.id} className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">{e.ano} — {e.nome}</span>)}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="TRE (Tribunal Regional Eleitoral)" icon={<Building2 size={16} />} color="text-sky-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <Toggle checked={cfg.activeEngines.tre} onChange={v => setEngine('tre', v)} label="Buscar TRE no monitoramento" />
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 flex gap-2">
            <Info size={14} className="text-sky-400 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-200">TREs não possuem API pública. O sistema usa <strong>Gemini + Google Search Grounding</strong> para buscar processos e decisões do tribunal selecionado. Requer Gemini ativo.</p>
          </div>
          <div className="flex flex-col gap-2 max-w-xs">
            <label className="text-sm font-semibold text-slate-300">Estado (UF) do TRE</label>
            <select value={cfg.treUF} onChange={e => set('treUF', e.target.value)} className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none">
              {UF_LIST.map(uf => <option key={uf} value={uf}>TRE-{uf}</option>)}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── 8. Keywords Globais ─────────────────────────────── */}
      <SectionCard title="Keywords Globais de Busca" icon={<Tags size={16} />} color="text-teal-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-xs text-slate-500">Termos extras aplicados em todos os mecanismos ativos. Útil para monitorar temas específicos ou rivais não cadastrados.</p>
          <div className="flex gap-2">
            <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newKeyword.trim()) { set('globalKeywords', [...cfg.globalKeywords, newKeyword.trim()]); setNewKeyword(''); }}}
              placeholder="Ex: orçamento 2026, licitação..." className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-teal-500 focus:outline-none" />
            <button onClick={() => { if (newKeyword.trim()) { set('globalKeywords', [...cfg.globalKeywords, newKeyword.trim()]); setNewKeyword(''); }}}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-md text-sm font-bold"><Plus size={14} /></button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-8">
            {cfg.globalKeywords.length === 0
              ? <p className="text-xs text-slate-600 italic">Nenhuma keyword adicionada.</p>
              : cfg.globalKeywords.map(kw => (
                <span key={kw} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
                  {kw}
                  <button onClick={() => set('globalKeywords', cfg.globalKeywords.filter(k => k !== kw))} className="text-teal-500 hover:text-rose-400 transition-colors"><XCircle size={12} /></button>
                </span>
              ))
            }
          </div>
        </div>
      </SectionCard>

      {/* Final save */}
      <div className="pb-6">
        <SaveButton full />
      </div>
    </div>
  );
}
