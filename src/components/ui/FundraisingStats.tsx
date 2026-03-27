import { useState, useEffect } from 'react';
import { PieChart as LucidePieChart, QrCode, HandCoins, X, Download, Target, Building2 } from 'lucide-react';
import { 
  PieChart as RechartsPieChart, Pie as RechartsPie,
  BarChart as RechartsBarChart, Bar as RechartsBar, XAxis as RechartsXAxis, YAxis as RechartsYAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer as RechartsResponsiveContainer, CartesianGrid as RechartsCartesianGrid, Cell as RechartsCell, Legend as RechartsLegend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { fetchFinanceStats, type FinanceStats } from '../../services/multipliersService';
import { useCampaign } from '../../context/CampaignContext';

const CATEGORY_LABELS: Record<string, string> = {
  fundoPartidario: 'Fundo Partidário',
  doacaoFisica: 'Doação PF',
  vaquinha: 'Vaquinha',
  eventos: 'Eventos',
  outros: 'Outros'
};

const CATEGORY_COLORS: Record<string, string> = {
  fundoPartidario: '#8b5cf6', // violet
  doacaoFisica: '#10b981',    // emerald
  vaquinha: '#f43f5e',       // rose
  eventos: '#f59e0b',        // amber
  outros: '#64748b'          // slate
};

const SUPPLIER_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#06b6d4', '#3b82f6'];

export function FundraisingStats() {
  const { campaignId, activeCampaign } = useCampaign();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [showPix, setShowPix] = useState(false);
  
  // For Supplier Expenses
  const [transactions, setTransactions] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    if (!campaignId) return;

    const updateStats = async () => {
      const data = await fetchFinanceStats(campaignId);
      const userGoal = activeCampaign?.financeConfig?.monthlyGoal || 0;
      setStats({ ...data, monthlyGoal: userGoal });
    };

    // Listen to manual transactions
    const qT = query(collection(db, 'finance_transactions'), where('campaign_id', '==', campaignId));
    const unsubT = onSnapshot(qT, (snap) => {
      setTransactions(snap.docs.map(d => d.data()));
      updateStats();
    });

    // Listen to vaquinhas/eventos
    const qF = query(collection(db, `campaigns/${campaignId}/fundraisingCampaigns`));
    const unsubF = onSnapshot(qF, updateStats);

    // Listen to suppliers
    const unsubS = onSnapshot(collection(db, `campaigns/${campaignId}/people`), snap => {
       setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubT(); unsubF(); unsubS(); };
  }, [campaignId, activeCampaign?.financeConfig?.monthlyGoal]);

  if (!stats) {
    return (
      <div className="glass-card p-6 min-h-[400px] flex items-center justify-center">
         <div className="animate-pulse flex items-center gap-2 text-emerald-400 font-bold">
           Carregando Dashboard Financeiro...
         </div>
      </div>
    );
  }

  const progressPercent = stats.monthlyGoal > 0 ? Math.min((stats.raised / stats.monthlyGoal) * 100, 100) : 0;

  const realData = Object.entries(stats.breakdown)
    .filter(([, val]) => val > 0)
    .map(([key, val]) => ({
      name: CATEGORY_LABELS[key] || key,
      valor: val,
      color: CATEGORY_COLORS[key] || '#cccccc',
    }));

  const chartData = realData.length > 0 ? realData : [{ name: 'Sem Receita', valor: 0.1, color: '#1e293b' }];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Calculate supplier expenses
  const supplierExpenses = new Map<string, number>();
  transactions.forEach(t => {
     if (t.type === 'expense' && t.supplierId) {
        supplierExpenses.set(t.supplierId, (supplierExpenses.get(t.supplierId) || 0) + (t.amount || t.valor || 0));
     }
  });
  
  const supplierExpenseData = Array.from(supplierExpenses.entries())
     .map(([id, sum], idx) => ({
        name: suppliers.find(s => s.id === id)?.name || 'Fornecedor',
        valor: sum,
        color: SUPPLIER_COLORS[idx % SUPPLIER_COLORS.length]
     }))
     .sort((a,b) => b.valor - a.valor)
     .slice(0, 5); // Top 5

  return (
    <div className="glass-card flex flex-col h-full border border-emerald-500/10 animate-in fade-in transition-all">
      <div className="p-5 border-b border-white/5 bg-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2 m-0 leading-tight">
              <LucidePieChart size={20} /> Dashboard Consolidado
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold m-0 mt-1">Status de caixa, origens e destinos</p>
          </div>
          
          <button
            onClick={() => setShowPix(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <QrCode size={14} /> Minha Chave PIX
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 p-6">
        {/* Painel Esquerdo: KPIs e Progresso */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1" title="Definido em Configurações -> Financeiro"><Target size={12}/> Meta Global</p>
                <p className="text-xl font-black text-slate-200">{formatCurrency(stats.monthlyGoal)}</p>
             </div>
             <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1.5 mb-1"><HandCoins size={12}/> Total Arrecadado</p>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(stats.raised)}</p>
             </div>
             
             <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
                <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1">Teto Oficial TSE</p>
                <p className="text-sm font-black text-amber-500/80">{formatCurrency(activeCampaign?.financeConfig?.tseSpendingLimit || 0)}</p>
             </div>
             <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-700/30">
                <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1">Teto Gastos Interno</p>
                <p className="text-sm font-black text-emerald-500/80">{formatCurrency(activeCampaign?.financeConfig?.spendingLimit || 0)}</p>
             </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-slate-500">Progresso da Campanha</span>
              <span className="text-emerald-400">{progressPercent.toFixed(1)}% atingido</span>
            </div>
            <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden p-0.5 border border-white/5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className="bg-linear-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
              />
            </div>
          </div>

          {/* Gráfico de Pizza (Receitas) */}
          <div className="flex flex-col h-[220px] w-full items-center justify-center p-2 rounded-2xl bg-black/20 border border-white/5 relative mt-4">
             <h3 className="absolute top-3 left-4 text-[10px] uppercase font-black tracking-widest text-emerald-400">Mix de Receitas</h3>
             <RechartsResponsiveContainer width="100%" height="100%">
               <RechartsPieChart>
                 <RechartsTooltip 
                   formatter={(val: any) => [formatCurrency(val as number), 'Arrecadado']}
                   contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', fontSize: '12px' }}
                 />
                 <RechartsLegend iconType="circle" wrapperStyle={{ fontSize: '10px', bottom: 0 }} />
                 <RechartsPie 
                   data={chartData} 
                   dataKey="valor" 
                   nameKey="name" 
                   cx="50%" 
                   cy="50%" 
                   outerRadius={65} 
                   innerRadius={45}
                   paddingAngle={5}
                 >
                   {chartData.map((entry, index) => (
                     <RechartsCell key={`cell-${index}`} fill={entry.color} />
                   ))}
                 </RechartsPie>
               </RechartsPieChart>
             </RechartsResponsiveContainer>
          </div>
        </div>

        {/* Painel Direito: Gastos por Fornecedor */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 p-3 bg-rose-500/5 border border-rose-500/20 rounded-xl">
            <Building2 size={16} className="text-rose-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-400 m-0">Top Gastos por Fornecedor/Contrato</h3>
          </div>
          
          {supplierExpenseData.length > 0 ? (
            <div className="flex flex-col h-[380px] w-full items-center justify-center p-4 rounded-2xl bg-black/20 border border-white/5">
              <RechartsResponsiveContainer width="100%" height="100%">
                <RechartsBarChart layout="vertical" data={supplierExpenseData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <RechartsCartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                  <RechartsXAxis type="number" hide />
                  <RechartsYAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    width={90}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(244,63,94,0.2)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [formatCurrency(val as number), 'Gasto']}
                  />
                  <RechartsBar dataKey="valor" radius={[0, 4, 4, 0]} barSize={20}>
                    {supplierExpenseData.map((entry, index) => (
                      <RechartsCell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RechartsBar>
                </RechartsBarChart>
              </RechartsResponsiveContainer>
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-2xl p-6 text-center">
               <Building2 size={32} className="text-slate-700 mb-3" />
               <p className="text-xs text-slate-500 uppercase font-bold">Nenhum gasto vinculado a fornecedor</p>
               <p className="text-[10px] text-slate-600 mt-2">DICA: Ao registrar uma saída no "Livro Caixa", selecione um Fornecedor para rankeá-lo aqui.</p>
             </div>
          )}
        </div>
      </div>

      {/* Modal PIX */}
      <AnimatePresence>
        {showPix && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.1)] rounded-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="bg-emerald-600 p-4 flex items-center justify-between text-white">
                <h3 className="font-bold flex items-center gap-2 m-0 leading-none"><QrCode size={18} /> Chave PIX da Campanha</h3>
                <button onClick={() => setShowPix(false)} className="hover:bg-emerald-700 p-1 rounded transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6 flex flex-col items-center gap-4">
                {activeCampaign?.legalConfig?.pix ? (
                  <>
                    <p className="text-sm text-center text-slate-300 m-0">
                      Compartilhe a chave PIX eleitoral para captar doações auditáveis pelo SPCE.
                    </p>
                    <div className="w-full bg-black/40 border border-emerald-500/20 rounded-lg p-4 text-center">
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Chave PIX</p>
                      <p className="text-emerald-400 font-mono font-bold text-sm select-all break-all">
                        {activeCampaign.legalConfig.pix}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await navigator.clipboard.writeText(activeCampaign.legalConfig?.pix as string || '');
                        alert('Chave PIX copiada!');
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors">
                      <Download size={16} /> Copiar Chave PIX
                    </button>
                    <p className="text-[10px] text-amber-400/70 text-center">
                      ⚠️ Apenas doações de pessoa física até 10% dos rendimentos declarados ao IR são permitidas.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400 text-sm font-bold m-0">Chave PIX não configurada</p>
                    <p className="text-slate-600 text-[10px] mt-1 m-0">
                      Acesse Jurídico → Deferimento Eleitoral e preencha a chave PIX eleitoral.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
