import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, AlertTriangle, CheckCircle, HelpCircle, Bot, RefreshCw, Rss } from 'lucide-react';
import { generateResponseOptions } from '../../services/aiService';
import { collection, query, where, limit, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { useSocialItems } from '../../hooks/useMonitorFeed';
import { runMonitoringCycle } from '../../services/monitorService';
import type { Mention, Sentiment, AIReply } from '../../types';

// Ícones simplificados para redes sociais
const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'Twitter') return <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-300" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
  if (platform === 'Facebook') return <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-500" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
  return <svg viewBox="0 0 24 24" className="w-4 h-4 text-pink-500" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.88z"/></svg>;
};

const SentimentBadge = ({ type }: { type?: Sentiment }) => {
  switch(type) {
    case 'critico': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-500 uppercase"><AlertTriangle size={10} /> Crítico/Ataque</span>;
    case 'negativo': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 uppercase"><AlertTriangle size={10} /> Negativo</span>;
    case 'positivo': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase"><CheckCircle size={10} /> Positivo</span>;
    case 'neutro': return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/10 border border-slate-500/20 text-slate-400 uppercase"><HelpCircle size={10} /> Neutro</span>;
    default: return <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase"><Bot size={10} /> Analisando IA...</span>;
  }
};

interface SentinelProps {
  onCrisisAlert: (regions: string[], topics: string[]) => void;
}

export function SocialSentinel({ onCrisisAlert }: SentinelProps) {
  const { activeCampaign } = useCampaign();
  const [feed, setFeed] = useState<Mention[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  const [selectedMention, setSelectedMention] = useState<string | null>(null);
  const [generatingReplies, setGeneratingReplies] = useState(false);
  const [replies, setReplies] = useState<Record<string, AIReply[]>>({});

  // Intelligence Hub — monitoring_items (X + Manus)
  const { items: hubItems } = useSocialItems(activeCampaign?.id ?? '', 20);

  const handleSyncSocial = useCallback(async () => {
    if (!activeCampaign || syncing) return;
    setSyncing(true);
    try { await runMonitoringCycle(activeCampaign, ['social']); }
    finally { setSyncing(false); }
  }, [activeCampaign, syncing]);

  useEffect(() => {
    if (!activeCampaign?.id) {
       setLoadingInitial(false);
       setFeed([]);
       return;
    }

    const q = query(
      collection(db, 'social_mentions'),
      where('campaign_id', '==', activeCampaign.id),
      orderBy('timestamp', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setLoadingInitial(false);
      const realFeed = snap.docs.map(doc => {
         const data = doc.data();
         const tstamp = data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp || new Date());
         return {
           id: doc.id,
           platform: data.platform || 'Meta',
           text: data.text || '',
           sentiment: data.sentiment || 'neutro',
           region: data.region || 'Geral',
           topic: data.topic || 'Menção',
           timestamp: tstamp,
         } as Mention;
      });
      setFeed(realFeed);
    });

    return () => unsubscribe();
  }, [activeCampaign?.id]);

  // Mescla feed Firestore legado + monitoring_items do Intelligence Hub
  const mergedFeed: Mention[] = [
    ...feed,
    ...hubItems
      .filter(item => !feed.some(f => f.id === item.id))
      .map(item => ({
        id: item.id,
        platform: item.platform === 'x_rss' || item.platform === 'x_manus' ? 'Twitter'
          : item.platform === 'facebook_manus' ? 'Facebook' : 'Instagram',
        text: item.summary || item.title,
        sentiment: item.sentiment ?? 'neutro',
        region: 'Online',
        topic: 'Monitoramento',
        timestamp: item.fetchedAt instanceof Date ? item.fetchedAt.toISOString() : String(item.fetchedAt),
      } as unknown as Mention)),
  ].slice(0, 40);

  // Monitora % de crises para disparar Alerta no Dashboard Pai
  useEffect(() => {
    const analyzed = feed.filter(f => f.sentiment);
    if (analyzed.length === 0) return;

    // Agrupa por região
    const byRegion: Record<string, { total: number, negatives: number, topics: Set<string> }> = {};
    analyzed.forEach(m => {
      if (!byRegion[m.region]) byRegion[m.region] = { total: 0, negatives: 0, topics: new Set() };
      byRegion[m.region].total++;
      if (m.sentiment === 'negativo' || m.sentiment === 'critico') {
        byRegion[m.region].negatives++;
        byRegion[m.region].topics.add(m.topic);
      }
    });

    const crisisRegions: string[] = [];
    const crisisTopics = new Set<string>();

    for (const [reg, stats] of Object.entries(byRegion)) {
      if (stats.total >= 1 && (stats.negatives / stats.total) >= 0.20) {
        crisisRegions.push(reg);
        stats.topics.forEach(t => crisisTopics.add(t));
      }
    }

    if (crisisRegions.length > 0) {
      onCrisisAlert(crisisRegions, Array.from(crisisTopics));
    } else {
      onCrisisAlert([], []);
    }
  }, [feed, onCrisisAlert]);

  const handleMentionClick = async (m: Mention) => {
    if (m.sentiment !== 'negativo' && m.sentiment !== 'critico') return;
    
    if (selectedMention === m.id) {
      setSelectedMention(null);
      return;
    }
    
    setSelectedMention(m.id);
    if (!replies[m.id]) {
      setGeneratingReplies(true);
      const generated = await generateResponseOptions(m, activeCampaign?.identity);
      setReplies(prev => ({ ...prev, [m.id]: generated }));
      setGeneratingReplies(false);
    }
  };

  if (loadingInitial) {
    return <div className="h-64 flex items-center justify-center text-slate-500"><RefreshCw className="animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 m-0">
            <MessageSquare size={20} className="text-indigo-400" />
            Social Sentinel (Escuta Ativa)
          </h2>
          <p className="text-sm text-slate-400 m-0">
            {mergedFeed.length} menções monitoradas · Análise de sentimento IA em tempo real
          </p>
        </div>
        <button
          onClick={handleSyncSocial}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs md:text-sm font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          {syncing ? <RefreshCw size={12} className="animate-spin" /> : <Rss size={12} />}
          {syncing ? 'Buscando...' : 'Buscar Menções'}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {mergedFeed.length === 0 && !loadingInitial ? (
          <div className="glass-card p-8 text-center text-slate-500">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
            <p className="m-0">Nenhuma menção ainda. Clique em "Buscar Menções" para sincronizar.</p>
          </div>
        ) : (
          mergedFeed.map(m => {
          const isNegative = m.sentiment === 'negativo' || m.sentiment === 'critico';
          const isSelected = selectedMention === m.id;
          const myReplies = replies[m.id];

          return (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card relative overflow-hidden transition-colors ${
                isNegative ? 'hover:border-rose-500/30 cursor-pointer' : 'opacity-80'
              } ${isSelected ? 'border-indigo-500/50 ring-1 ring-indigo-500/50' : 'border-white/5'}`}
              onClick={() => handleMentionClick(m)}
            >
              {isNegative && (
                 <div className="absolute top-0 right-0 p-3 flex gap-2">
                   <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                 </div>
              )}
              
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex shrink-0 items-center justify-center border border-slate-700">
                    <PlatformIcon platform={m.platform} />
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">Cidadão Anônimo</span>
                      <span className="text-[10px] text-slate-500">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <SentimentBadge type={m.sentiment} />
                      <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80"># {m.topic}</span>
                      <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/80">{m.region}</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-200 m-0 leading-relaxed font-medium">
                  "{m.text}"
                </p>
              </div>

              {/* Módulo de Resposta Gerada por IA */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-indigo-500/20 bg-indigo-950/20 overflow-hidden"
                  >
                    <div className="p-4 flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
                        <Bot size={14} /> Respostas Sugeridas (Geração de IA baseada na Persona)
                        {generatingReplies && <RefreshCw size={12} className="animate-spin ml-2" />}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {myReplies?.map((reply, idx) => (
                           <div key={idx} className="bg-slate-900 border border-slate-700 rounded-lg p-3 hover:border-indigo-500/40 transition-colors group cursor-copy">
                             <div className="flex items-center gap-2 mb-2">
                               {reply.persona === 'Conciliador' && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                               {reply.persona === 'Técnico' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                               {reply.persona === 'Firme' && <div className="w-2 h-2 rounded-full bg-rose-400" />}
                               <span className="text-[11px] font-bold text-slate-300 uppercase">{reply.persona}</span>
                             </div>
                             <p className="text-xs text-slate-400 m-0 leading-relaxed group-hover:text-slate-200">
                               {reply.text}
                             </p>
                             <div className="mt-2 text-[10px] text-indigo-400/0 group-hover:text-indigo-400 font-semibold text-right transition-colors">
                               Clique para copiar
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      )}
    </div>
  </div>
);
}
