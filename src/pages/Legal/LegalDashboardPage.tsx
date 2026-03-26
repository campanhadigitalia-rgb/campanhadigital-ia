import { Shield, AlertTriangle, CheckCircle, Gavel, Clock, Activity } from 'lucide-react';

export default function LegalDashboardPage({ onNavigate }: { onNavigate?: (p: any) => void }) {
  const stats = [
    { label: 'Documentos Deferidos', value: '85%', icon: CheckCircle, color: 'text-emerald-400' },
    { label: 'Prazos Pendentes', value: '3', icon: Clock, color: 'text-amber-400' },
    { label: 'Processos Ativos', value: '12', icon: Gavel, color: 'text-indigo-400' },
    { label: 'Alerta de Risco', value: 'Moderado', icon: AlertTriangle, color: 'text-rose-400' },
  ];

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
            {[
              { label: 'Certidões Criminais', status: 'Validado', progress: 100, color: 'bg-emerald-500' },
              { label: 'Quitação Eleitoral', status: 'Pendente (1)', progress: 90, color: 'bg-amber-500' },
              { label: 'Declaração de Bens', status: 'Validado', progress: 100, color: 'bg-emerald-500' },
              { label: 'RRC (Requerimento)', status: 'Em Elaboração', progress: 65, color: 'bg-indigo-500' },
            ].map((item, i) => (
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
            {[
              { title: 'Intimação: Direito de Resposta', time: 'Há 2h', type: 'Crítica', desc: 'Representação n. 0600XXX-XX' },
              { title: 'Publicação: Pauta de Julgamento', time: 'Há 5h', type: 'Informativa', desc: 'Sessão plenária TRE-SC' },
              { title: 'Citação: Ação de Investigação', time: 'Há 12h', type: 'Urgente', desc: 'AIJE n. 0600XXX-XX' },
            ].map((msg, i) => (
              <div key={i} className="p-3 bg-black/20 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-all group">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors uppercase">{msg.title}</p>
                  <span className="text-[9px] text-slate-500">{msg.time}</span>
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{msg.desc}</p>
              </div>
            ))}
          </div>
          <button className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-colors">Ver todos os avisos</button>
        </div>
      </div>
    </div>
  );
}
