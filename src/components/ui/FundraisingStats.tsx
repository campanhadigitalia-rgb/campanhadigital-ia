import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, TrendingUp, HandCoins, X, Download, Target, Scale } from 'lucide-react';
import { fetchFinanceStats, type FinanceStats } from '../../services/multipliersService';
import { useCampaign } from '../../context/CampaignContext';

export function FundraisingStats() {
  const { campaignId } = useCampaign();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [showPix, setShowPix] = useState(false);

  useEffect(() => {
    fetchFinanceStats(campaignId).then(setStats);
  }, [campaignId]);

  if (!stats) {
    return (
      <div className="glass-card p-6 min-h-[300px] flex items-center justify-center">
         <div className="animate-pulse flex items-center gap-2 text-emerald-400">
           Carregando Dashboard Financeiro...
         </div>
      </div>
    );
  }

  const deficit = stats.monthlyGoal - stats.raised;
  const progressPercent = Math.min((stats.raised / stats.monthlyGoal) * 100, 100);

  const chartData = [
    { name: 'Arrecadado', valor: stats.raised, color: '#10b981' },
    { name: 'Déficit (Meta)', valor: deficit > 0 ? deficit : 0, color: '#f43f5e' }
  ];

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="glass-card flex flex-col h-full border border-emerald-500/10">
      <div className="p-5 border-b border-emerald-500/10 bg-emerald-950/20">
        {/* Header Section com Alerta Fake */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div>
            <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2 m-0 mt-1">
              <TrendingUp size={22} /> Motor Financeiro (Arrecadação)
            </h2>
            <p className="text-xs text-slate-400 m-0">Consolidado em tempo real da campanha Multi-Tenant.</p>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg text-[10px] font-bold text-red-400 flex items-center gap-1.5 shadow-sm shadow-red-500/10">
            <Scale size={14} className="text-red-500" /> TSE ALERT: 2 Doações com CPF Irregular ou Vedado Retidas.
          </div>
        </div>
        <button
          onClick={() => setShowPix(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
        >
          <QrCode size={16} /> Gerar Link Pix
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Painel Esquerdo: KPI */}
        <div className="flex flex-col flex-1 gap-4 justify-center">
          <div className="p-4 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold text-slate-500 mb-1 flex items-center gap-1"><Target size={14}/> Meta Mensal</span>
              <span className="text-2xl font-black text-slate-200">{formatCurrency(stats.monthlyGoal)}</span>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
               <TrendingUp size={24} />
            </div>
          </div>

          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 shadow-[inset_0_0_20px_rgba(16,185,129,0.03)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs uppercase font-bold text-emerald-500 mb-1 flex items-center gap-1"><HandCoins size={14} /> Total Arrecadado</span>
              <span className="text-3xl font-black text-emerald-400">{formatCurrency(stats.raised)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Progresso Real</span>
              <span className="text-emerald-400">{progressPercent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner flex">
              <div className="bg-emerald-500 h-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>
        </div>

        {/* Parede Direito: Gráfico de Barras */}
        <div className="flex-1 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 0, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}
                formatter={(val: any) => formatCurrency(val)}
              />
              <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Modal PIX Copia e Cola Dinâmico */}
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
                <h3 className="font-bold flex items-center gap-2 m-0"><QrCode size={18} /> Link de Doação da Campanha</h3>
                <button onClick={() => setShowPix(false)} className="hover:bg-emerald-700 p-1 rounded transition-colors"><X size={18} /></button>
              </div>
              <div className="p-6 flex flex-col items-center gap-6">
                <p className="text-sm text-center text-slate-300 m-0">
                  Envie o código oficial do TSE para os multiplicadores captarem fundos legais e auditáveis.
                </p>
                <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center">
                   {/* Simulação de um QR Code Renderizado */}
                   <QrCode size={120} className="text-slate-800" strokeWidth={1} />
                </div>

                <div className="w-full flex bg-black/40 border border-emerald-500/20 rounded-lg overflow-hidden">
                  <div className="flex-1 p-3 text-xs text-indigo-400 font-mono truncate select-all">
                    00020101021126580014br.gov.bcb.pix0136campanha-legal-2026@campanhadigitalia.com.br5204000053039865802BR5916Campanha Digital6009RS...
                  </div>
                  <button className="px-4 bg-emerald-900/50 hover:bg-emerald-800 text-emerald-300 font-bold text-xs uppercase transition-colors">
                    Copiar
                  </button>
                </div>

                <button className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-sm transition-colors">
                  <Download size={16} /> Compartilhar no WhatsApp
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


