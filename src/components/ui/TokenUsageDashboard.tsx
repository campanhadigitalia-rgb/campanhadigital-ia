// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Token Usage Dashboard
//  Painel de custo e consumo de APIs da sessão.
// ──────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import { DollarSign, RefreshCcw, Trash2, TrendingUp, Zap, Clock } from 'lucide-react';
import { getUsageSummary, resetUsage, canCallService } from '../../utils/billingMonitor';
import type { UsageSummaryItem, RateLimitMode } from '../../utils/billingMonitor';

function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const pct = Math.min((used / limit) * 100, 100);
  const color = pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function TokenUsageDashboard() {
  const [items, setItems] = useState<UsageSummaryItem[]>(() => getUsageSummary());

  const refresh = useCallback(() => setItems(getUsageSummary()), []);

  const handleReset = () => {
    resetUsage();
    setItems([]);
  };

  const totalCostUSD = items.reduce((s, i) => s + i.costUSD, 0);
  const totalCostBRL = items.reduce((s, i) => s + i.costBRL, 0);
  const paidItems    = items.filter(i => !i.isFree && i.costUSD > 0);
  const freeItems    = items.filter(i => i.isFree || i.costUSD === 0);

  return (
    <div className="glass-card overflow-hidden border-indigo-500/20">
      {/* Header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center">
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-200 text-sm">Consumo de APIs — Sessão Atual</h3>
            <p className="text-[10px] text-slate-500">Reiniciado ao fechar o navegador. Baseado em estimativas de tokens.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-400 hover:text-slate-200 px-3 py-2 rounded-lg transition-colors"
          >
            <RefreshCcw size={12} /> Atualizar
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={12} /> Zerar
          </button>
        </div>
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-white/5">
        {[
          { label: 'Total USD', value: `$${totalCostUSD.toFixed(4)}`, icon: <DollarSign size={14} className="text-emerald-400" />, color: totalCostUSD > 0 ? 'text-emerald-400' : 'text-slate-500' },
          { label: 'Total BRL', value: `R$ ${totalCostBRL.toFixed(2)}`, icon: <TrendingUp size={14} className="text-indigo-400" />, color: totalCostBRL > 0 ? 'text-indigo-400' : 'text-slate-500' },
          { label: 'Serviços usados', value: items.length.toString(), icon: <Zap size={14} className="text-amber-400" />, color: 'text-amber-400' },
          { label: 'Custo zero', value: freeItems.length.toString(), icon: <Zap size={14} className="text-emerald-500" />, color: 'text-emerald-500' },
        ].map(stat => (
          <div key={stat.label} className="p-4 flex flex-col gap-1 border-r border-white/5 last:border-r-0">
            <div className="flex items-center gap-1.5 text-slate-500">
              {stat.icon}
              <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
            </div>
            <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="p-4 flex flex-col gap-3">
        {items.length === 0 ? (
          <p className="text-center text-xs text-slate-600 py-6 italic">Nenhuma chamada registrada nesta sessão ainda.</p>
        ) : (
          <>
            {paidItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Serviços com Custo</p>
                {paidItems.map(item => <UsageRow key={item.service} item={item} />)}
              </div>
            )}
            {freeItems.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Serviços Gratuitos</p>
                {freeItems.map(item => <UsageRow key={item.service} item={item} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UsageRow({ item }: { item: UsageSummaryItem }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-black/20 border border-white/5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-300 truncate">{item.label}</span>
          {item.isFree ? (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/20">
              Grátis
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-black uppercase border border-amber-500/20">
              Pago
            </span>
          )}
        </div>

        {item.dailyLimit && (
          <div className="mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500">{item.callsToday} / {item.dailyLimit} {item.unit} hoje</span>
            </div>
            <QuotaBar used={item.callsToday} limit={item.dailyLimit} />
          </div>
        )}

        {item.lastCall > 0 && (
          <p className="text-[10px] text-slate-600 mt-1 flex items-center gap-1">
            <Clock size={9} /> Última: {new Date(item.lastCall).toLocaleTimeString('pt-BR')}
          </p>
        )}
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-xs font-bold text-slate-400">{item.calls} chamadas</span>
        {item.tokens > 0 && <span className="text-[10px] text-slate-600">{item.tokens.toLocaleString()} tokens</span>}
        <span className={`text-sm font-black ${item.costUSD > 0 ? 'text-amber-400' : 'text-emerald-500'}`}>
          {item.costUSD > 0 ? `$${item.costUSD.toFixed(5)}` : '$0.00'}
        </span>
        {item.costBRL > 0 && (
          <span className="text-[10px] text-slate-500">≈ R$ {item.costBRL.toFixed(3)}</span>
        )}
      </div>
    </div>
  );
}

// ── Rate Limit Mode Selector (sub-componente reutilizável) ──────

export function RateLimitSelector({
  service,
  value,
  onChange,
  dailyLimit,
  unit = 'req',
}: {
  service: string;
  value: RateLimitMode;
  onChange: (mode: RateLimitMode) => void;
  dailyLimit?: number;
  unit?: string;
}) {
  const modes: { id: RateLimitMode; icon: string; label: string; desc: string; reqPerCycle?: number }[] = [
    {
      id: 'economico',
      icon: '🌙',
      label: 'Econômico',
      desc: 'Intervalo mín. 6h entre ciclos',
      reqPerCycle: dailyLimit ? Math.floor(dailyLimit * 0.25) : undefined,
    },
    {
      id: 'normal',
      icon: '☀️',
      label: 'Normal',
      desc: 'Intervalo mín. 3h entre ciclos',
      reqPerCycle: dailyLimit ? Math.floor(dailyLimit * 0.5) : undefined,
    },
    {
      id: 'ilimitado',
      icon: '⚡',
      label: 'Ilimitado',
      desc: 'Sem throttle interno',
      reqPerCycle: dailyLimit,
    },
  ];

  const status = canCallService(service, value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 flex-wrap">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`flex-1 min-w-24 flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-center transition-all ${
              value === m.id
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-white/5 bg-black/20 hover:border-white/10'
            }`}
          >
            <span className="text-base">{m.icon}</span>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-wide">{m.label}</span>
            <span className="text-[9px] text-slate-500 leading-tight">{m.desc}</span>
            {m.reqPerCycle !== undefined && (
              <span className="text-[9px] text-indigo-400 font-bold">{m.reqPerCycle} {unit}/ciclo</span>
            )}
          </button>
        ))}
      </div>
      {!status.allowed && (
        <p className="text-[10px] text-amber-400 flex items-center gap-1">
          <Clock size={10} /> {status.reason}
        </p>
      )}
    </div>
  );
}
