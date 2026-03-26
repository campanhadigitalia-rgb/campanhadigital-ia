import { useState, useEffect } from 'react';
import { Target, Save, ShieldAlert, ExternalLink } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';

export function FundraisingConfig() {
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [finance, setFinance] = useState({
    monthlyGoal: 0,
    spendingLimit: 0,
    categoryGoals: {
      fundoPartidario: 0,
      doacaoFisica: 0,
      vaquinha: 0,
      eventos: 0,
      outros: 0
    },
    sources: {
      fundoPartidario: true,
      doacaoFisica: true,
      vaquinha: false,
      eventos: false,
      outros: true
    }
  });

  useEffect(() => {
    if (activeCampaign?.financeConfig) {
      const base = activeCampaign.financeConfig;
      setFinance(prev => ({
        ...prev,
        ...base,
        categoryGoals: base.categoryGoals || {
          fundoPartidario: 0,
          doacaoFisica: base.monthlyGoal > 0 ? base.monthlyGoal : 0,
          vaquinha: 0,
          eventos: 0,
          outros: 0
        },
        sources: {
          ...prev.sources,
          ...(base.sources || {})
        }
      }));
    }
  }, [activeCampaign?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign?.id) {
       alert('Erro: Campanha não identificada.');
       return;
    }

    setLoading(true);
    try {
      const campaignRef = doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id);
      await updateDoc(campaignRef, {
        financeConfig: {
          ...finance,
          updatedAt: serverTimestamp()
        }
      });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Save error:', err);
      alert('Erro ao salvar no Firebase.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalChange = (category: keyof typeof finance.categoryGoals, value: number) => {
    setFinance(prev => ({
      ...prev,
      categoryGoals: {
        ...prev.categoryGoals,
        [category]: value
      }
    }));
  };

  const toggleSource = (source: keyof typeof finance.sources) => {
    setFinance(prev => ({
      ...prev,
      sources: {
        ...prev.sources,
        [source]: !prev.sources[source]
      }
    }));
  };

  return (
    <div className="glass-card p-6 border border-indigo-500/10">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
          <Target size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-100 m-0">Planejamento de Metas</h2>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Configuração de Arrecadação e Teto</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Teto Geral */}
        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
          <div className="flex items-center justify-between mb-3">
             <label className="text-xs font-black text-indigo-400 uppercase tracking-wider flex items-center gap-2">
               <ShieldAlert size={14} /> Teto de Gastos Oficial (TSE)
             </label>
             <a href="https://divulga.tse.jus.br" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors">
               Consultar DivulgaCand <ExternalLink size={10}/>
             </a>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs uppercase">R$</span>
            <input 
              type="number"
              value={finance.spendingLimit || ''}
              onChange={e => setFinance({...finance, spendingLimit: Number(e.target.value)})}
              className="w-full bg-black/40 border border-indigo-500/20 rounded-lg pl-10 p-2.5 text-white font-black text-sm outline-none focus:border-indigo-500/50"
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Metas por Categoria */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Metas por Fonte</p>
          
          {Object.entries(finance.categoryGoals).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-2 p-3 rounded-lg bg-black/20 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={finance.sources[key as keyof typeof finance.sources] ?? true} 
                    onChange={() => toggleSource(key as keyof typeof finance.sources)}
                    className="w-3 h-3 rounded accent-indigo-500"
                  />
                  <span className="text-[11px] font-bold text-slate-300 uppercase">
                    {key}
                  </span>
                </div>
              </div>
              
              <div className="relative ml-5">
                <input 
                  type="number"
                  value={value || ''}
                  onChange={e => handleGoalChange(key as any, Number(e.target.value))}
                  disabled={!finance.sources[key as keyof typeof finance.sources]}
                  className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-white font-bold text-xs outline-none focus:border-indigo-500/30"
                  placeholder="Meta..."
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50"
        >
          {loading ? 'Processando...' : <><Save size={16} /> Salvar Planejamento</>}
        </button>
      </form>
    </div>
  );
}
