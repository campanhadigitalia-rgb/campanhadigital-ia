import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Route, Navigation2, CheckCircle, Clock, Zap, Target, MoreVertical, X, AlertTriangle } from 'lucide-react';
import { type CampaignEvent, fetchEvents, simulateTravelTime, suggestStrategicStop } from '../../services/eventService';
import { useCampaign } from '../../context/CampaignContext';

export function CampaignCalendar() {
  const { campaignId } = useCampaign();
  const [events, setEvents] = useState<CampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CampaignEvent | null>(null);

  useEffect(() => {
    fetchEvents(campaignId).then(data => {
      setEvents(data);
      setLoading(false);
    });
  }, [campaignId]);

  const handleSuggest = async () => {
    setSuggesting(true);
    const suggestion = await suggestStrategicStop();
    setEvents(prev => {
      // Evita duplicidade se clicar váriaz vezes
      if (prev.find(e => e.id === suggestion.id)) return prev;
      return [...prev, suggestion].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    setSuggesting(false);
    setSelectedEvent(suggestion); // Auto-Abre a ficha da sugestão da IA
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Confirmado': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'Pendente': return <Clock size={14} className="text-amber-400" />;
      case 'Estratégico': return <Zap size={14} className="text-indigo-400" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-full">
      {/* Esquerda: Lista de Eventos */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 m-0">
              <Route size={22} className="text-indigo-400" />
              Agenda & Maestro de Rotas
            </h2>
            <p className="text-sm text-slate-400">Roteiro Otimizado da Campanha 2026</p>
          </div>
          <button
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40 hover:text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:opacity-50"
          >
            {suggesting ? <Zap className="animate-pulse" size={16} /> : <Target size={16} />}
            {suggesting ? 'Analisando Redes...' : 'Sugerir Próxima Parada (IA)'}
          </button>
        </div>

        <div className="glass-card flex-1 p-4 flex flex-col gap-3 min-h-[400px] overflow-y-auto">
          {loading ? (
             <div className="flex h-full items-center justify-center text-slate-500 animate-pulse">
               Carregando eventos sincronizados...
             </div>
          ) : (
            <AnimatePresence>
              {events.map((evt, idx) => {
                const prevEvent = idx > 0 ? events[idx - 1] : null;
                let travelInfo = null;
                
                // Calcula deslocamento se tiver cidade anterior diferente
                if (prevEvent && prevEvent.city !== evt.city) {
                  travelInfo = simulateTravelTime(prevEvent.city, evt.city);
                }

                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex flex-col gap-2"
                  >
                    {/* Trajeto Intermediário */}
                    {travelInfo && (
                       <div className="flex items-center gap-3 text-slate-500 ml-6 py-1">
                         <div className="w-0.5 h-6 bg-slate-700/50"></div>
                         <Navigation2 size={12} className="transform rotate-180" />
                         <span className="text-xs font-medium">Trânsito Terrestre: ~{travelInfo.time} ({travelInfo.distance})</span>
                       </div>
                    )}

                    {/* Card do Evento */}
                    <div 
                      onClick={() => setSelectedEvent(evt)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
                        selectedEvent?.id === evt.id ? 'bg-indigo-900/30 border-indigo-500/50 shadow-lg' :
                        evt.status === 'Estratégico' ? 'bg-indigo-950/10 border-indigo-500/20 hover:border-indigo-500/40' :
                        'bg-slate-900/50 border-white/5 hover:bg-slate-800'
                      }`}
                    >
                      {/* Data Colbox */}
                      <div className="flex flex-col items-center justify-center px-3 py-1 bg-black/20 rounded-lg min-w-[70px]">
                        <span className="text-xs text-slate-400 font-bold uppercase">{new Date(evt.date).toLocaleDateString((typeof window !== 'undefined' ? navigator.language : 'pt-BR'), { weekday: 'short' })}</span>
                        <span className="text-xl text-slate-100 font-black">{new Date(evt.date).getDate()}</span>
                      </div>

                      <div className="flex flex-col flex-1 justify-center gap-1">
                        <div className="flex items-center gap-2">
                           {getStatusIcon(evt.status)}
                           <span className={`text-xs font-bold uppercase ${
                             evt.status === 'Confirmado' ? 'text-emerald-400' : 
                             evt.status === 'Estratégico' ? 'text-indigo-400 animate-pulse' : 'text-amber-400'
                           }`}>
                             {evt.status}
                           </span>
                           <span className="text-xs text-slate-500 px-2 border-l border-white/10">{evt.type}</span>
                        </div>
                        <h4 className="m-0 text-base font-bold text-slate-100">{evt.title}</h4>
                        <div className="flex items-center gap-1 text-slate-400 text-sm font-medium">
                          <Map size={14} /> {evt.city}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-center text-slate-600">
                         <MoreVertical size={20} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Direita: Ficha do Município */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:w-1/3 glass-card p-0 flex flex-col border border-indigo-500/20 shadow-[-10px_0_30px_rgba(99,102,241,0.05)] overflow-hidden"
          >
            <div className="p-4 bg-indigo-950/40 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-indigo-300 flex items-center gap-2 m-0 uppercase text-sm tracking-widest">
                <Target size={16} />
                Ficha de Município
              </h3>
              <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-black text-white m-0 tracking-tight">{selectedEvent.city}</h2>
                <div className="text-sm font-medium text-indigo-400 mt-1 flex items-center gap-1">
                  {selectedEvent.status === 'Estratégico' && <Zap size={14} />} Destino da Agenda
                </div>
              </div>

              {/* Stats Grid */}
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Retrospecto 2022</span>
                  <span className="text-base font-semibold text-slate-200">{selectedEvent.stats.votes2022}</span>
                </div>
                
                <div className="p-4 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-500 uppercase">Contato Institucional (Líder)</span>
                  <span className="text-base font-semibold text-slate-200 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    {selectedEvent.stats.localLeader}
                  </span>
                </div>

                <div className="p-4 rounded-lg border flex flex-col gap-1 relative overflow-hidden
                  bg-rose-950/10 border-rose-500/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.02)]
                ">
                  <span className="text-xs font-bold text-rose-500 uppercase z-10">Ponto Sensível Alvo</span>
                  <span className="text-base font-bold text-rose-200 z-10">{selectedEvent.stats.mainComplaint}</span>
                  <div className="absolute -bottom-4 -right-2 opacity-10 text-rose-500">
                    <AlertTriangle size={64} />
                  </div>
                </div>
              </div>

              {selectedEvent.status === 'Estratégico' && (
                <div className="mt-2 p-3 rounded bg-indigo-600/20 text-indigo-300 text-xs text-center border border-indigo-500/30">
                  <strong className="block mb-1 text-indigo-200">🤖 RECOMENDAÇÃO DE IA</strong>
                  Este evento foi adicionado dinamicamente para amenizar crises ativas do SocialSentinel.
                </div>
              )}

              <button className="mt-auto w-full py-3 rounded-lg bg-slate-100 text-slate-900 font-bold hover:bg-white transition-colors">
                Abrir Mapa de Rotas
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
