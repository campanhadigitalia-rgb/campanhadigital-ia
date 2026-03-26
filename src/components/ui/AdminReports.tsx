import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { BarChart3, PieChart, TrendingUp, Car, Package, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface LogEntry {
  type: 'stock_in' | 'stock_out' | 'fleet_trip';
  amount?: number;
  itemName?: string;
  km_start?: number;
  km_end?: number;
  fuel_cost?: number;
  createdAt?: { seconds: number };
}

export function AdminReports() {
  const { activeCampaign } = useCampaign();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const path = useCallback((coll: string) => 
    activeCampaign ? `campaigns/${activeCampaign.id}/${coll}` : null,
    [activeCampaign]);

  useEffect(() => {
    const pInventory = path('inventory_logs');
    const pLogistics = path('logistics_logs');
    if (!pInventory || !pLogistics) return;

    const unsubInventory = onSnapshot(collection(db, pInventory), snap => {
      const invData = snap.docs.map(d => ({ type: d.data().type as 'stock_in' | 'stock_out', ...d.data() }));
      setLogs(prev => [...prev.filter(l => l.type === 'fleet_trip'), ...invData]);
    });

    const unsubLogistics = onSnapshot(collection(db, pLogistics), snap => {
      const logData = snap.docs.map(d => ({ type: 'fleet_trip' as const, ...d.data() }));
      setLogs(prev => [...prev.filter(l => l.type !== 'fleet_trip'), ...logData]);
    });

    return () => { unsubInventory(); unsubLogistics(); };
  }, [activeCampaign, path]);

  const totalKm = logs.filter(l => l.type === 'fleet_trip').reduce((acc, l) => acc + ((l.km_end || 0) - (l.km_start || 0)), 0);
  const totalOut = logs.filter(l => l.type === 'stock_out').reduce((acc, l) => acc + (l.amount || 0), 0);
  const totalIn = logs.filter(l => l.type === 'stock_in').reduce((acc, l) => acc + (l.amount || 0), 0);

  const fmtValue = (v: number) => new Intl.NumberFormat('pt-BR').format(v);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Package size={80} /></div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Movimentação de Estoque</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-white">{fmtValue(totalOut + totalIn)}</h4>
            <span className="text-xs text-slate-400 font-bold uppercase">Itens Totais</span>
          </div>
          <div className="mt-4 flex gap-4 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-400"><ArrowUpRight size={12}/> Entrada: {totalIn}</span>
            <span className="flex items-center gap-1 text-rose-400"><ArrowDownRight size={12}/> Saída: {totalOut}</span>
          </div>
        </div>

        <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Car size={80} /></div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Desempenho da Frota</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-white">{fmtValue(totalKm)}</h4>
            <span className="text-xs text-slate-400 font-bold uppercase">Km Rodados</span>
          </div>
          <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
            <TrendingUp size={12} className="text-indigo-400" /> Atividade constante em campo
          </p>
        </div>

        <div className="glass-card p-6 border border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Custo Estimado (Geral)</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-3xl font-black text-white">R$ {fmtValue(totalKm * 0.85)}</h4>
            <span className="text-xs text-slate-400 font-bold uppercase">Combustível/Manut</span>
          </div>
          <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase">Média técnica baseada em KM</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card border border-white/5 p-6 bg-slate-900/40">
           <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <BarChart3 size={14} className="text-indigo-400" /> Histórico de Volume (Stock)
           </h5>
           <div className="h-48 flex items-end gap-2 px-2">
             {[40, 65, 30, 85, 45, 70, 90].map((h, i) => (
               <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-lg relative group transition-all hover:bg-indigo-500/40" style={{ height: `${h}%` }}>
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                   Dia {i + 1}
                 </div>
               </div>
             ))}
           </div>
           <div className="mt-4 flex justify-between text-[9px] font-bold text-slate-600 uppercase tracking-tighter">
             <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
           </div>
        </div>

        <div className="glass-card border border-white/5 p-6 bg-slate-900/40 flex flex-col">
           <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <PieChart size={14} className="text-emerald-400" /> Distribuição de Gastos
           </h5>
           <div className="flex-1 flex items-center justify-center p-4">
             <div className="w-32 h-32 rounded-full border-12 border-emerald-500/20 border-t-indigo-500/40 border-r-amber-500/30 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">BI Analytics</span>
             </div>
           </div>
           <div className="mt-6 grid grid-cols-2 gap-2">
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-indigo-500/50" /> Logística (40%)
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-emerald-500/50" /> Materiais (35%)
             </div>
             <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
               <div className="w-2 h-2 rounded-full bg-amber-500/50" /> Equipes (25%)
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
