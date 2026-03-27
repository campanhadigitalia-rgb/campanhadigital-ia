// ──────────────────────────────────────────────────────────────
//  StatusCards — Painel de status dos mecanismos de busca e
//  canais de saída. Exibe quais estão ativos/inativos em tempo
//  real lendo o Firestore.
// ──────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface StatusItem {
  id: string;
  label: string;
  icon: string;
  tier: 'free' | 'free_key' | 'paid';
}

const SEARCH_ITEMS: StatusItem[] = [
  { id: 'rss',          label: 'RSS/Clipping',        icon: '📰', tier: 'free' },
  { id: 'gemini',       label: 'Gemini AI',           icon: '🧠', tier: 'free' },
  { id: 'bluesky',      label: 'Bluesky',             icon: '🦋', tier: 'free' },
  { id: 'nitter',       label: 'X/Twitter',           icon: '𝕏',  tier: 'free' },
  { id: 'reddit',       label: 'Reddit',              icon: '🤖', tier: 'free' },
  { id: 'telegram_pub', label: 'Telegram',            icon: '✈️', tier: 'free' },
  { id: 'tse',          label: 'TSE',                 icon: '⚖️', tier: 'free' },
  { id: 'tre',          label: 'TRE',                 icon: '🏛️', tier: 'free' },
  { id: 'youtube',      label: 'YouTube/TV',          icon: '📺', tier: 'free_key' },
  { id: 'newsapi',      label: 'NewsAPI',             icon: '🗞️', tier: 'free_key' },
  { id: 'serper',       label: 'Google Search',       icon: '🌐', tier: 'free_key' },
  { id: 'x_paid',       label: 'X API (Pago)',        icon: '𝕏',  tier: 'paid' },
  { id: 'knewin',       label: 'Knewin',              icon: '📡', tier: 'paid' },
  { id: 'brand24',      label: 'Brand24',             icon: '📊', tier: 'paid' },
];

const OUTPUT_ITEMS: StatusItem[] = [
  { id: 'telegram',   label: 'Telegram Bot',        icon: '✈️', tier: 'free' },
  { id: 'email',      label: 'Email (Resend)',       icon: '📧', tier: 'free' },
  { id: 'webhook',    label: 'Webhook',             icon: '🔗', tier: 'free' },
  { id: 'zapi',       label: 'WhatsApp (Z-API)',    icon: '💬', tier: 'paid' },
  { id: 'whatsapp',   label: 'WhatsApp Meta',       icon: '✅', tier: 'paid' },
  { id: 'twilio',     label: 'SMS (Twilio)',        icon: '📱', tier: 'paid' },
];

function TierDot({ tier }: { tier: 'free' | 'free_key' | 'paid' }) {
  if (tier === 'free')     return <span className="text-[8px] text-emerald-400 font-black">GRÁTIS</span>;
  if (tier === 'free_key') return <span className="text-[8px] text-sky-400 font-black">KEY</span>;
  return <span className="text-[8px] text-amber-400 font-black">$</span>;
}

interface StatusCardsProps {
  type: 'search' | 'output';
}

export default function StatusCards({ type }: StatusCardsProps) {
  const { activeCampaign } = useCampaign();
  const campaignId = activeCampaign?.id;
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) { setLoading(false); return; }
    const col = type === 'search' ? 'search_configs' : 'output_configs';
    getDoc(doc(db, col, campaignId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (type === 'search') {
          // activeSourceIds for social sources + boolean flags for engines
          const srcIds: string[] = data.activeSourceIds ?? [];
          const engines: string[] = [];
          if (data.activeEngines?.rss)    engines.push('rss');
          if (data.activeEngines?.gemini) engines.push('gemini');
          if (data.activeEngines?.tse)    engines.push('tse');
          if (data.activeEngines?.tre)    engines.push('tre');
          setActiveIds([...srcIds, ...engines]);
        } else {
          // output: each channel has an Enabled flag
          const ids: string[] = [];
          if (data.telegramEnabled)      ids.push('telegram');
          if (data.emailEnabled)         ids.push('email');
          if (data.webhookEnabled)       ids.push('webhook');
          if (data.zapiEnabled)          ids.push('zapi');
          if (data.whatsappMetaEnabled)  ids.push('whatsapp');
          if (data.twilioEnabled)        ids.push('twilio');
          setActiveIds(ids);
        }
      }
      setLoading(false);
    });
  }, [campaignId, type]);

  const items = type === 'search' ? SEARCH_ITEMS : OUTPUT_ITEMS;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {type === 'search' ? '📡 Status dos Mecanismos de Entrada' : '📤 Status dos Canais de Saída'}
        </p>
        {loading && <Loader2 size={12} className="animate-spin text-slate-500" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const active = activeIds.includes(item.id);
          return (
            <div
              key={item.id}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                active
                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                  : 'bg-slate-800/60 border-white/5 text-slate-600'
              }`}
            >
              <span className="text-[12px]">{item.icon}</span>
              <span className="text-[11px]">{item.label}</span>
              <TierDot tier={item.tier} />
              {active
                ? <CheckCircle size={10} className="text-emerald-400" />
                : <XCircle size={10} className="text-slate-700" />
              }
            </div>
          );
        })}
      </div>
      {!loading && activeIds.length === 0 && (
        <p className="text-[11px] text-slate-600 mt-2 italic">
          Nenhum {type === 'search' ? 'mecanismo' : 'canal'} ativo ainda. Configure abaixo e salve.
        </p>
      )}
    </div>
  );
}
