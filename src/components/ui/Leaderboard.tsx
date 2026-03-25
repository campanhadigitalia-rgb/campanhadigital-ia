import { useState } from 'react';
import { Users, TrendingUp, Trophy, Search, Star, Shield, ShieldAlert, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import { type Leader } from '../../services/multipliersService';
import { useCampaignQuery } from '../../hooks/useCampaignQuery';
import { col, COLLECTIONS, db } from '../../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useCampaign } from '../../context/CampaignContext';

export function Leaderboard() {
  const { activeCampaign } = useCampaign();
  const { data: leadersData, loading } = useCampaignQuery<Leader>(col(COLLECTIONS.CONTACTS), 'digitalEngagement');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLeader, setNewLeader] = useState({ name: '', role: '', city: '', votes: 0 });

  // useCampaignQuery already sorts desc, we just map it.
  const leaders = leadersData || [];

  const filtered = leaders.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLoyaltyBadge = (loyalty: string) => {
    switch(loyalty) {
      case 'Fiel': return <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 w-max"><Shield size={12} /> Orgânico</span>;
      case 'Balançando': return <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 w-max"><ShieldAlert size={12} /> Oscilante</span>;
      default: return <span className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase rounded-md flex items-center gap-1 w-max"><XIcon size={12} /> Afastado</span>;
    }
  };

  const handleAddLeader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return alert('Selecione uma campanha primeiro.');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, COLLECTIONS.CONTACTS), {
        campaign_id: activeCampaign.id,
        name: newLeader.name,
        role: newLeader.role,
        city: newLeader.city,
        estimatedVotes: newLeader.votes,
        loyalty: 'Fiel',
        digitalEngagement: 0,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewLeader({ name: '', role: '', city: '', votes: 0 });
    } catch (error) {
      console.error('Erro ao adicionar líder', error);
      alert('Erro ao salvar multiplicador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-full">
      {/* Esquerda: CRM Tabela de Lideranças */}
      <div className="flex-1 glass-card flex flex-col border border-white/5 overflow-hidden">
        <div className="p-5 border-b border-white/5 bg-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 m-0">
              <Users size={20} className="text-indigo-400" />
              Gestão de Multiplicadores
            </h2>
            <p className="text-xs text-slate-400 m-0">Cadastro do CRM Político com proteção Multi-Tenant</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar líder..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-sm text-white px-9 py-2 rounded-lg outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase py-2 px-4 rounded-lg transition-all shadow-lg w-full sm:w-auto"
            >
              + Multiplicador
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold border-b border-white/5">Nome da Liderança</th>
                <th className="p-4 font-semibold border-b border-white/5">Cargo/Papel</th>
                <th className="p-4 font-semibold border-b border-white/5">Base (Cidade)</th>
                <th className="p-4 font-semibold border-b border-white/5 text-right">Potencial de Votos</th>
                <th className="p-4 font-semibold border-b border-white/5">Fidelidade</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Buscando banco de multiplicadores...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum líder encontrado.</td></tr>
              ) : (
                filtered.map((l, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={l.id} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-default"
                  >
                    <td className="p-4 font-medium text-slate-200">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex flex-shrink-0 items-center justify-center text-indigo-300 font-bold font-mono text-xs border border-indigo-500/20">
                           {l.name.charAt(0)}
                         </div>
                         {l.name}
                      </div>
                    </td>
                    <td className="p-4 text-slate-400">{l.role}</td>
                    <td className="p-4 text-slate-400">{l.city}</td>
                    <td className="p-4 font-bold text-slate-300 text-right">{new Intl.NumberFormat('pt-BR').format(l.estimatedVotes)}</td>
                    <td className="p-4">{getLoyaltyBadge(l.loyalty)}</td>
                  </motion.tr>
               ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Direita: Gamificação Militância */}
      <div className="w-full xl:w-80 glass-card flex flex-col border border-indigo-500/10 bg-gradient-to-b from-indigo-950/20 to-slate-950/50 shadow-xl shadow-black/40">
        <div className="p-5 border-b border-indigo-500/10 flex items-center justify-center bg-indigo-900/10">
          <h2 className="text-base font-bold text-indigo-300 flex items-center gap-2 m-0 uppercase tracking-widest text-center">
            <Trophy size={18} className="text-amber-400" />
            Ranking Militância
          </h2>
        </div>
        
        <div className="flex-1 p-5 flex flex-col gap-4">
          <p className="text-xs text-slate-400 text-center -mt-2 mb-2">
            Baseado em volume de compartilhamentos e geração de engajamento social nas últimas 24h.
          </p>

          {loading ? (
             <div className="animate-pulse h-full bg-slate-800/20 rounded-lg"></div>
          ) : (
            leaders.slice(0, 3).map((l, idx) => (
              <div key={l.id} className="relative p-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 transition-colors flex flex-col gap-2 overflow-hidden group">
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                   <TrendingUp size={48} className={idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-300' : 'text-amber-700'} />
                </div>
                <div className="flex items-center justify-between z-10">
                   <div className="flex items-center gap-2">
                     <div className={`w-6 h-6 rounded flex items-center justify-center font-black text-xs ${
                       idx === 0 ? 'bg-amber-500 text-black' : 
                       idx === 1 ? 'bg-slate-300 text-black' : 
                       'bg-amber-800 text-white'
                     }`}>
                       #{idx + 1}
                     </div>
                     <span className="font-bold text-slate-200 text-sm truncate max-w-[140px]">{l.name}</span>
                   </div>
                   {idx === 0 && <Star size={14} className="text-amber-400 fill-amber-400 animate-pulse" />}
                </div>
                
                <div className="flex items-end justify-between mt-2 z-10">
                   <div className="text-[10px] uppercase font-bold text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                     {l.city}
                   </div>
                   <div className="flex flex-col items-end">
                     <span className="text-[10px] text-slate-400 uppercase font-bold">Score Digital</span>
                     <span className="text-lg font-black text-indigo-400 leading-none">{l.digitalEngagement.toLocaleString()}</span>
                   </div>
                </div>
              </div>
            ))
          )}

          <button className="mt-auto w-full py-2.5 rounded-lg border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-2">
            <Award size={14} /> Ver Hall da Fama Completo
          </button>
        </div>
      </div>

      {/* Modal Adicionar Liderança */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold text-slate-100 mb-4 uppercase tracking-tight">Novo Multiplicador</h3>
            <form onSubmit={handleAddLeader} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Nome Completo</label>
                <input required value={newLeader.name} onChange={e => setNewLeader({...newLeader, name: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Ex: Maria Antonieta" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Base/Cidade</label>
                  <input required value={newLeader.city} onChange={e => setNewLeader({...newLeader, city: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Ex: Centro" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase">Cargo/Papel</label>
                  <input required value={newLeader.role} onChange={e => setNewLeader({...newLeader, role: e.target.value})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-indigo-500" placeholder="Ex: Coordenadora" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase">Estimativa de Votos (Influência)</label>
                <input type="number" required min="0" value={newLeader.votes} onChange={e => setNewLeader({...newLeader, votes: parseInt(e.target.value) || 0})} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white text-sm outline-none focus:border-indigo-500" />
              </div>

              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-slate-400 text-sm font-bold hover:bg-slate-800 transition-all">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold uppercase transition-all disabled:opacity-50">
                  {isSubmitting ? 'Salvando...' : 'Salvar Líder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper stub para icone XIcon
import type { SVGProps } from 'react';
function XIcon({ size, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
}
