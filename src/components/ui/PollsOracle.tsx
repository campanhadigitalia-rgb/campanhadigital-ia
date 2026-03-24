import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, AlertTriangle, Target, Users, ArrowRightLeft, Loader2, PieChart as PieIcon, MapPin } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { getPollTrackingHistory, simulateSecondRound, generateRegionalReport, type PollData, type OracleReport } from '../../services/oracleService';

export function PollsOracle() {
  const [history, setHistory] = useState<PollData[]>([]);
  const [reports, setReports] = useState<OracleReport[]>([]);
  
  const [opponent, setOpponent] = useState('cand_centro');
  const [simResults, setSimResults] = useState<{winner: string, govo: number, oppo: number} | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    Promise.all([
      getPollTrackingHistory(),
      generateRegionalReport()
    ]).then(([historyData, reportsData]) => {
      setHistory(historyData);
      setReports(reportsData);
    });
  }, []);

  const handleSimulate = async () => {
    setSimLoading(true);
    const res = await simulateSecondRound(opponent);
    setSimResults(res);
    setSimLoading(false);
  };

  const getMarginColor = (margin: number) => {
    if (margin < 2.0) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    if (margin >= 5.0) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    return 'text-sky-500 bg-sky-500/10 border-sky-500/30';
  };

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-fuchsia-500/20 text-fuchsia-400 rounded-xl border border-fuchsia-500/30">
          <Brain size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 m-0 mt-1">O Oráculo Eleitoral</h2>
          <p className="text-sm text-slate-400 m-0">Preditor IA de Tendências, Votos em Risco e Metas Georreferenciadas</p>
        </div>
        <div className="ml-auto flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-white/5">
           <button 
             onClick={() => setShowHistorical(false)}
             className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${!showHistorical ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Projeção 2026
           </button>
           <button 
             onClick={() => setShowHistorical(true)}
             className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${showHistorical ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Resultado Real 2022
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Tracking Semanal */}
        <div className="glass-card flex flex-col border border-fuchsia-500/10 min-h-[350px]">
          <div className="p-4 border-b border-fuchsia-500/10 bg-black/20 flex justify-between items-center">
             <h3 className="font-bold text-fuchsia-300 flex items-center gap-2 m-0 text-sm">
               <TrendingUp size={16} /> Evolução: Intenção x Entregas da Agenda
             </h3>
          </div>
          <div className="p-4 pt-6" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={history} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(217,70,239,0.3)', borderRadius: '8px', zIndex: 1000 }}
                  labelStyle={{ color: '#d946ef', fontWeight: 'bold', marginBottom: 4 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                
                <Bar dataKey="eventsCount" name="Atos de Campanha (Qtd)" fill="rgba(217,70,239,0.2)" radius={[4, 4, 0, 0]} yAxisId="right" />
                <Line type="monotone" dataKey="Governador" name="Nosso Candidato (%)" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} yAxisId="left" />
                <Line type="monotone" dataKey="AdversarioA" name="Principal Opositor (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} yAxisId="left" />
                <Line type="monotone" dataKey="Indecisos" name="Indecisos (%)" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} yAxisId="left" />
                
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 60]} style={{ display: 'none' }} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 15]} style={{ display: 'none' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Simulador de 2º Turno */}
        <div className="flex flex-col gap-6">
          <div className="glass-card flex flex-col border border-indigo-500/10 flex-1">
            <div className="p-4 border-b border-indigo-500/10 bg-black/20">
               <h3 className="font-bold text-indigo-300 flex items-center gap-2 m-0 text-sm">
                 <ArrowRightLeft size={16} /> Laboratório de Transferência: 2º Turno
               </h3>
            </div>
            <div className="p-4 flex flex-col gap-4">
               <div className="flex flex-col sm:flex-row gap-2">
                 <select 
                   value={opponent} onChange={e => setOpponent(e.target.value)}
                   className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                 >
                   <option value="cand_centro">Cenário: Ciro (Centro Político)</option>
                   <option value="cand_esquerda">Cenário: Pretto (Esquerda)</option>
                   <option value="cand_direita_radical">Cenário: Onyx (Direita Antissistema)</option>
                 </select>
                 <button 
                   onClick={handleSimulate} disabled={simLoading}
                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                 >
                   {simLoading ? <Loader2 size={16} className="animate-spin" /> : <PieIcon size={16} />}
                   Simular Radar
                 </button>
               </div>

               {/* Resultados da Simulação PieChart */}
               <AnimatePresence mode="wait">
                 {simResults && !simLoading && (
                   <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex-1 flex items-center justify-center gap-6 bg-slate-900/30 rounded-xl p-4 border border-indigo-500/20">
                      <div className="w-32 h-32 relative">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[{ name: 'Governador', value: simResults.govo }, { name: 'Adversário', value: simResults.oppo }]}
                              innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value"
                            >
                              {[{ name: 'Governador' }, { name: 'Adversário' }].map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-slate-400">VOTOS VÁLIDOS</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                         <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-emerald-500" />
                           <div className="flex flex-col">
                             <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">Nosso Projeto</span>
                             <span className="text-lg font-black text-emerald-400 leading-none">{simResults.govo}%</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="w-3 h-3 rounded-full bg-red-500" />
                           <div className="flex flex-col">
                             <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">Oposição Isolada</span>
                             <span className="text-lg font-black text-red-500 leading-none">{simResults.oppo}%</span>
                           </div>
                         </div>
                      </div>
                   </motion.div>
                 )}
                 {!simResults && !simLoading && (
                   <div className="flex-1 flex flex-col items-center justify-center text-indigo-500/50 min-h-[150px] gap-2 border border-dashed border-indigo-500/20 rounded-xl">
                      <Brain size={32} />
                      <span className="text-sm font-medium">Selecione o adversário para rodar IA Híbrida</span>
                   </div>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Relatório de Cidades em Risco / Metas CRM */}
      <div className="glass-card flex flex-col border border-white/5 overflow-hidden">
         <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-slate-100 flex items-center gap-2 m-0 text-sm">
              <Target size={16} className="text-emerald-400" /> Painel de Fronteiras: Conversão Diária (1º Turno)
            </h3>
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-500">
               <AlertTriangle size={14} /> Foco Urgente: Margem &lt; 2%
            </div>
         </div>
         <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
               <thead>
                 <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                   <th className="p-4 font-semibold">Município Chave</th>
                   <th className="p-4 font-semibold text-center">{showHistorical ? 'Votos Reais (2022)' : 'Intenção Preditiva'}</th>
                   <th className="p-4 font-semibold text-center">{showHistorical ? 'Performance Passada' : 'Risco / Margem do Oponente'}</th>
                   <th className="p-4 font-semibold text-right">{showHistorical ? 'Delta Esperado' : 'Meta Virada (Votos Novos/Dia)'}</th>
                   <th className="p-4 font-semibold text-right">Acionar Coordenador CRM</th>
                 </tr>
               </thead>
               <tbody className="text-sm">
                 {reports.map((r, idx) => (
                    <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-4 font-bold text-slate-200 flex items-center gap-2">
                        <MapPin size={14} className="text-slate-500" /> {r.city}
                      </td>
                      <td className="p-4 text-center text-slate-300 font-medium">
                        {showHistorical ? `${(40 + Math.random() * 15).toFixed(1)}%` : `${r.intent}%`}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-bold uppercase rounded border ${showHistorical ? 'text-amber-500 bg-amber-500/10 border-amber-500/30' : getMarginColor(r.margin)}`}>
                          {showHistorical ? 'Resultado Consolidado' : (r.margin < 2.0 && <AlertTriangle size={12} />)}
                          {showHistorical ? 'Finalizado' : `Vantagem: +${r.margin.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className={`p-4 font-black text-right text-lg ${showHistorical ? 'text-indigo-400' : 'text-emerald-400'}`}>
                        {showHistorical ? `${(Math.random() * 5).toFixed(1)}%` : `+${r.requiredDailyNewVotes.toLocaleString('pt-BR')}`}
                        <span className="text-[10px] text-slate-500 font-normal ml-1 uppercase">{showHistorical ? ' de crescimento' : ' votos/dia'}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="flex items-center justify-end gap-2 text-sky-400 hover:text-sky-300 font-bold ml-auto group">
                          <Users size={14} /> {r.coordinator}
                        </button>
                      </td>
                    </tr>
                 ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
}
