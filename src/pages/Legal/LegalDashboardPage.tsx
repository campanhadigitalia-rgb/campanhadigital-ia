import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Gavel, Clock, Activity } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface LegalAlert {
  id: string;
  title: string;
  type: 'Crítica' | 'Urgente' | 'Informativa';
  desc: string;
  createdAt: any;
}

export default function LegalDashboardPage({ onNavigate }: { onNavigate?: (p: any) => void }) {
  const { campaignId, activeCampaign } = useCampaign();
  const [alerts, setAlerts] = useState<LegalAlert[]>([]);

  useEffect(() => {
    if (!campaignId) return;
    const q = query(
      collection(db, `campaigns/${campaignId}/legal_alerts`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalAlert)));
    });
    return () => unsub();
  }, [campaignId]);

  const checklist = activeCampaign?.legalConfig?.checklist || {};
  const chkItems = [
    { key: 'cnpj_emitted', label: 'CNPJ de Campanha', weight: 25 },
    { key: 'spce_setup', label: 'SPCE Instalado', weight: 25 },
    { key: 'tre', label: 'Certidões TRE-SC', weight: 25 },
    { key: 'fidelidade', label: 'Certidão Partidária', weight: 25 },
  ];

  const totalProgress = chkItems.reduce((acc, item) => acc + (checklist[item.key as keyof typeof checklist] ? item.weight : 0), 0);
  const deferidos = totalProgress; // out of 100

  const activeProcessCount = alerts.filter(a => a.type === 'Crítica' || a.type === 'Urgente').length;

  const stats = [
    { label: 'Documentos Deferidos', value: `${deferidos}%`, icon: CheckCircle, color: deferidos === 100 ? 'text-emerald-400' : 'text-amber-400' },
    { label: 'Prazos Pendentes', value: activeProcessCount > 0 ? activeProcessCount.toString() : '0', icon: Clock, color: activeProcessCount > 0 ? 'text-amber-400' : 'text-slate-400' },
    { label: 'Processos Ativos', value: alerts.length.toString(), icon: Gavel, color: 'text-indigo-400' },
    { label: 'Alerta de Risco', value: activeProcessCount > 0 ? 'Alto' : 'Baixo', icon: AlertTriangle, color: activeProcessCount > 0 ? 'text-rose-400' : 'text-emerald-400' },
  ];

  const registroData = chkItems.map(item => {
    const isDone = checklist[item.key as keyof typeof checklist];
    return {
      label: item.label,
      status: isDone ? 'Validado' : 'Pendente',
      progress: isDone ? 100 : 15,
      color: isDone ? 'bg-emerald-500' : 'bg-amber-500'
    };
  });

  const getTimeAgo = (ts: any) => {
    if (!ts) return '';
    const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date();
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000);
    if (diff < 60) return `Há ${diff}min`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `Há ${hours}h`;
    return `Há ${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/20">
          <Shield size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0 cursor-pointer hover:text-indigo-400 transition-colors" onClick={() => onNavigate?.('dashboard')}>QG Jurídico - Radar de Riscos</h2>
          <p className="text-sm text-slate-400 m-0">Visão geral do status jurídico e conformidade da campanha.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <div key={i} className="glass-card p-5 flex items-center gap-4 border border-white/5">
            <div className={`p-3 rounded-lg bg-black/20 ${s.color}`}>
              <s.icon size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
              <p className="text-lg font-bold text-slate-200">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2"><Activity size={16} className="text-indigo-400" /> Saúde do Registro</h3>
          <div className="space-y-4">
            {registroData.map((item, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  <span className="text-slate-500 font-bold">{item.status}</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`h-full ${item.color} transition-all duration-1000`} style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6 border border-white/5 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2"><Gavel size={16} className="text-rose-400" /> Monitoramento DJE (Últimas 24h)</h3>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Nenhum alerta recente no robô do DJE.</p>
            ) : (
              alerts.map((msg) => (
                <div key={msg.id} className="p-3 bg-black/20 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors uppercase">{msg.title}</p>
                    <span className="text-[9px] text-slate-500">{getTimeAgo(msg.createdAt)}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-1">{msg.desc}</p>
                </div>
              ))
            )}
          </div>
          <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors" onClick={() => onNavigate?.('legal_monitor')}>Ver todos os avisos</button>
        </div>
      </div>
    </div>
  );
}
