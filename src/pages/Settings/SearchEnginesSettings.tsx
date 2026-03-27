// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Search Engines Settings
//  Configuração completa dos mecanismos de busca e inteligência
// ──────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Rss, Brain, Search, Scale, Building2, Bot, Tags,
  Plus, Trash2, Save, CheckCircle, XCircle, Loader2,
  Eye, EyeOff, ChevronDown, ChevronUp, ExternalLink,
  Zap, Info, AlertCircle, RefreshCcw
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
import type { RSSFeedConfig, SearchEngineConfig, ExtraAIConfig } from '../../types';

// ── Constantes ────────────────────────────────────────────────

const GEMINI_MODELS = [
  { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   desc: 'Mais preciso, ideal para análises políticas complexas. Custo médio.',  badge: 'Recomendado' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Ultra-rápido e econômico. Ótimo para monitoramento em tempo real.', badge: 'Mais rápido' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'Equilíbrio entre velocidade e qualidade. Boa opção geral.',           badge: 'Econômico' },
];

const EXTRA_AIS_CATALOG: (Omit<ExtraAIConfig, 'apiKey' | 'active'> & { 
  getKeyUrl: string; 
  useCases: string; 
  paidNote?: string;
})[] = [
  {
    id: 'groq',
    name: 'Groq (LLaMA 3)',
    model: 'llama-3.1-70b-versatile',
    freeTier: true,
    freeTierNote: 'Plano gratuito generoso: 14.400 req/dia. Ideal para uso intenso de monitoramento.',
    getKeyUrl: 'https://console.groq.com/keys',
    useCases: 'Análise de sentimentos em lote, resumo rápido de notícias, backup do Gemini.',
  },
  {
    id: 'perplexity',
    name: 'Perplexity AI',
    model: 'llama-3.1-sonar-small-128k-online',
    freeTier: true,
    freeTierNote: 'Trial gratuito disponível. API paga a partir de $0.20 / 1M tokens após trial.',
    getKeyUrl: 'https://www.perplexity.ai/settings/api',
    useCases: 'Busca na web em tempo real com fontes citadas. Ótimo substituto do Manus para web search.',
  },
  {
    id: 'openai',
    name: 'OpenAI GPT-4o',
    model: 'gpt-4o-mini',
    freeTier: false,
    paidNote: 'Somente plano pago. GPT-4o Mini é o mais acessível a partir de $0.15 / 1M tokens.',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    useCases: 'Alternativa premium, excelente em geração de conteúdo e análise jurídica estruturada.',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    model: 'claude-3-haiku-20240307',
    freeTier: false,
    paidNote: 'Somente plano pago. Claude Haiku é o modelo mais econômico ($0.25 / 1M tokens).',
    getKeyUrl: 'https://console.anthropic.com/keys',
    useCases: 'Excepcional para documentos longos, leis e resoluções. Ótimo para análise do Diário Oficial.',
  },
];

const UF_LIST = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO'
];

const DEFAULT_CONFIG: Omit<SearchEngineConfig, 'campaign_id' | 'updatedAt'> = {
  globalKeywords: [],
  activeEngines: { rss: true, gemini: true, manus: false, tse: true, tre: true, extraAIs: [] },
  geminiModel: 'gemini-1.5-pro',
  geminiGlobalDirective: '',
  manusToken: '',
  treUF: 'RS',
  extraAIs: [],
};

// ── Sub-components ─────────────────────────────────────────────

function SectionCard({ title, icon, color, children, defaultOpen = true }: {
  title: string; icon: React.ReactNode; color: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center ${color}`}>
            {icon}
          </div>
          <span className="font-bold text-slate-200">{title}</span>
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
      <div
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

function MaskedKey({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="sk-... ou cole sua chave aqui"
        className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
      />
      <button
        onClick={() => setVisible(v => !v)}
        className="px-3 py-2 rounded-md bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200 transition-colors"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function SearchEnginesSettings() {
  const { activeCampaign } = useCampaign();
  const campaignId = activeCampaign?.id;

  const [config, setConfig] = useState<Omit<SearchEngineConfig, 'campaign_id' | 'updatedAt'>>(DEFAULT_CONFIG);
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

  // Keywords
  const [newKeyword, setNewKeyword] = useState('');

  // ── Load config from Firestore ─────────────────────────────
  useEffect(() => {
    if (!campaignId) return;
    const load = async () => {
      const ref = doc(db, 'search_configs', campaignId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as SearchEngineConfig;
        setConfig({
          globalKeywords: data.globalKeywords ?? [],
          activeEngines: data.activeEngines ?? DEFAULT_CONFIG.activeEngines,
          geminiModel: data.geminiModel ?? 'gemini-1.5-pro',
          geminiGlobalDirective: data.geminiGlobalDirective ?? '',
          manusToken: data.manusToken ?? '',
          treUF: data.treUF ?? 'RS',
          extraAIs: data.extraAIs ?? [],
        });
      }
      // Load custom RSS feeds
      const q = query(collection(db, 'rss_feeds'), where('campaign_id', '==', campaignId));
      const snap2 = await getDocs(q);
      setCustomFeeds(snap2.docs.map(d => ({ id: d.id, ...d.data() } as RSSFeedConfig)));
    };
    load();
  }, [campaignId]);

  // ── Save config ────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!campaignId) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'search_configs', campaignId), {
        ...config,
        campaign_id: campaignId,
        updatedAt: serverTimestamp(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [config, campaignId]);

  // Helpers
  const setEngine = (key: keyof SearchEngineConfig['activeEngines'], val: boolean) =>
    setConfig(c => ({ ...c, activeEngines: { ...c.activeEngines, [key]: val } }));

  const setExtraAIActive = (id: string, active: boolean) => {
    setConfig(c => {
      const cur = c.activeEngines.extraAIs;
      const next = active ? [...cur.filter(x => x !== id), id] : cur.filter(x => x !== id);
      return { ...c, activeEngines: { ...c.activeEngines, extraAIs: next } };
    });
  };

  const setExtraAIKey = (id: string, apiKey: string) => {
    setConfig(c => {
      const cur = c.extraAIs.find(x => x.id === id);
      const catalog = EXTRA_AIS_CATALOG.find(x => x.id === id)!;
      const updated: ExtraAIConfig = cur
        ? { ...cur, apiKey }
        : { id: id as ExtraAIConfig['id'], name: catalog.name, model: catalog.model, freeTier: catalog.freeTier, freeTierNote: catalog.freeTierNote, active: false, apiKey };
      return { ...c, extraAIs: [...c.extraAIs.filter(x => x.id !== id), updated] };
    });
  };

  const getExtraAI = (id: string) => config.extraAIs.find(x => x.id === id);

  // ── Gemini Test ────────────────────────────────────────────
  const testGemini = async () => {
    setGeminiStatus('testing');
    const ok = await testGeminiConnection();
    setGeminiStatus(ok ? 'ok' : 'fail');
  };

  // ── TSE Health Check ───────────────────────────────────────
  const checkTSE = async () => {
    setTseStatus('checking');
    try {
      const elections = await fetchTSEElections();
      setTseElections(elections);
      setTseStatus('ok');
    } catch {
      setTseStatus('fail');
    }
  };

  // ── RSS CRUD ───────────────────────────────────────────────
  const handleAddFeed = async () => {
    if (!campaignId || !newFeedName || !newFeedUrl) return;
    setAddingFeed(true);
    try {
      const docRef = await addDoc(collection(db, 'rss_feeds'), {
        campaign_id: campaignId,
        name: newFeedName,
        url: newFeedUrl,
        type: 'news',
        active: true,
        createdAt: serverTimestamp(),
      });
      setCustomFeeds(prev => [...prev, { id: docRef.id, campaign_id: campaignId, name: newFeedName, url: newFeedUrl, type: 'news', active: true, createdAt: new Date() }]);
      setNewFeedName('');
      setNewFeedUrl('');
    } finally {
      setAddingFeed(false);
    }
  };

  const handleRemoveFeed = async (feedId: string) => {
    await deleteDoc(doc(db, 'rss_feeds', feedId));
    setCustomFeeds(prev => prev.filter(f => f.id !== feedId));
  };

  const addKeyword = () => {
    const kw = newKeyword.trim();
    if (!kw || config.globalKeywords.includes(kw)) return;
    setConfig(c => ({ ...c, globalKeywords: [...c.globalKeywords, kw] }));
    setNewKeyword('');
  };

  const removeKeyword = (kw: string) =>
    setConfig(c => ({ ...c, globalKeywords: c.globalKeywords.filter(k => k !== kw) }));

  if (!activeCampaign) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
        <AlertCircle size={20} /> Selecione uma campanha para configurar os mecanismos de busca.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header + Save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-slate-400 mt-1">Configure cada fonte de inteligência usada nos ciclos de monitoramento.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Salvo!' : 'Salvar Configurações'}
        </button>
      </div>

      {/* ── 1. RSS ───────────────────────────────────────────── */}
      <SectionCard title="RSS / Clipping de Notícias" icon={<Rss size={16} />} color="text-rose-400">
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between">
            <Toggle checked={config.activeEngines.rss} onChange={v => setEngine('rss', v)} label="Ativo nos ciclos de monitoramento" />
          </div>

          <p className="text-xs text-slate-500">Feeds padrão do sistema (sempre disponíveis, não podem ser removidos):</p>
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
            <>
              <p className="text-xs text-slate-500 mt-2">Feeds customizados:</p>
              <div className="flex flex-col gap-2">
                {customFeeds.map(f => (
                  <div key={f.id} className="flex items-center gap-3 px-3 py-2 rounded-md bg-black/30 border border-white/5 group">
                    <Rss size={12} className="text-indigo-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 font-medium truncate">{f.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{f.url}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFeed(f.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-300 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="border border-dashed border-white/10 rounded-lg p-4 flex flex-col gap-3 mt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Plus size={12} /> Adicionar Feed RSS</p>
            <div className="flex gap-2 flex-wrap">
              <input
                value={newFeedName}
                onChange={e => setNewFeedName(e.target.value)}
                placeholder="Nome do Feed (ex: GZH)"
                className="flex-1 min-w-32 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
              <input
                value={newFeedUrl}
                onChange={e => setNewFeedUrl(e.target.value)}
                placeholder="URL do RSS (ex: https://...)"
                className="min-w-48 flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={handleAddFeed}
                disabled={addingFeed || !newFeedName || !newFeedUrl}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors"
              >
                {addingFeed ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Adicionar
              </button>
            </div>
            <p className="text-[10px] text-slate-600">Cole a URL direta do arquivo RSS/XML. O sistema usa proxy CORS para contornar bloqueios de navegador.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── 2. Gemini ─────────────────────────────────────────── */}
      <SectionCard title="Gemini AI (Google)" icon={<Brain size={16} />} color="text-violet-400">
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Toggle checked={config.activeEngines.gemini} onChange={v => setEngine('gemini', v)} label="Ativo nos ciclos de monitoramento" />
            <button
              onClick={testGemini}
              disabled={geminiStatus === 'testing'}
              className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 px-3 py-2 rounded-lg transition-colors"
            >
              {geminiStatus === 'testing' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Testar Conexão
              {geminiStatus === 'ok' && <CheckCircle size={12} className="text-emerald-400" />}
              {geminiStatus === 'fail' && <XCircle size={12} className="text-rose-400" />}
            </button>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex gap-2">
            <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200">
              A chave de API do Gemini é configurada no arquivo <code className="bg-black/30 px-1 rounded">.env</code> como <code className="bg-black/30 px-1 rounded">VITE_GEMINI_API_KEY</code>. Para obter uma chave gratuita, acesse{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="underline text-blue-300 hover:text-white">Google AI Studio</a>.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">Modelo Preferido</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {GEMINI_MODELS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setConfig(c => ({ ...c, geminiModel: m.id }))}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col gap-2 ${config.geminiModel === m.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-200">{m.label}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${config.geminiModel === m.id ? 'bg-violet-600 text-white' : 'bg-slate-700 text-slate-400'}`}>{m.badge}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{m.desc}</p>
                  {config.geminiModel === m.id && <CheckCircle size={14} className="text-violet-400 self-end" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">Diretriz Global de IA <span className="text-slate-500 font-normal text-xs">(opcional)</span></label>
            <textarea
              value={config.geminiGlobalDirective}
              onChange={e => setConfig(c => ({ ...c, geminiGlobalDirective: e.target.value }))}
              rows={3}
              placeholder="Ex: Sempre responda focado no contexto político do interior do RS. O candidato é conservador e pragmático..."
              className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-violet-500 focus:outline-none resize-none"
            />
            <p className="text-[10px] text-slate-600">Este texto é adicionado ao contexto de TODOS os prompts enviados ao Gemini nesta campanha.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── 3. Manus IA ───────────────────────────────────────── */}
      <SectionCard title="Manus IA (Web Agent)" icon={<Search size={16} />} color="text-indigo-400">
        <div className="flex flex-col gap-4 pt-4">
          <Toggle checked={config.activeEngines.manus} onChange={v => setEngine('manus', v)} label="Ativo nos ciclos de monitoramento" />

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col gap-2">
            <p className="text-sm font-bold text-amber-400 flex items-center gap-2"><Zap size={14} /> O que é o Manus IA?</p>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              O Manus é um agente autônomo de IA capaz de <strong>navegar na web</strong>, pesquisar notícias recentes, monitorar perfis de oponentes e acessar informações dinâmicas que APIs convencionais não alcançam. É diferente do Gemini, que processa dados enviados a ele — o Manus <em>age</em> ativamente na internet.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-slate-300">Token de Acesso Manus</label>
            <MaskedKey value={config.manusToken} onChange={v => setConfig(c => ({ ...c, manusToken: v }))} />
            <p className="text-[10px] text-slate-600">
              Obtenha seu token em{' '}
              <a href="https://manus.ai" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">manus.ai</a>{' '}
              → Configurações → API Access. O Manus atualmente está em acesso por convite/lista de espera.
            </p>
          </div>

          <div className="bg-slate-800/50 border border-white/5 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Como o sistema usa o Manus</p>
            <ul className="space-y-1.5">
              {[
                'Monitoramento de perfis de oponentes em redes sociais',
                'Busca de notícias não indexadas por feeds RSS',
                'Pesquisa de processo em diários estaduais sem API',
                'Coleta de dados de pesquisas eleitorais publicadas online',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-500">
                  <CheckCircle size={12} className="text-indigo-400 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* ── 4. TSE ────────────────────────────────────────────── */}
      <SectionCard title="TSE (Tribunal Superior Eleitoral)" icon={<Scale size={16} />} color="text-amber-400">
        <div className="flex flex-col gap-4 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Toggle checked={config.activeEngines.tse} onChange={v => setEngine('tse', v)} label="Buscar TSE no ciclo de monitoramento" />
            <button
              onClick={checkTSE}
              disabled={tseStatus === 'checking'}
              className="flex items-center gap-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 px-3 py-2 rounded-lg transition-colors"
            >
              {tseStatus === 'checking' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
              Verificar API
              {tseStatus === 'ok' && <CheckCircle size={12} className="text-emerald-400" />}
              {tseStatus === 'fail' && <XCircle size={12} className="text-rose-400" />}
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex flex-col gap-2">
            <p className="text-sm font-bold text-amber-400 flex items-center gap-2"><Info size={14} /> O que é consultado no TSE</p>
            <ul className="space-y-1 mt-1">
              {[
                'Situação da candidatura (Deferido / Indeferido / Em julgamento)',
                'Prestação de contas via DivulgaCandContas',
                'Dados oficiais do candidato: cargo, partido, número eleitoral',
                'Publicações no Diário Oficial Federal (DOU S1, S3 e Extra)',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-400">
                  <CheckCircle size={11} className="text-amber-400 shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-slate-300">CNPJ da Campanha (vinculado)</p>
            <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-black/30 border border-slate-700">
              <span className="text-sm text-slate-400 flex-1 font-mono">
                {activeCampaign.legalConfig?.cnpj || 'Não configurado'}
              </span>
              <span className="text-[10px] text-slate-600">Configure na aba Legal</span>
            </div>
            {!activeCampaign.legalConfig?.cnpj && (
              <p className="text-[10px] text-amber-500 flex items-center gap-1"><AlertCircle size={10} /> O CNPJ é necessário para busca completa no TSE.</p>
            )}
          </div>

          {tseElections.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Eleições disponíveis na API TSE</p>
              <div className="flex flex-wrap gap-2">
                {tseElections.map(e => (
                  <span key={e.id} className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 font-medium">
                    {e.ano} — {e.nome}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── 5. TRE ────────────────────────────────────────────── */}
      <SectionCard title="TRE (Tribunal Regional Eleitoral)" icon={<Building2 size={16} />} color="text-sky-400">
        <div className="flex flex-col gap-4 pt-4">
          <Toggle checked={config.activeEngines.tre} onChange={v => setEngine('tre', v)} label="Buscar TRE no ciclo de monitoramento" />

          <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-4 flex flex-col gap-2">
            <p className="text-sm font-bold text-sky-400 flex items-center gap-2"><Info size={14} /> Como funciona a busca TRE</p>
            <p className="text-xs text-sky-200/80 leading-relaxed">
              Os TREs estaduais <strong>não possuem API pública</strong>. O sistema utiliza o <strong>Gemini com Google Search Grounding</strong> — a IA pesquisa ativamente no Google por processos, decisões e notícias do TRE do estado selecionado envolvendo o candidato, retornando resultados com fontes citáveis.
            </p>
            <p className="text-xs text-sky-400/70 mt-1 flex items-center gap-1">
              <AlertCircle size={11} /> Requer Gemini ativo e com cota disponível.
            </p>
          </div>

          <div className="flex flex-col gap-2 max-w-xs">
            <label className="text-sm font-semibold text-slate-300">Estado (UF) do TRE</label>
            <select
              value={config.treUF}
              onChange={e => setConfig(c => ({ ...c, treUF: e.target.value }))}
              className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-sky-500 focus:outline-none"
            >
              {UF_LIST.map(uf => (
                <option key={uf} value={uf}>TRE-{uf}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-600">A busca incluirá "TRE-{config.treUF}" + nome do candidato nos termos pesquisados.</p>
          </div>
        </div>
      </SectionCard>

      {/* ── 6. IAs Adicionais ─────────────────────────────────── */}
      <SectionCard title="IAs Adicionais" icon={<Bot size={16} />} color="text-emerald-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-xs text-slate-500">Configure IAs compl­ementares para análise e busca. Elas podem atuar como backup ou complemento ao Gemini.</p>

          {/* FREE TIER SECTION */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wide border border-emerald-500/30">
                ✓ Com API Gratuita
              </span>
            </div>

            {EXTRA_AIS_CATALOG.filter(ai => ai.freeTier).map(ai => {
              const saved = getExtraAI(ai.id);
              const isActive = config.activeEngines.extraAIs.includes(ai.id);
              return (
                <div key={ai.id} className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200">{ai.name}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/30">
                          Free Tier
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-400/70 mt-0.5">{ai.freeTierNote}</p>
                    </div>
                    <Toggle checked={isActive} onChange={v => setExtraAIActive(ai.id, v)} label="Ativo" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed"><span className="text-slate-400 font-semibold">Usos: </span>{ai.useCases}</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-400">API Key <span className="text-slate-600 font-normal">· Modelo padrão: <code className="text-indigo-400">{ai.model}</code></span></label>
                    <MaskedKey value={saved?.apiKey ?? ''} onChange={v => setExtraAIKey(ai.id, v)} />
                  </div>
                  <a href={ai.getKeyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit">
                    <ExternalLink size={10} /> Obter chave em {new URL(ai.getKeyUrl).hostname}
                  </a>
                </div>
              );
            })}
          </div>

          {/* PAID SECTION */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400 text-[10px] font-black uppercase tracking-wide border border-white/10">
                $ Somente Pago
              </span>
            </div>

            {EXTRA_AIS_CATALOG.filter(ai => !ai.freeTier).map(ai => {
              const saved = getExtraAI(ai.id);
              const isActive = config.activeEngines.extraAIs.includes(ai.id);
              return (
                <div key={ai.id} className="border border-white/5 bg-black/20 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-200">{ai.name}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400 text-[9px] font-black uppercase border border-white/10">
                          Pago
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{ai.paidNote}</p>
                    </div>
                    <Toggle checked={isActive} onChange={v => setExtraAIActive(ai.id, v)} label="Ativo" />
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed"><span className="text-slate-400 font-semibold">Usos: </span>{ai.useCases}</p>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-400">API Key <span className="text-slate-600 font-normal">· Modelo padrão: <code className="text-indigo-400">{ai.model}</code></span></label>
                    <MaskedKey value={saved?.apiKey ?? ''} onChange={v => setExtraAIKey(ai.id, v)} />
                  </div>
                  <a href={ai.getKeyUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 w-fit">
                    <ExternalLink size={10} /> Obter chave em {new URL(ai.getKeyUrl).hostname}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* ── 7. Keywords Globais ───────────────────────────────── */}
      <SectionCard title="Keywords Globais de Busca" icon={<Tags size={16} />} color="text-teal-400" defaultOpen={false}>
        <div className="flex flex-col gap-4 pt-4">
          <p className="text-xs text-slate-500">
            Termos extras que serão incluídos nas buscas de <strong>todos os mecanismos selecionados</strong>. Útil para monitorar temas, rivais não cadastrados, ou palavras-chave estratégicas.
          </p>

          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addKeyword()}
              placeholder="Ex: orçamento 2026, licitação, rival fulano..."
              className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-teal-500 focus:outline-none"
            />
            <button
              onClick={addKeyword}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-md text-sm font-bold transition-colors"
            >
              <Plus size={14} /> Adicionar
            </button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-10">
            {config.globalKeywords.length === 0 ? (
              <p className="text-xs text-slate-600 italic">Nenhuma keyword adicionada. Use o campo acima para adicionar.</p>
            ) : (
              config.globalKeywords.map(kw => (
                <span key={kw} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-medium">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="text-teal-500 hover:text-rose-400 transition-colors">
                    <XCircle size={12} />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aplicar keywords em:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { key: 'rss' as const, label: 'RSS / Clipping', color: 'rose' },
                { key: 'gemini' as const, label: 'Gemini AI', color: 'violet' },
                { key: 'manus' as const, label: 'Manus IA', color: 'indigo' },
                { key: 'tse' as const, label: 'TSE', color: 'amber' },
                { key: 'tre' as const, label: 'TRE', color: 'sky' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={config.activeEngines[key]}
                    onChange={e => setEngine(key, e.target.checked)}
                    className="accent-indigo-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Bottom save reminder */}
      <div className="flex justify-end pt-2 pb-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-6 py-3 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-indigo-500/20"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
          {saved ? 'Configurações Salvas!' : 'Salvar Todas as Configurações'}
        </button>
      </div>
    </div>
  );
}
