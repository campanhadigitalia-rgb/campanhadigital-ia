import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, ShieldAlert, BookOpen, AlertCircle, FileText, CheckCircle, Search, Clock, FileWarning, PlayCircle } from 'lucide-react';
import { fetchJurisprudenceDB, fetchAuditLogs, generateDefenseThesis, type Jurisprudence, type AuditLog } from '../../services/legalService';

export function LegalGuardian() {
  const [jurisprudence, setJurisprudence] = useState<Jurisprudence[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicThesis, setPanicThesis] = useState<string | null>(null);

  useEffect(() => {
    fetchJurisprudenceDB().then(setJurisprudence);
    fetchAuditLogs().then(setLogs);
  }, []);

  const handlePanicButton = async () => {
    setPanicLoading(true);
    setPanicThesis(null);
    const thesis = await generateDefenseThesis('Ação contestando post no instagram sobre inauguração de ponte H');
    setPanicThesis(thesis);
    setPanicLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-red-500/20 text-red-500 rounded-xl border border-red-500/30">
          <Scale size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 m-0 mt-1">Guardião Jurídico (TSE)</h2>
          <p className="text-sm text-slate-400 m-0">Compliance, Auditoria Operacional e RAG de Defesa Ativa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Lado Esquerdo: Jurisprudência e Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Base de Dados TRE-RS */}
          <div className="glass-card flex flex-col border border-slate-500/10 flex-1 overflow-hidden">
             <div className="p-4 border-b border-slate-500/10 bg-black/20 flex items-center justify-between">
                <h3 className="font-bold text-slate-300 flex items-center gap-2 m-0 text-sm">
                  <BookOpen size={16} className="text-amber-500" /> Diretrizes TSE & TRE-RS (2026)
                </h3>
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" placeholder="Buscar súmula..." className="bg-slate-900 border border-slate-700 text-slate-300 rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 transition-colors w-40" />
                </div>
             </div>
             <div className="p-4 overflow-y-auto max-h-[250px] flex flex-col gap-3">
               {jurisprudence.map(j => (
                 <div key={j.id} className="bg-slate-900/50 border border-amber-500/20 rounded p-3 hover:bg-slate-800 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{j.tribunal} • {j.date}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{j.theme}</span>
                    </div>
                    <p className="text-sm text-slate-300 m-0 font-medium leading-relaxed">{j.decision}</p>
                 </div>
               ))}
             </div>
          </div>

          {/* Auditoria de WhatsApp e Ações */}
          <div className="glass-card flex flex-col border border-white/5 h-64 overflow-hidden">
             <div className="p-4 border-b border-white/5 bg-black/20">
                <h3 className="font-bold text-slate-300 flex items-center gap-2 m-0 text-sm">
                  <Clock size={16} className="text-sky-500" /> Audit Log de Operações (Backoffice)
                </h3>
             </div>
             <div className="p-0 overflow-y-auto h-full">
               <table className="w-full text-left border-collapse text-xs">
                 <thead>
                   <tr className="bg-slate-900/50 text-slate-500 uppercase tracking-wider border-b border-white/5">
                     <th className="p-3 font-semibold w-12 text-center">Rastro</th>
                     <th className="p-3 font-semibold">Ação Executada</th>
                     <th className="p-3 font-semibold">Operador</th>
                     <th className="p-3 font-semibold text-right">IP/Data</th>
                   </tr>
                 </thead>
                 <tbody>
                   {logs.map(log => (
                     <tr key={log.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5">
                        <td className="p-3 text-center"><CheckCircle size={14} className="text-emerald-500 inline" /></td>
                        <td className="p-3 font-medium font-mono text-xs">{log.action}</td>
                        <td className="p-3 text-sky-400">{log.user}</td>
                        <td className="p-3 text-right text-slate-500">{log.ip} <br/><span className="text-[10px]">{log.timestamp}</span></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>

        {/* Lado Direito: Botão do Pânico (Defesa RAG) */}
        <div className="glass-card flex flex-col border border-red-500/20 bg-gradient-to-b from-red-950/10 to-transparent">
           <div className="p-5 border-b border-red-500/20 bg-red-500/5">
              <h3 className="font-bold text-red-500 flex items-center gap-2 m-0 text-base">
                <ShieldAlert size={20} /> Sentinela Contencioso (Botão de Pânico)
              </h3>
              <p className="text-xs text-red-400/80 m-0 mt-1">Notificado pelo TSE? A IA estruturará uma tese preliminar baseada na jurisprudência local para o corpo jurídico despachar em minutos.</p>
           </div>
           
           <div className="p-5 flex flex-col gap-6 flex-1">
             <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><FileWarning size={14}/> Objeto da Acusação Adversa:</label>
                <textarea 
                  className="bg-slate-900/80 border border-slate-700 rounded-lg p-3 text-sm text-slate-200 resize-none h-24 focus:outline-none focus:border-red-500 transition-colors"
                  defaultValue="Opositor acaba de ingressar com cautelar no site do TRE-RS acusando a postagem número #994 (Inauguração Ponte) como Propaganda Antecipada e Excesso de Gastos."
                />
             </div>

             <button 
               onClick={handlePanicButton} disabled={panicLoading}
               className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all"
             >
               {panicLoading ? <AlertCircle className="animate-spin" size={20} /> : <PlayCircle size={20} />}
               {panicLoading ? 'Gerando Tese de Habeas / Defesa...' : 'Gerar Tese Automática (RAG)'}
             </button>

             <AnimatePresence>
               {panicThesis && !panicLoading && (
                 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 bg-slate-950 border border-red-500/30 rounded-xl p-4 flex flex-col relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={16} className="text-red-400" />
                      <span className="font-bold text-sm text-slate-200">Tese Preliminar Pronta</span>
                    </div>
                    <div className="text-sm text-slate-300 font-medium leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto pr-2 scrollbar-thin">
                       {panicThesis}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 flex gap-3">
                       <button className="flex-1 bg-slate-800 hover:bg-green-600/20 hover:text-green-400 text-slate-400 py-2 rounded font-bold text-xs transition-colors">Aprovar & Encaminhar DJE</button>
                       <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-2 rounded font-bold text-xs transition-colors">Copiar Draft</button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
           </div>
        </div>

      </div>
    </div>
  );
}
