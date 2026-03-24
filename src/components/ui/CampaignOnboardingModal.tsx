import { motion, AnimatePresence } from 'framer-motion';
import { Building2 } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';

export function CampaignOnboardingModal() {
  const { activeCampaign, campaigns, selectCampaign, loading } = useCampaign();
  
  // Show if campaigns finished loading, and there's no active campaign selected
  const isVisible = !loading && activeCampaign === null;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
         initial={{ opacity: 0 }} 
         animate={{ opacity: 1 }} 
         exit={{ opacity: 0 }}
         className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div 
           initial={{ scale: 0.95, y: 20 }} 
           animate={{ scale: 1, y: 0 }}
           className="glass-card w-full max-w-md p-8 flex flex-col items-center gap-6 border border-indigo-500/30 text-center bg-slate-900 shadow-2xl shadow-indigo-500/10"
        >
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-2">
            <Building2 size={32} />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo(a) ao Comando</h2>
            <p className="text-slate-400 text-sm"> Qual campanha você deseja gerenciar hoje? </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-4">
            {campaigns.length === 0 ? (
               <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg">
                 <p className="text-amber-400 text-sm">Sua conta ainda não está vinculada a nenhuma campanha ativa. Solicite o acesso ao Admin.</p>
               </div>
            ) : (
              campaigns.map(c => (
                <button 
                  key={c.id}
                  onClick={() => selectCampaign(c.id)}
                  className="w-full p-4 border border-slate-700 bg-slate-800/50 hover:bg-indigo-600 hover:border-indigo-500 rounded-lg text-left transition-all group flex justify-between items-center"
                >
                  <div>
                    <span className="block font-bold text-slate-200 group-hover:text-white">{c.name}</span>
                    <span className="block text-xs text-slate-500 group-hover:text-indigo-200">Ano: {c.year}</span>
                  </div>
                  <span className="text-indigo-500 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    Acessar &rarr;
                  </span>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
