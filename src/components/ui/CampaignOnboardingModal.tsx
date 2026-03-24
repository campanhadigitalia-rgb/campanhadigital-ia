import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Sparkles, Users, History, Check, Loader2 } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';

export function CampaignOnboardingModal() {
  const { activeCampaign, campaigns, selectCampaign, createCampaign, loading } = useCampaign();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [legacyId, setLegacyId] = useState('');
  const [syncCrm, setSyncCrm] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isVisible = !loading && activeCampaign === null;

  if (!isVisible) return null;

  const handleCreate = async () => {
    if (!newCampaignName) return;
    setIsSubmitting(true);
    await createCampaign({
      name: newCampaignName,
      year: 2026,
      legacy_id: legacyId || undefined,
      sync_crm: syncCrm
    });
    setIsSubmitting(false);
    setIsCreating(false);
  };

  return (
    <AnimatePresence>
      <motion.div 
         initial={{ opacity: 0 }} 
         animate={{ opacity: 1 }} 
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
      >
        <motion.div 
           initial={{ scale: 0.95, y: 20 }} 
           animate={{ scale: 1, y: 0 }}
           className="glass-card w-full max-w-md p-8 flex flex-col gap-6 border border-indigo-500/30 bg-slate-900 shadow-2xl relative"
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-2">
              <Building2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-0">Decisora Estratégica</h2>
            <p className="text-slate-400 text-sm">Selecione ou crie sua nova instância de CampanhaDigitalIA</p>
          </div>

          {!isCreating ? (
            <div className="flex flex-col gap-3 w-full">
              {campaigns.length === 0 ? (
                 <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg text-center">
                   <p className="text-amber-400 text-sm">Nenhuma campanha vinculada.</p>
                 </div>
              ) : (
                campaigns.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => selectCampaign(c.id)}
                    className="w-full p-4 border border-slate-700 bg-slate-800/50 hover:bg-slate-800 rounded-lg text-left transition-all group flex justify-between items-center"
                  >
                    <div>
                      <span className="block font-bold text-slate-200 group-hover:text-indigo-400">{c.name}</span>
                      <span className="block text-xs text-slate-500 uppercase tracking-widest pl-0 mt-1">Legado: {c.year}</span>
                    </div>
                    <Check size={16} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))
              )}
              
              <button 
                onClick={() => setIsCreating(true)}
                className="w-full mt-4 p-4 border-2 border-dashed border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-center transition-all group"
              >
                <div className="flex items-center justify-center gap-2 text-indigo-400 font-bold uppercase text-xs tracking-widest">
                  <Plus size={16} /> Nova Campanha 2026
                </div>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5 w-full">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest pl-1">Identidade da Campanha</label>
                <input 
                  type="text" 
                  placeholder="Ex: Rio Grande do Sul 2026"
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:border-indigo-500/50 focus:outline-none transition-all"
                  value={newCampaignName}
                  onChange={e => setNewCampaignName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest pl-1 flex items-center gap-2">
                  <History size={12} /> Herança de Legado (Opcional)
                </label>
                <select 
                  className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-3 text-slate-200 focus:border-indigo-500/50 focus:outline-none transition-all"
                  value={legacyId}
                  onChange={e => setLegacyId(e.target.value)}
                >
                  <option value="">Nenhuma Base Base de Conhecimento</option>
                  {campaigns.filter(c => c.year < 2026).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.year})</option>
                  ))}
                </select>
                {legacyId && (
                  <div className="flex flex-col gap-2 mt-3 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={syncCrm}
                        onChange={e => setSyncCrm(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-slate-400 font-bold group-hover:text-slate-200 transition-colors flex items-center gap-1">
                        <Users size={12} /> Sincronizar CRM (Multiplicadores/Líderes)
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        defaultChecked
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] text-slate-400 font-bold group-hover:text-slate-200 transition-colors flex items-center gap-1">
                        <Sparkles size={12} /> Ativar Memória IA de Discurso Histórico
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-slate-400 font-bold text-xs uppercase hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreate}
                  disabled={!newCampaignName || isSubmitting}
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs uppercase py-3 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Instanciar Agora
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
