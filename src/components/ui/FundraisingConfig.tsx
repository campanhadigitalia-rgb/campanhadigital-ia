import { useState, useEffect } from 'react';
import { Target, Coins, Save, Banknote, ShieldAlert } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';

export function FundraisingConfig() {
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [finance, setFinance] = useState({
    monthlyGoal: 50000,
    spendingLimit: 150000, // Teto TSE
    sources: {
      fundoPartidario: true,
      doacaoFisica: true,
      vaquinha: false,
      eventos: false
    }
  });

  useEffect(() => {
    if (activeCampaign?.financeConfig) {
      setFinance(activeCampaign.financeConfig);
    }
  }, [activeCampaign]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id), {
        financeConfig: finance
      });
      alert('Configurações Financeiras atualizadas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof typeof finance.sources) => {
    setFinance(prev => ({
      ...prev,
      sources: { ...prev.sources, [key]: !prev.sources[key] }
    }));
  };

  return (
    <div className="glass-card p-6 border-emerald-500/20 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
          <Banknote size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Setup Financeiro</h2>
          <p className="text-xs text-slate-500">Defina o teto do TSE e as vias de arrecadação oficiais.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-500" /> Teto de Gastos (TSE)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
              <input 
                type="number" 
                value={finance.spendingLimit}
                onChange={e => setFinance({...finance, spendingLimit: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-9 py-2.5 text-white outline-none focus:border-emerald-500/50" 
              />
            </div>
            <p className="text-[9px] text-amber-500/70 ml-1">Valor limite estipulado pela Justiça Eleitoral para o cargo.</p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1">
              <Target size={12} className="text-emerald-500" /> Meta Mensal Interna
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">R$</span>
              <input 
                type="number" 
                value={finance.monthlyGoal}
                onChange={e => setFinance({...finance, monthlyGoal: Number(e.target.value)})}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-9 py-2.5 text-emerald-400 font-bold outline-none focus:border-emerald-500/50" 
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1">
            <Coins size={12} /> Modos de Entrada Autorizados
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'fundoPartidario', label: 'Fundo Partidário (FEFC)' },
              { id: 'doacaoFisica', label: 'Doação Pessoa Física (PIX)' },
              { id: 'vaquinha', label: 'Financiamento Coletivo' },
              { id: 'eventos', label: 'Eventos de Arrecadação' }
            ].map(source => (
               <label key={source.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${finance.sources[source.id as keyof typeof finance.sources] ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-white/5 opacity-50'}`}>
                 <input 
                   type="checkbox" 
                   className="hidden" 
                   checked={finance.sources[source.id as keyof typeof finance.sources]}
                   onChange={() => handleToggle(source.id as keyof typeof finance.sources)}
                 />
                 <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${finance.sources[source.id as keyof typeof finance.sources] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                   {finance.sources[source.id as keyof typeof finance.sources] && <svg viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" className="w-3 h-3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                 </div>
                 <span className="text-xs font-bold text-slate-300">{source.label}</span>
               </label>
            ))}
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="mt-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50"
        >
          {loading ? 'Salvando...' : <><Save size={18} /> Consolidar Setup Financeiro</>}
        </button>
      </form>
    </div>
  );
}
