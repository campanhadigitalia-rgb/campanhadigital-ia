import { Gavel, Scale, AlertCircle, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function LegalMonitorPage() {
  const [activeTab, setActiveTab] = useState<'monitor' | 'rag'>('monitor');

  const alerts = [
    { source: 'DJE', title: 'Impugnação de Registro', level: 'High', date: 'Hoje, 09:12', doc: 'PJe 0600456-11' },
    { source: 'Portal Transparência', title: 'Contratação Suspeita (Adversário)', level: 'Medium', date: 'Hoje, 11:45', doc: 'Inquérito Civil 14/2026' },
    { source: 'Manus AI Scan', title: 'Ataque Sistemático em Redes', level: 'High', date: 'Hoje, 14:00', doc: 'ID-889' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-500/15 text-red-100 rounded-xl border border-red-500/20">
          <Gavel size={28} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0">Radar de Adversários & RAG Defense</h2>
          <p className="text-sm text-slate-400 m-0 uppercase tracking-tighter font-black">Escaneando DJE, PJe e Portais (24/7)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 border border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Fontes de Monitoramento</h3>
            <div className="space-y-2">
              {[
                { label: 'DJE (TSE/TRE)', status: 'Online', color: 'text-emerald-400' },
                { label: 'Justiça Federal', status: 'Online', color: 'text-emerald-400' },
                { label: 'Justiça Estadual', status: 'Online', color: 'text-emerald-400' },
                { label: 'Portal de Contas', status: 'Online', color: 'text-emerald-400' },
                { label: 'Redes Sociais (Manus)', status: 'Online', color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-bold p-2 bg-black/20 rounded border border-white/5 transition-all hover:bg-black/30">
                  <span className="text-slate-400 uppercase">{s.label}</span>
                  <span className={s.color}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 border border-red-500/20 bg-red-500/5">
             <div className="flex items-center gap-2 text-red-400 mb-3">
                <AlertCircle size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Alerta Crítico</h3>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed">Detectado pedido de **Impugnação de Registro** movido pela Coligação 'X'. Prazo de defesa: **7 dias**.</p>
             <button className="w-full mt-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-100 border border-red-500/20 rounded font-black uppercase text-[10px] transition-all">
                Gerar Minuta de Defesa (RAG)
             </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
           <div className="glass-card p-6 border border-white/5">
              <div className="flex items-center gap-6 border-b border-white/5 pb-4 mb-6 text-xs font-black uppercase tracking-widest">
                 <button onClick={() => setActiveTab('monitor')} className={`pb-1 transition-colors ${activeTab === 'monitor' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>Monitor de Movimentações</button>
                 <button onClick={() => setActiveTab('rag')} className={`pb-1 transition-colors ${activeTab === 'rag' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500'}`}>RAG AI (Defesa & Jurisprudência)</button>
              </div>

              {activeTab === 'monitor' ? (
                <div className="space-y-4">
                  {alerts.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-white/10 group hover:border-indigo-500/30 transition-all">
                       <div className="flex gap-4">
                          <div className={`p-2 rounded ${a.level === 'High' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                             <Scale size={20} />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-slate-200">{a.title}</p>
                             <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">{a.source} • {a.doc} • <Clock size={10} className="inline ml-1" /> {a.date}</p>
                          </div>
                       </div>
                       <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg font-bold text-[10px] uppercase transition-all">
                          Ver Detalhes
                       </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                   <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-4">
                      <p className="text-xs font-bold text-slate-300">Explique o caso ou anexe a petição adversária:</p>
                      <textarea className="w-full h-32 bg-black/20 border border-white/10 rounded-lg p-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50" placeholder="Ex: Defender impugnação baseada em ausência de certidão criminal estadual, sendo que a mesma foi emitida via sistema online..."></textarea>
                      <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-indigo-500/20">
                         <Zap size={14} /> Elaborar Tese de Defesa com RAG
                      </button>
                   </div>
                   
                   <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex gap-3">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      <p className="text-[11px] text-slate-400 uppercase font-black">RAG (Retrieval-Augmented Generation) está consultando 4.500 acórdãos do TSE para fundamentar sua peça.</p>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
