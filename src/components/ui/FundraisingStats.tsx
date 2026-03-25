import { useState, useEffect } from 'react';
import { PieChart as LucidePieChart } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar as RechartsBar, XAxis as RechartsXAxis, YAxis as RechartsYAxis, Tooltip as RechartsTooltip, ResponsiveContainer as RechartsResponsiveContainer, CartesianGrid as RechartsCartesianGrid, Cell as RechartsCell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, HandCoins, X, Download, Target } from 'lucide-react';
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

export function FundraisingStats() {
  const { campaignId, activeCampaign } = useCampaign();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [showPix, setShowPix] = useState(false);

  useEffect(() => {
    fetchFinanceStats(campaignId).then((data) => {
      const userGoal = activeCampaign?.financeConfig?.monthlyGoal;
      if (userGoal && userGoal > 0) {
         setStats({ ...data, monthlyGoal: userGoal });
      } else {
         setStats(data);
      }
    });
  }, [campaignId, activeCampaign]);

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

  const chartData = Object.entries(stats.breakdown)
    .filter(([_, val]) => val > 0)
    .map(([key, val]) => ({
      name: CATEGORY_LABELS[key] || key,
      valor: val,
      color: CATEGORY_COLORS[key] || '#cccccc'
    }))
    .sort((a, b) => b.valor - a.valor);

  const displayData = chartData.length > 0 ? chartData : [{ name: 'Aguardando Doações', valor: 0.01, color: '#1e293b' }];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="glass-card flex flex-col h-full border border-emerald-500/10 animate-in fade-in transition-all">
      <div className="p-5 border-b border-white/5 bg-emerald-950/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2 m-0 leading-tight">
              <LucidePieChart size={20} /> Mix de Arrecadação Real
            </h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold m-0 mt-1">Status consolidado por via de entrada</p>
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
        {/* Painel Esquerdo */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
             <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1"><Target size={12}/> Meta Global</p>
                <p className="text-xl font-black text-slate-200">{formatCurrency(stats.monthlyGoal)}</p>
             </div>
             <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-[9px] font-black text-emerald-500 uppercase flex items-center gap-1.5 mb-1"><HandCoins size={12}/> Total Arrecadado</p>
                <p className="text-xl font-black text-emerald-400">{formatCurrency(stats.raised)}</p>
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
                className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" 
              />
            </div>
          </div>

          {/* Breakdown */}
          <div className="mt-2 space-y-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">Detalhamento por Origem</p>
            {Object.entries(stats.breakdown).map(([key, val]) => {
              const perc = stats.raised > 0 ? (val / stats.raised) * 100 : 0;
              const isSourceActive = activeCampaign?.financeConfig?.sources[key as keyof typeof activeCampaign.financeConfig.sources] ?? true;
              if (val === 0 && !isSourceActive) return null;
              
              return (
                <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-white/5 group hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[key] || '#666' }} />
                    <span className="text-[11px] font-bold text-slate-300">{CATEGORY_LABELS[key] || key}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-100 m-0">{formatCurrency(val)}</p>
                    <p className="text-[9px] font-bold text-slate-600 m-0">{perc.toFixed(1)}% do mix</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel Direito (Gráfico) */}
        <div className="flex flex-col h-full min-h-[250px] items-center justify-center p-4 rounded-2xl bg-black/20 border border-white/5">
          <RechartsResponsiveContainer width="100%" height="100%">
            <RechartsBarChart layout="vertical" data={displayData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <RechartsCartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
              <RechartsXAxis type="number" hide />
              <RechartsYAxis 
                type="category" 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                width={80}
              />
              <RechartsTooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}
                // @ts-expect-error recharts type
                formatter={(val: number) => [formatCurrency(val), 'Arrecadado']}
              />
              <RechartsBar dataKey="valor" radius={[0, 4, 4, 0]} barSize={24}>
                {displayData.map((entry, index) => (
                  <RechartsCell key={`cell-${index}`} fill={entry.color} />
                ))}
              </RechartsBar>
            </RechartsBarChart>
          </RechartsResponsiveContainer>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
             {chartData.map(c => (
               <div key={c.name} className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                 <span className="text-[9px] font-bold text-slate-500">{c.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Modal PIX */}
      <AnimatePresence>
        {showPix && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
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
