// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Search Engine Selector
//  Componente reutilizável para selecionar fontes de busca
//  em qualquer card/feature que use monitoramento ativo.
// ──────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';

export type SearchEngineId =
  | 'rss' | 'google_news' | 'gemini' | 'manus'
  | 'tse' | 'tre' | 'dou'
  | 'bluesky' | 'nitter' | 'telegram_pub' | 'reddit'
  | 'youtube' | 'newsapi' | 'serper'
  | 'x_paid' | 'knewin' | 'brand24';

export interface EngineOption {
  id: SearchEngineId;
  label: string;
  icon: string;
  tier: 'free' | 'free_key' | 'paid';
  category: 'news' | 'social' | 'legal' | 'web';
}

export const ALL_ENGINES: EngineOption[] = [
  // Notícias
  { id: 'rss',         label: 'RSS Feeds',       icon: '📰', tier: 'free',     category: 'news' },
  { id: 'google_news', label: 'Google News',      icon: '🔍', tier: 'free',     category: 'news' },
  { id: 'newsapi',     label: 'NewsAPI',          icon: '🗞️',  tier: 'free_key', category: 'news' },
  { id: 'youtube',     label: 'YouTube / TV',     icon: '📺', tier: 'free_key', category: 'news' },
  // Social gratuita
  { id: 'bluesky',     label: 'Bluesky',          icon: '🦋', tier: 'free',     category: 'social' },
  { id: 'nitter',      label: 'X / Twitter',      icon: '𝕏',  tier: 'free',     category: 'social' },
  { id: 'telegram_pub',label: 'Telegram',         icon: '✈️', tier: 'free',     category: 'social' },
  { id: 'reddit',      label: 'Reddit',           icon: '🤖', tier: 'free',     category: 'social' },
  // Social paga
  { id: 'x_paid',      label: 'X API (pago)',     icon: '𝕏',  tier: 'paid',     category: 'social' },
  { id: 'knewin',      label: 'Knewin (TV/Rádio)',icon: '📡', tier: 'paid',     category: 'social' },
  { id: 'brand24',     label: 'Brand24',          icon: '📊', tier: 'paid',     category: 'social' },
  // IA / Web
  { id: 'gemini',      label: 'Gemini AI',        icon: '🔮', tier: 'free',     category: 'web' },
  { id: 'serper',      label: 'Serper (Google)',  icon: '🌐', tier: 'free_key', category: 'web' },
  { id: 'manus',       label: 'Manus IA',         icon: '🤖', tier: 'paid',     category: 'web' },
  // Jurídico
  { id: 'tse',         label: 'TSE',              icon: '⚖️', tier: 'free',     category: 'legal' },
  { id: 'tre',         label: 'TRE',              icon: '🏛️', tier: 'free',     category: 'legal' },
  { id: 'dou',         label: 'Diário Oficial',   icon: '📋', tier: 'free',     category: 'legal' },
];

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  free:     { label: 'Grátis',  cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  free_key: { label: 'API Key', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  paid:     { label: 'Pago',    cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
};

const CATEGORY_LABELS: Record<string, string> = {
  news: '📰 Notícias',
  social: '💬 Redes Sociais',
  web: '🌐 Web / IA',
  legal: '⚖️ Jurídico',
};

interface Props {
  value: SearchEngineId[];
  onChange: (engines: SearchEngineId[]) => void;
  /** Apenas exibir engines que estejam neste array */
  availableEngines?: SearchEngineId[];
  compact?: boolean;
}

export default function SearchEngineSelector({ value, onChange, availableEngines, compact = false }: Props) {
  const [open, setOpen] = useState(!compact);

  const visible = availableEngines
    ? ALL_ENGINES.filter(e => availableEngines.includes(e.id))
    : ALL_ENGINES;

  const categories = [...new Set(visible.map(e => e.category))];

  const toggle = (id: SearchEngineId) => {
    onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id]);
  };

  const toggleAll = () => {
    onChange(value.length === visible.length ? [] : visible.map(e => e.id));
  };

  const selected = value.filter(v => visible.some(e => e.id === v));

  if (compact) {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors w-fit"
        >
          <Search size={12} />
          <span className="font-bold">Fontes de Busca ({selected.length}/{visible.length})</span>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {open && (
          <div className="glass-card p-3 flex flex-col gap-3 mt-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Selecionar fontes</p>
              <button onClick={toggleAll} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold">
                {selected.length === visible.length ? 'Desmarcar todas' : 'Marcar todas'}
              </button>
            </div>

            {categories.map(cat => (
              <div key={cat}>
                <p className="text-[10px] text-slate-600 font-bold mb-1.5">{CATEGORY_LABELS[cat]}</p>
                <div className="flex flex-wrap gap-2">
                  {visible.filter(e => e.category === cat).map(engine => {
                    const active = value.includes(engine.id);
                    const badge = TIER_BADGE[engine.tier];
                    return (
                      <button
                        key={engine.id}
                        onClick={() => toggle(engine.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                          active
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                            : 'bg-black/20 border-white/5 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span>{engine.icon}</span>
                        {engine.label}
                        <span className={`px-1 py-0.5 rounded-full text-[8px] border ${badge.cls}`}>{badge.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview chips quando fechado */}
        {!open && selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visible.filter(e => selected.includes(e.id)).map(e => (
              <span key={e.id} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {e.icon} {e.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full mode (in settings)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fontes ativas</p>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-bold"
        >
          {selected.length === visible.length ? <CheckSquare size={13} /> : <Square size={13} />}
          {selected.length === visible.length ? 'Desmarcar todas' : 'Marcar todas'}
        </button>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mb-2">{CATEGORY_LABELS[cat]}</p>
          <div className="flex flex-wrap gap-2">
            {visible.filter(e => e.category === cat).map(engine => {
              const active = value.includes(engine.id);
              const badge  = TIER_BADGE[engine.tier];
              return (
                <button
                  key={engine.id}
                  onClick={() => toggle(engine.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                    active
                      ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                      : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-300'
                  }`}
                >
                  <span>{engine.icon}</span>
                  {engine.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] border ${badge.cls}`}>{badge.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
