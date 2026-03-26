import { useState } from 'react';
import { PollsOracle } from '../../components/ui/PollsOracle';
import { useCampaign } from '../../context/CampaignContext';
import { runMonitoringCycle } from '../../services/monitorService';
import { useNewsItems, useLegalItems, useOfficialItems } from '../../hooks/useMonitorFeed';
import { RefreshCw, Newspaper, Scale, BookOpen, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OraclePage() {
  const { activeCampaign } = useCampaign();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'oracle' | 'news' | 'legal'>('oracle');

  const campaignId = activeCampaign?.id ?? '';
  const { items: newsItems,    loading: newsLoading    } = useNewsItems(campaignId, 15);
  const { items: legalItems,   loading: legalLoading   } = useLegalItems(campaignId, 10);
  const { items: officialItems, loading: officialLoading } = useOfficialItems(campaignId, 10);

  const handleSync = async () => {
    if (!activeCampaign || syncing) return;
    setSyncing(true);
    try {
      await runMonitoringCycle(activeCampaign, ['news', 'legal']);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  };

  const tabs = [
    { id: 'oracle', label: 'Oracle',   icon: <BookOpen size={14} /> },
    { id: 'news',   label: `Notícias ${newsItems.length > 0 ? `(${newsItems.length})` : ''}`, icon: <Newspaper size={14} /> },
    { id: 'legal',  label: `Jurídico ${(legalItems.length + officialItems.length) > 0 ? `(${legalItems.length + officialItems.length})` : ''}`, icon: <Scale size={14} /> },
  ] as const;

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Header com botão de sync */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-slate-800/60 border border-white/5 w-full sm:w-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-linear-to-br from-indigo-500 to-indigo-600 text-white shadow-sm'
                  : 'bg-transparent text-slate-400 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleSync}
          disabled={syncing || !activeCampaign}
          className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-indigo-500/30 text-indigo-400 text-sm font-bold transition-all ${
            syncing 
              ? 'bg-indigo-500/10 cursor-default opacity-80' 
              : 'bg-indigo-500/15 hover:bg-indigo-500/20 cursor-pointer'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Atualizando...' : 'Sincronizar Inteligência'}
        </button>
      </div>

      {lastSync && (
        <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
          Última sincronização: {lastSync.toLocaleTimeString('pt-BR')}
        </p>
      )}

      {/* Conteúdo das abas */}
      <AnimatePresence mode="wait">
        {activeTab === 'oracle' && (
          <motion.div key="oracle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PollsOracle />
          </motion.div>
        )}

        {activeTab === 'news' && (
          <motion.div key="news" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {newsLoading ? (
              <div className="h-32 flex items-center justify-center text-slate-500">
                <RefreshCw className="animate-spin mr-2" size={16} /> Carregando notícias...
              </div>
            ) : newsItems.length === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500">
                <Newspaper size={32} className="mx-auto mb-3 opacity-30" />
                <p className="m-0">Nenhuma notícia carregada ainda. Clique em "Sincronizar Inteligência".</p>
              </div>
            ) : (
              newsItems.map(item => (
                <div key={item.id} className="glass-card p-4 flex flex-col gap-2 hover:border-indigo-500/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(99,102,241,0.15)', color: '#818cf8', textTransform: 'uppercase',
                        }}>
                          {item.platform === 'google_news' ? 'Google News' : item.platform}
                        </span>
                        <span style={{ fontSize: 10, color: '#475569' }}>
                          {new Date(item.fetchedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>
                        {item.title}
                      </p>
                      {item.summary && (
                        <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                          {item.summary}
                        </p>
                      )}
                    </div>
                    {item.url && item.url !== '#' && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }}
                        onClick={e => e.stopPropagation()}>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {activeTab === 'legal' && (
          <motion.div key="legal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
            {(legalLoading || officialLoading) ? (
              <div className="h-32 flex items-center justify-center text-slate-500">
                <RefreshCw className="animate-spin mr-2" size={16} /> Carregando dados jurídicos...
              </div>
            ) : (legalItems.length + officialItems.length) === 0 ? (
              <div className="glass-card p-8 text-center text-slate-500">
                <Scale size={32} className="mx-auto mb-3 opacity-30" />
                <p className="m-0">Nenhum dado jurídico/oficial carregado. Clique em "Sincronizar Inteligência".</p>
              </div>
            ) : (
              [...legalItems, ...officialItems]
                .sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())
                .map(item => (
                  <div key={item.id} className="glass-card p-4 flex flex-col gap-2 hover:border-amber-500/20 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: item.type === 'legal' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)',
                            color: item.type === 'legal' ? '#fbbf24' : '#818cf8',
                            textTransform: 'uppercase',
                          }}>
                            {item.platform === 'tse' ? 'TSE' : item.platform === 'tre' ? 'TRE' : item.platform === 'dou' ? 'DOU Federal' : 'DOE-RS'}
                          </span>
                          <span style={{ fontSize: 10, color: '#475569' }}>
                            {new Date(item.fetchedAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>
                          {item.title}
                        </p>
                        {item.summary && (
                          <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>
                            {item.summary}
                          </p>
                        )}
                      </div>
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }}>
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
