// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
//  CampanhaDigital IA â€” Monitor Geral
//  Feed unificado de todas as fontes com classificaÃ§Ã£o IA,
//  filtros avanÃ§ados, bookmark e aba de Salvos.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Filter, Brain, Bookmark, BookmarkCheck,
  ExternalLink, RefreshCw, Sparkles, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Clock, Tv,
  MessageCircle, Globe, Scale, Rss, Search, X
} from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { useMonitorFeed } from '../../hooks/useMonitorFeed';
import type { MonitoringItem, MonitoringPlatform, MonitoringType } from '../../types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const AI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY ?? '' });

// â”€â”€ Helpers de metadata por plataforma â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PlatformMeta { label: string; icon: React.ReactNode; color: string; category: string }

function getPlatformMeta(platform: MonitoringPlatform, sourceChannel?: string): PlatformMeta {
  const ch = sourceChannel ?? '';
  const map: Partial<Record<MonitoringPlatform, PlatformMeta>> = {
    google_news:     { label: ch || 'Google News',    icon: <Search size={11} />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',   category: 'NotÃ­cias' },
    rss_custom:      { label: ch || 'RSS Feed',        icon: <Rss size={11} />,    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',    category: 'NotÃ­cias' },
    rss_politica:    { label: ch || 'RSS PolÃ­tica',    icon: <Rss size={11} />,    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',    category: 'NotÃ­cias' },
    youtube:         { label: ch || 'YouTube',         icon: <Tv size={11} />,     color: 'text-red-400 bg-red-500/10 border-red-500/20',      category: 'TV' },
    bluesky:         { label: ch || 'Bluesky',         icon: <span className="text-[10px]">ðŸ¦‹</span>, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', category: 'Social' },
    nitter:          { label: ch || 'X / Twitter',     icon: <span className="text-[10px]">ð•</span>, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', category: 'Social' },
    telegram_public: { label: ch || 'Telegram',        icon: <span className="text-[10px]">âœˆï¸</span>, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', category: 'Social' },
    reddit:          { label: ch || 'Reddit',          icon: <span className="text-[10px]">ðŸ¤–</span>, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', category: 'Social' },
    x_rss:           { label: ch || 'X / Twitter',     icon: <span className="text-[10px]">ð•</span>, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', category: 'Social' },
    tse:             { label: 'TSE',                   icon: <Scale size={11} />,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', category: 'JurÃ­dico' },
    tre:             { label: 'TRE',                   icon: <Scale size={11} />,  color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', category: 'JurÃ­dico' },
    dou:             { label: 'D.O. Federal',          icon: <Globe size={11} />,  color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', category: 'Oficial' },
    dou_rs:          { label: 'D.O. RS',               icon: <Globe size={11} />,  color: 'text-violet-400 bg-violet-500/10 border-violet-500/20', category: 'Oficial' },
  };
  return map[platform] ?? { label: ch || String(platform), icon: <Globe size={11} />, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', category: 'Outro' };
}

function ImportanceBadge({ score }: { score?: number }) {
  if (!score) return null;
  const color = score >= 8 ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
    : score >= 5 ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wide ${color}`}>
      {score >= 8 ? 'ðŸ”¥ ' : score >= 5 ? 'âš¡ ' : ''}{score}/10
    </span>
  );
}

function SentimentIcon({ s }: { s?: string }) {
  if (s === 'positive') return <TrendingUp size={13} className="text-emerald-400" />;
  if (s === 'negative') return <TrendingDown size={13} className="text-rose-400" />;
  return <Minus size={13} className="text-slate-500" />;
}

// â”€â”€ ClassificaÃ§Ã£o IA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function classifyBatch(items: MonitoringItem[]): Promise<Map<string, { importance: number; sentiment: 'positive' | 'negative' | 'neutral' }>> {
  const results = new Map<string, { importance: number; sentiment: 'positive' | 'negative' | 'neutral' }>();
  if (!items.length) return results;

  const prompt = `VocÃª Ã© analista polÃ­tico eleitoral. Classifique cada item abaixo com:
- importance: nÃºmero de 1 (irrelevante) a 10 (crÃ­tico para a campanha)
- sentiment: "positive", "negative" ou "neutral" para a campanha

Responda APENAS com JSON vÃ¡lido, array com os mesmos IDs.

Items:
${JSON.stringify(items.slice(0, 20).map(i => ({ id: i.id, title: i.title, summary: i.summary?.slice(0, 150), type: i.type })))}

Resposta (apenas JSON):
[{"id":"...", "importance": N, "sentiment": "..."}]`;

  try {
    const model = _genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const res = await model.generateContent(prompt);
    const text = (await res.response.text()).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text) as Array<{ id: string; importance: number; sentiment: 'positive' | 'negative' | 'neutral' }>;
    for (const p of parsed) results.set(p.id, { importance: p.importance, sentiment: p.sentiment });
  } catch { /* silently fail */ }

  return results;
}

async function saveClassification(id: string, importance: number, sentiment: string) {
  await updateDoc(doc(db, COLLECTIONS.MONITORING_ITEMS, id), {
    importance, aiSentiment: sentiment, aiClassifiedAt: serverTimestamp(), processed: true,
  });
}

async function toggleSaved(id: string, current: boolean) {
  await updateDoc(doc(db, COLLECTIONS.MONITORING_ITEMS, id), {
    saved: !current, savedAt: !current ? serverTimestamp() : null,
  });
}

// â”€â”€ Filter types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type PeriodFilter = 'today' | '7d' | '30d' | 'all';
type CategoryFilter = 'all' | 'NotÃ­cias' | 'TV' | 'Social' | 'JurÃ­dico' | 'Oficial';
type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';
type RelevanceFilter = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'unclassified';

// â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function MonitorGeral() {
  const { activeCampaign } = useCampaign();
  const campaignId = activeCampaign?.id ?? '';

  const { items, loading } = useMonitorFeed({ campaignId, limitCount: 200 });

  // Tabs
  const [activeTab, setActiveTab] = useState<'feed' | 'saved'>('feed');

  // Filters
  const [period, setPeriod]         = useState<PeriodFilter>('7d');
  const [category, setCategory]     = useState<CategoryFilter>('all');
  const [sentiment, setSentiment]   = useState<SentimentFilter>('all');
  const [relevance, setRelevance]   = useState<RelevanceFilter>('all');
  const [search, setSearch]         = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // AI classification
  const [classifying, setClassifying] = useState(false);
  const [classDone, setClassDone]     = useState(0);

  const filterByPeriod = useCallback((item: MonitoringItem): boolean => {
    const ms = Date.now() - new Date(item.fetchedAt).getTime();
    if (period === 'today') return ms < 86400000;
    if (period === '7d')    return ms < 7 * 86400000;
    if (period === '30d')   return ms < 30 * 86400000;
    return true;
  }, [period]);

  const filtered = useMemo(() => {
    let base = activeTab === 'saved' ? items.filter(i => i.saved) : items;
    base = base.filter(filterByPeriod);

    if (category !== 'all') {
      base = base.filter(i => getPlatformMeta(i.platform, i.sourceChannel).category === category);
    }
    if (sentiment !== 'all') base = base.filter(i => i.aiSentiment === sentiment);
    if (relevance === 'critical')     base = base.filter(i => (i.importance ?? 0) >= 8);
    else if (relevance === 'high')    base = base.filter(i => (i.importance ?? 0) >= 6 && (i.importance ?? 0) < 8);
    else if (relevance === 'medium')  base = base.filter(i => (i.importance ?? 0) >= 4 && (i.importance ?? 0) < 6);
    else if (relevance === 'low')     base = base.filter(i => (i.importance ?? 0) > 0 && (i.importance ?? 0) < 4);
    else if (relevance === 'unclassified') base = base.filter(i => !i.importance);

    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter(i => i.title.toLowerCase().includes(q) || (i.summary ?? '').toLowerCase().includes(q));
    }

    return base.sort((a, b) => {
      const ia = a.importance ?? 0, ib = b.importance ?? 0;
      if (ia !== ib) return ib - ia;
      return new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime();
    });
  }, [items, activeTab, filterByPeriod, category, sentiment, relevance, search]);

  const handleClassifyAll = async () => {
    const toClassify = items.filter(i => !i.importance).slice(0, 100);
    if (!toClassify.length) return;
    setClassifying(true); setClassDone(0);
    const map = await classifyBatch(toClassify);
    let done = 0;
    await Promise.allSettled(
      toClassify.map(async item => {
        const r = map.get(item.id);
        if (r) { await saveClassification(item.id, r.importance, r.sentiment); done++; setClassDone(done); }
      })
    );
    setClassifying(false);
  };

  const unclassified = items.filter(i => !i.importance).length;
  const savedCount   = items.filter(i => i.saved).length;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <Radio size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-black text-white text-lg">Monitor Geral</h1>
            <p className="text-xs text-slate-500">{items.length} itens monitorados Â· {savedCount} salvos</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg border transition-colors ${showFilters ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-white/5 text-slate-400 hover:text-slate-200'}`}>
            <Filter size={13} /> Filtros {showFilters ? 'â–²' : 'â–¼'}
          </button>
          {unclassified > 0 && (
            <button onClick={handleClassifyAll} disabled={classifying}
              className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 transition-colors disabled:opacity-60">
              {classifying ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
              {classifying ? `Classificandoâ€¦ ${classDone}` : `Classificar ${unclassified} com IA`}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-slate-800/60 border border-white/5 w-full sm:w-auto">
        {([['feed', `ðŸ“¡ Feed (${filtered.length})`, ''], ['saved', `ðŸ”– Salvos (${savedCount})`, '']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* â”€â”€ Filters Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="glass-card p-4 flex flex-col gap-4">
              {/* Search */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar no feedâ€¦" className="w-full pl-8 pr-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
                  {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X size={13} /></button>}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Period */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">PerÃ­odo</p>
                  <div className="flex flex-col gap-1">
                    {(['today', '7d', '30d', 'all'] as const).map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={`text-left text-xs px-2 py-1 rounded ${period === p ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>
                        {p === 'today' ? 'Hoje' : p === '7d' ? 'Ãšltimos 7 dias' : p === '30d' ? 'Ãšltimos 30 dias' : 'Tudo'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fonte</p>
                  <div className="flex flex-col gap-1">
                    {(['all', 'NotÃ­cias', 'TV', 'Social', 'JurÃ­dico', 'Oficial'] as const).map(c => (
                      <button key={c} onClick={() => setCategory(c)}
                        className={`text-left text-xs px-2 py-1 rounded ${category === c ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>
                        {c === 'all' ? 'Todas as fontes' : c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sentiment */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Sentimento</p>
                  <div className="flex flex-col gap-1">
                    {(['all', 'positive', 'negative', 'neutral'] as const).map(s => (
                      <button key={s} onClick={() => setSentiment(s)}
                        className={`text-left text-xs px-2 py-1 rounded flex items-center gap-1.5 ${sentiment === s ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>
                        {s === 'positive' ? 'ðŸ“ˆ' : s === 'negative' ? 'ðŸ“‰' : s === 'neutral' ? 'âž–' : 'ðŸŽ¯'}
                        {s === 'all' ? 'Todos' : s === 'positive' ? 'Positivo' : s === 'negative' ? 'Negativo' : 'Neutro'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Relevance */}
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">RelevÃ¢ncia (IA)</p>
                  <div className="flex flex-col gap-1">
                    {([
                      ['all', 'ðŸŽ¯ Todas'],
                      ['critical', 'ðŸ”¥ CrÃ­tico (8-10)'],
                      ['high', 'âš¡ Alto (6-7)'],
                      ['medium', 'ðŸ“Œ MÃ©dio (4-5)'],
                      ['low', 'ðŸ”¹ Baixo (1-3)'],
                      ['unclassified', 'â“ NÃ£o classificado'],
                    ] as const).map(([k, l]) => (
                      <button key={k} onClick={() => setRelevance(k as RelevanceFilter)}
                        className={`text-left text-xs px-2 py-1 rounded ${relevance === k ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* â”€â”€ Feed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 gap-3">
          <RefreshCw size={18} className="animate-spin" /> Carregando feedâ€¦
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center justify-center py-16 gap-3">
          <Radio size={36} className="text-slate-700" />
          <p className="text-slate-500 text-sm">{activeTab === 'saved' ? 'Nenhum item salvo ainda.' : 'Nenhum item com os filtros selecionados.'}</p>
          {activeTab === 'saved' && <p className="text-[11px] text-slate-600">Salve itens clicando em ðŸ”– no feed.</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(item => <MonitorCard key={item.id} item={item} />)}
        </div>
      )}
    </div>
  );
}

// â”€â”€ Item Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MonitorCard({ item }: { item: MonitoringItem }) {
  const [saving, setSaving] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState(item.savedNotes ?? '');

  const meta = getPlatformMeta(item.platform, item.sourceChannel);

  const handleBookmark = async () => {
    setSaving(true);
    await toggleSaved(item.id, !!item.saved);
    setSaving(false);
  };

  const saveNote = async () => {
    await updateDoc(doc(db, COLLECTIONS.MONITORING_ITEMS, item.id), { savedNotes: note });
    setNoteOpen(false);
  };

  const timeAgo = (d: Date) => {
    const ms = Date.now() - new Date(d).getTime();
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m atrÃ¡s`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)}h atrÃ¡s`;
    return new Date(d).toLocaleDateString('pt-BR');
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className={`glass-card p-4 flex flex-col gap-2.5 hover:border-white/10 transition-colors ${item.saved ? 'border-indigo-500/20' : ''}`}>
      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>
        <span className="text-[10px] text-slate-600 flex items-center gap-1">
          <Clock size={9} /> {timeAgo(item.fetchedAt)}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <SentimentIcon s={item.aiSentiment} />
          <ImportanceBadge score={item.importance} />
          {item.saved && <span className="text-[9px] text-indigo-400 font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">ðŸ”– Salvo</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-200 leading-snug line-clamp-2">{item.title}</p>
          {item.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{item.summary}</p>}
        </div>
      </div>

      {/* Note (if saved) */}
      {item.savedNotes && !noteOpen && (
        <div className="px-3 py-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
          <p className="text-[10px] text-indigo-300 italic">ðŸ“ {item.savedNotes}</p>
        </div>
      )}
      {noteOpen && (
        <div className="flex flex-col gap-2">
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Adicione uma notaâ€¦"
            className="px-3 py-2 rounded-lg bg-black/30 border border-slate-700 text-white text-xs focus:border-indigo-500 focus:outline-none resize-none" />
          <div className="flex gap-2">
            <button onClick={saveNote} className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold">Salvar nota</button>
            <button onClick={() => setNoteOpen(false)} className="text-xs px-3 py-1 rounded bg-slate-700 text-slate-400">Cancelar</button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <button onClick={handleBookmark} disabled={saving}
          className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
            item.saved ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'}`}>
          {item.saved ? <BookmarkCheck size={11} /> : <Bookmark size={11} />}
          {item.saved ? 'Salvo' : 'Salvar'}
        </button>
        {item.saved && (
          <button onClick={() => setNoteOpen(o => !o)}
            className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-white/5 bg-black/20 text-slate-500 hover:text-slate-300 transition-colors">
            ðŸ“ Nota
          </button>
        )}
        {item.url && (
          <a href={item.url} target="_blank" rel="noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] text-slate-600 hover:text-indigo-400 transition-colors">
            <ExternalLink size={11} /> Ver fonte
          </a>
        )}
        {!item.importance && (
          <span className="text-[9px] text-slate-600 flex items-center gap-1 ml-auto">
            <AlertTriangle size={9} /> Sem classificaÃ§Ã£o IA
          </span>
        )}
      </div>
    </motion.div>
  );
}


