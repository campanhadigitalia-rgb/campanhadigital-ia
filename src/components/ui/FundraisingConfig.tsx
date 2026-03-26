import { useState, useEffect } from 'react';
import { Target, Coins, Save, Banknote, ShieldAlert, ExternalLink } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';

const SOURCE_INFO = {
  fundoPartidario: {
    label: 'Fundo Partidário (FEFC)',
    desc: 'Recurso público (Tesouro). Exige conta bancária exclusiva. Uso restrito a gastos eleitorais e prestação de contas rigorosa.'
  },
  doacaoFisica: {
    label: 'Doação Pessoa Física (PIX)',
    desc: 'Limite de 10% da renda bruta do doador no ano anterior. Obrigatória a emissão de recibo eleitoral e identificação do CPF.'
  },
  vaquinha: {
    label: 'Financiamento Coletivo',
    desc: 'Arrecadação via plataformas homologadas pelo TSE. As empresas retêm taxas (em torno de 7%) e o repasse ocorre conforme contrato.'
  },
  eventos: {
    label: 'Eventos de Arrecadação',
    desc: 'Jantares, eventos, venda de bens. Exige controle de entrada por pessoa e emissão de recibo individual.'
  }
};

export function FundraisingConfig() {
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [finance, setFinance] = useState({
    monthlyGoal: 50000,
    spendingLimit: 150000,
    tseSpendingLimit: 0,
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
      eventos: false
    }
  });

  useEffect(() => {
    if (activeCampaign?.financeConfig) {
      const base = activeCampaign.financeConfig;
      setFinance(prev => {
        // Only override if the IDs don't match or on initial load, but for simplicity let's just initialize
        return {
          ...prev,
          ...base,
          categoryGoals: base.categoryGoals || {
            fundoPartidario: 0,
            doacaoFisica: base.monthlyGoal > 0 ? base.monthlyGoal : 0,
            vaquinha: 0,
            eventos: 0,
            outros: 0
          }
        };
      });
    }
  }, [activeCampaign?.id]);

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

  const handleGoalChange = (key: keyof typeof finance.categoryGoals, val: number) => {
    const newGoals = { ...finance.categoryGoals, [key]: val };
    const total = Object.values(newGoals).reduce((a, b) => a + b, 0);
    setFinance(prev => ({ ...prev, categoryGoals: newGoals, monthlyGoal: total }));
  };

  return (
    <div className="glass-card p-6 border-emerald-500/20 h-full overflow-y-auto max-h-[85vh]">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
          <Banknote size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Estratégia & Metas</h2>
          <p className="text-xs text-slate-500">Defina o teto do TSE e quanto pretende captar por via.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Teto de Gastos Section */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldAlert size={14} className="text-amber-500" /> Teto de Gastos (Limite Legal)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 pl-1 uppercase">Teto Oficial TSE/TRE</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs">R$</span>
                <input 
                  type="number" 
                  value={finance.tseSpendingLimit || ''}
                  onChange={e => setFinance({...finance, tseSpendingLimit: Number(e.target.value)})}
                  placeholder="0,00"
                  className="w-full bg-black/40 border border-slate-700 rounded-lg px-8 py-2 text-slate-400 text-sm outline-none focus:border-amber-500/30" 
                />
              </div>
              <a href="https://www.tse.jus.br/eleicoes/eleicoes-2024/teto-de-gastos" target="_blank" rel="noreferrer" 
                 className="text-[9px] text-indigo-400 flex items-center gap-1 mt-1 hover:underline">
                <ExternalLink size={10} /> Consultar teto oficial do seu município no TSE
              </a>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-500 pl-1 uppercase">Teto de Gastos Interno</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs">R$</span>
                <input 
                  type="number" 
                  value={finance.spendingLimit}
                  onChange={e => setFinance({...finance, spendingLimit: Number(e.target.value)})}
                  className="w-full bg-black border border-emerald-500/20 rounded-lg px-8 py-2 text-white font-bold text-sm outline-none focus:border-emerald-500/50" 
                />
              </div>
              <p className="text-[9px] text-slate-500 mt-1">O maior valor entre o oficial e o interno será usado como limite.</p>
            </div>
          </div>
        </div>

        {/* Fontes e Metas Específicas */}
        <div className="space-y-4">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 flex items-center gap-2">
            <Coins size={14} className="text-emerald-500" /> Arrecadação: Fontes e Orçamento
          </label>
          
          <div className="flex flex-col gap-3">
            {(Object.keys(SOURCE_INFO) as Array<keyof typeof SOURCE_INFO>).map(key => (
              <div key={key} className={`group p-4 rounded-xl border transition-all ${finance.sources[key] ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.02)]' : 'bg-slate-900/40 border-slate-800'}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <button 
                      type="button"
                      onClick={() => handleToggle(key)}
                      className={`w-10 h-6 rounded-full relative transition-colors ${finance.sources[key] ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${finance.sources[key] ? 'left-5' : 'left-1'}`} />
                    </button>
                    <div>
                      <p className={`text-sm font-bold m-0 ${finance.sources[key] ? 'text-slate-100' : 'text-slate-500'}`}>{SOURCE_INFO[key].label}</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5 max-w-sm">{SOURCE_INFO[key].desc}</p>
                    </div>
                  </div>

                  {finance.sources[key] && (
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[9px] font-black text-emerald-500 uppercase">Meta Estimada</span>
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</span>
                        <input 
                          type="number" 
                          value={finance.categoryGoals[key]}
                          onChange={e => handleGoalChange(key, Number(e.target.value))}
                          className="w-full bg-black border border-emerald-500/30 rounded-lg px-7 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo Total */}
        <div className="mt-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="text-emerald-400" size={24} />
            <div>
              <p className="text-[10px] font-black text-emerald-500/70 uppercase m-0">Meta Global Consolidada</p>
              <p className="text-2xl font-black text-white m-0">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finance.monthlyGoal)}
              </p>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50"
          >
            {loading ? 'Processando...' : <><Save size={16} /> Salvar Tudo</>}
          </button>
        </div>
      </form>
    </div>
  );
}
