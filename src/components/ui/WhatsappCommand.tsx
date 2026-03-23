import { useState, useEffect } from 'react';
import { Send, MessageCircle, ShieldCheck, CheckSquare, Square, Search, Copy, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { fetchMilitancyCells, fetchQuickReplies, dispatchPlatformBroadcast, type MilitancyCell, type FAQItem } from '../../services/messagingService';
import { useCampaign } from '../../context/CampaignContext';

export function WhatsappCommand() {
  const { campaignId } = useCampaign();
  const [cells, setCells] = useState<MilitancyCell[]>([]);
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [copiedFaq, setCopiedFaq] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchMilitancyCells(campaignId),
      fetchQuickReplies()
    ]).then(([cellsData, faqsData]) => {
      setCells(cellsData);
      setFaqs(faqsData);
      setLoading(false);
    });
  }, [campaignId]);

  const toggleCell = (id: string) => {
    const next = new Set(selectedCells);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCells(next);
  };

  const handleDispatch = async () => {
    if (selectedCells.size === 0) return;
    setIsDispatching(true);
    setDispatchSuccess(false);
    
    await dispatchPlatformBroadcast(Array.from(selectedCells), { type: 'STUDIO_CONTENT_DRAFT' });
    
    setIsDispatching(false);
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 5000);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFaq(id);
    setTimeout(() => setCopiedFaq(null), 2000);
  };

  const chartData = cells.map(c => ({
    name: c.name.split(' ')[0] + '...',
    Alcance: c.estimatedReach,
    Membros: c.memberCount
  }));

  const totalReach = Array.from(selectedCells).reduce((acc, id) => {
    const cell = cells.find(c => c.id === id);
    return acc + (cell ? cell.estimatedReach : 0);
  }, 0);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-emerald-500 animate-pulse">
        Conectando aos Webhooks de Mensageria...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full">
      
      {/* 5. LGPD Compliance Alert */}
      <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-3 sm:p-4 flex items-start sm:items-center gap-3 shadow-lg shadow-emerald-500/5">
        <ShieldCheck className="text-emerald-400 w-8 h-8 flex-shrink-0" />
        <div className="flex flex-col">
          <h3 className="text-emerald-400 font-bold text-sm m-0 flex items-center gap-2">
            LGPD Compliance Tracking & Criptografia 
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">Ativo</span>
          </h3>
          <p className="text-slate-300 text-xs sm:text-sm m-0 mt-0.5">
            Todos os contatos listados nesta central deram opt-in explícito (Double Opt-in) nas campanhas base do CRM de Multiplicadores. Os disparos via Twilio/API Cloud mantêm os números anonimizados neste painel.
          </p>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Esquerda: Disparo de Células */}
        <div className="flex-1 glass-card flex flex-col border border-white/5 overflow-hidden">
          <div className="p-5 border-b border-white/5 bg-black/20 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2 m-0">
                <Send size={20} />
                Disparo Oficial (Groups & Broadcasts)
              </h2>
              <p className="text-xs text-slate-400 m-0">Gerencie e envie scripts da Fábrica de Conteúdo para os cordenadores.</p>
            </div>
            
             <button 
               onClick={handleDispatch}
               disabled={selectedCells.size === 0 || isDispatching}
               className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:shadow-none transition-all border border-emerald-500"
             >
               {isDispatching ? <AlertTriangle className="animate-spin" size={18} /> : dispatchSuccess ? <CheckCircle2 size={18} /> : <Send size={18} />}
               {isDispatching ? 'Disparando APi...' : dispatchSuccess ? 'Disparo Concluído!' : `Disparar Mídia`}
             </button>
          </div>

          <div className="p-0 overflow-x-auto min-h-[250px] bg-slate-900/30">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider border-b border-white/5">
                  <th className="p-4 w-12 text-center">
                    <button onClick={() => setSelectedCells(selectedCells.size === cells.length ? new Set() : new Set(cells.map(c => c.id)))} className="text-slate-500 hover:text-emerald-400">
                       {selectedCells.size === cells.length ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-4 font-semibold">Célula de Militância</th>
                  <th className="p-4 font-semibold">Região</th>
                  <th className="p-4 font-semibold text-right">Membros / Opt-in</th>
                  <th className="p-4 font-semibold text-right">Alcance Direto Estimado</th>
                  <th className="p-4 font-semibold text-center">Webhook Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {cells.map(c => (
                   <tr key={c.id} className={`border-b border-white/5 transition-colors cursor-pointer ${selectedCells.has(c.id) ? 'bg-emerald-950/20' : 'hover:bg-white/5'}`} onClick={() => toggleCell(c.id)}>
                     <td className="p-4 text-center text-slate-500">
                       {selectedCells.has(c.id) ? <CheckSquare size={18} className="text-emerald-400" /> : <Square size={18} />}
                     </td>
                     <td className="p-4 font-medium text-slate-200">{c.name}</td>
                     <td className="p-4 text-slate-400">{c.region}</td>
                     <td className="p-4 text-slate-300 text-right">{new Intl.NumberFormat('pt-BR').format(c.memberCount)}</td>
                     <td className="p-4 font-bold text-emerald-400 text-right">{new Intl.NumberFormat('pt-BR').format(c.estimatedReach)}</td>
                     <td className="p-4 text-center">
                       <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${c.status === 'Online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-500 border border-amber-500/30'}`}>
                         {c.status}
                       </span>
                     </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-black/40 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-emerald-900/30 border border-emerald-500/20 flex flex-col items-center justify-center">
                  <span className="text-emerald-400 font-black text-sm">{selectedCells.size}</span>
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500 uppercase">Células Selecionadas</span>
                 <span className="text-sm font-medium text-slate-200">Impacto Estimado: <strong className="text-emerald-400">{new Intl.NumberFormat('pt-BR').format(totalReach)} contatos</strong></span>
               </div>
             </div>

             <button 
               onClick={handleDispatch}
               disabled={selectedCells.size === 0 || isDispatching}
               className="w-full sm:hidden flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-3 rounded-lg font-bold text-sm transition-all"
             >
               {isDispatching ? <AlertTriangle className="animate-spin" size={18} /> : <Send size={18} />}
               Disparar WhatsApp API
             </button>
          </div>
        </div>

        {/* Direita: Gráficos e FAQ */}
        <div className="w-full xl:w-96 flex flex-col gap-6">
          
          {/* Gráfico de Viralização */}
          <div className="glass-card flex flex-col border border-emerald-500/10 h-[280px]">
             <div className="p-4 border-b border-emerald-500/10 bg-emerald-950/10">
                <h3 className="font-bold text-emerald-400 flex items-center gap-2 m-0 text-sm uppercase tracking-wider">
                  <TrendingUp size={16} /> Mapa de Viralização
                </h3>
             </div>
             <div className="flex-1 p-4 pb-0">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: -10 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                   <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                   <Tooltip 
                     cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                     contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}
                   />
                   <Bar dataKey="Alcance" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>

          {/* Biblioteca FAQ / Zap */}
          <div className="glass-card flex flex-col border border-white/5 flex-1 overflow-hidden">
             <div className="p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
                <h3 className="font-bold text-slate-100 flex items-center gap-2 m-0 text-sm uppercase tracking-wider">
                  <MessageCircle size={16} className="text-sky-400" /> FAQ de Bolso (Respostas Rápidas)
                </h3>
             </div>
             <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
               {faqs.map(faq => (
                 <div key={faq.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-sky-500/30 transition-colors group">
                    <p className="font-bold text-sky-400 text-xs mb-2 flex items-center gap-1.5 uppercase">
                      <Search size={12} /> Gatilho: {faq.trigger}
                    </p>
                    <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs text-slate-300 font-medium whitespace-pre-wrap leading-relaxed shadow-inner">
                      {faq.text}
                    </div>
                    <button 
                      onClick={() => handleCopy(faq.id, faq.text)}
                      className="mt-3 w-full py-1.5 flex items-center justify-center gap-2 bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-400 rounded text-xs font-bold transition-colors"
                    >
                      {copiedFaq === faq.id ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      {copiedFaq === faq.id ? <span className="text-emerald-400">Copiado na área de transferência!</span> : 'Copiar Texto para o Zap'}
                    </button>
                 </div>
               ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
