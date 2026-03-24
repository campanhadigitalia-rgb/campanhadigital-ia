// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — CampaignBadge
//  Exibe badge com campanha ativa e botão para alternar modo
// ──────────────────────────────────────────────────────────────
import { motion, AnimatePresence } from 'framer-motion';
import { History, Zap, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useCampaign } from '../../context/CampaignContext';

export function CampaignBadge() {
  const {
    activeCampaign,
    campaigns,
    viewMode,
    setViewMode,
    selectCampaign,
    historicalYear,
  } = useCampaign();

  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id="campaign-badge-btn"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
        style={{
          background: viewMode === 'active'
            ? 'linear-gradient(135deg, #6366f1, #818cf8)'
            : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
          color: '#fff',
          boxShadow: viewMode === 'active'
            ? '0 0 12px rgba(99,102,241,0.5)'
            : '0 0 12px rgba(245,158,11,0.5)',
        }}
      >
        {viewMode === 'active'
          ? <Zap size={14} />
          : <History size={14} />}
        <span>
          {viewMode === 'active'
            ? (activeCampaign?.name?.replace(/Piratini/gi, 'CampanhaDigitalIA') ?? 'Sem campanha')
            : `Histórico ${historicalYear ?? '—'}`}
        </span>
        <ChevronDown size={14} className={open ? 'rotate-180' : ''} style={{ transition: 'transform 0.2s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 min-w-64 z-[100] bg-slate-900 border border-slate-700 shadow-[0_10px_30px_rgba(0,0,0,0.8)] rounded-xl overflow-hidden"
          >
            <div className="p-2">
              <p className="text-xs uppercase font-semibold px-2 pb-1" style={{ color: '#94a3b8' }}>
                Campanhas Ativas
              </p>
              {campaigns.filter(c => c.active).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { selectCampaign(c.id); setViewMode('active'); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                  style={{ color: activeCampaign?.id === c.id ? '#818cf8' : '#e2e8f0' }}
                >
                  <Zap size={12} />
                  {c.name}
                </button>
              ))}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
