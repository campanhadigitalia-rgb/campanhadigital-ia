import { useState, useMemo, useEffect } from 'react';
import { DollarSign, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, PieChart, Lock, ArrowUpRight } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function LegalFinanceiroPage({ onNavigate }: { onNavigate?: (p: any) => void }) {
  const { campaignId, activeCampaign } = useCampaign();
  const [transactions, setTransactions] = useState<any[]>([]);

  // Calculate limits based on user tier or config
  const spendLimit = activeCampaign?.financeConfig?.monthlyGoal || 100000;
  
  useEffect(() => {
    if (!campaignId) return;
    const q = collection(db, `campaigns/${campaignId}/finance_caixa`);
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [campaignId]);

  const totalSpent = useMemo(() => 
    transactions.reduce((acc: number, t: any) => acc + (t.type === 'Saída' ? (t.valor || t.value || 0) : 0), 0)
  , [transactions]);

  const progress = Math.min((totalSpent / spendLimit) * 100, 100);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20" onClick={() => onNavigate?.('finance_dashboard')}>
          <DollarSign size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0">Auditoria & Trava de Gasto</h2>
          <p className="text-sm text-slate-400 m-0">Monitoramento de limites legais e conformidade financeira (TSE).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 border border-white/5 space-y-6">
            <div className="flex justify-between items-end">
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1 leading-none">Total Despendido / Limite Legal</p>
                  <h3 className="text-2xl font-black text-slate-100 flex items-baseline gap-2">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
                    <span className="text-xs font-bold text-slate-500 tracking-tighter uppercase">de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(spendLimit)}</span>
                  </h3>
               </div>
               <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase border transition-all ${
                 progress > 90 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 
                 progress > 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
               }`}>
                 {progress > 90 ? <ShieldAlert size={12}/> : <ShieldCheck size={12}/>}
                 {progress.toFixed(1)}% Utilizado
               </div>
            </div>

            <div className="w-full bg-slate-900/60 rounded-full h-4 p-1 border border-white/5 relative overflow-hidden">
               <div className={`h-full rounded-full transition-all duration-1000 ${
                 progress > 90 ? 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 
                 progress > 70 ? 'bg-gradient-to-r from-amber-500 to-amber-400' : 
                 'bg-linear-to-r from-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
               }`} style={{ width: `${progress}%` }} />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
               {[
                 { label: 'Teto Global (TSE)', value: spendLimit, icon: PieChart, color: 'text-indigo-400' },
                 { label: 'Fundo Partidário', value: 0, icon: Lock, color: 'text-slate-600' },
                 { label: 'Doação Pessoa Física', value: totalSpent, icon: ArrowUpRight, color: 'text-emerald-400' },
               ].map((item, i) => (
                 <div key={i} className="p-3 bg-black/20 rounded border border-white/5 space-y-1">
                    <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1"><item.icon size={10} className={item.color}/> {item.label}</p>
                    <p className="text-xs font-bold text-slate-300">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}</p>
                 </div>
               ))}
            </div>
          </div>

          <div className="glass-card border border-white/5 overflow-hidden shadow-2xl">
            <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Trava Jurídica: Pendências de Validação</h3>
               <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <div className="p-6 text-center space-y-3">
               <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl inline-block text-amber-400 mb-2">
                  <Lock size={32} />
               </div>
               <p className="text-sm font-bold text-slate-200">Não há travas ativas no momento.</p>
               <p className="text-xs text-slate-500 max-w-sm mx-auto">Toda despesa acima de R$ 1.000,00 exige upload automático do contrato para liberação do pagamento no Livro Caixa.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 space-y-4 shadow-xl">
             <div className="flex items-center gap-2 text-indigo-400">
                <ShieldCheck size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest leading-none">Relatório SPCE Pref.</h3>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed uppercase font-bold tracking-tight">Gerar Minuta de Prestação de Contas Parcial:</p>
             <button className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                Exportar Dados (CSV/PDF)
             </button>
             <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado com Livro Caixa
             </div>
          </div>

          <div className="glass-card p-6 border border-white/5 space-y-4">
             <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Dicas de Compliance</h3>
             <ul className="space-y-3">
                {[
                  'Nunca receba doação em espécie acima de R$ 1.064,10.',
                  'Toda doação via PIX deve ser de Pessoa Física.',
                  'O limite de gastos com alimentação é 10% do teto.',
                  'O limite com advogados/contadores é excluído do teto.',
                ].map((tip, i) => (
                  <li key={i} className="flex gap-2 text-[10px] font-bold text-slate-400 group cursor-default">
                    <CheckCircle size={10} className="text-emerald-500 shrink-0 mt-0.5 group-hover:scale-125 transition-transform" />
                    <span>{tip}</span>
                  </li>
                ))}
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
