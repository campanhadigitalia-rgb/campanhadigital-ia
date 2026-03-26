import { useState } from 'react';
import { User, Target, Map, Sparkles, Plus, Trash2, Save, Camera, Users } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { suggestOpponents } from '../../services/aiService';
import { runMonitoringCycle } from '../../services/monitorService';
import type { Competitor, CampaignIdentity } from '../../types';

export default function IdentitySettings() {
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // Identity State
  const [identity, setIdentity] = useState<CampaignIdentity>(
    activeCampaign?.identity || {
      name: '',
      urnName: '',
      position: '',
      location: '',
      party: '',
      coalition: '',
      state: '',
      history: '',
      bio_base: '',
      ai_directives: '',
      photoOfficial: '',
      subCharacters: []
    }
  );

  // Competitors State
  const [competitors, setCompetitors] = useState<Competitor[]>(
    activeCampaign?.competitors || []
  );

  // Neighborhood State
  const [neighborhood, setNeighborhood] = useState<string[]>(
    activeCampaign?.neighborhood || []
  );

  const handleSave = async () => {
    if (!activeCampaign) return;
    setLoading(true);
    try {
      const ref = doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id);
      await updateDoc(ref, {
        identity,
        competitors,
        neighborhood,
        updatedAt: new Date()
      });
      alert('Configurações de Identidade salvas com sucesso!');
      
      // Dispara ciclo de monitoramento em background para já popular o dashboard
      runMonitoringCycle(activeCampaign).catch(err => {
        console.error("Monitor Cycle Background Error:", err);
      });
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    if (!identity.position || !identity.location) {
      alert('Preencha o Cargo e a Localização para sugerir oponentes.');
      return;
    }
    setSuggesting(true);
    try {
      const suggestions = await suggestOpponents(identity.position, identity.location);
      const newCompetitors: Competitor[] = suggestions.map((s, i) => ({
        id: `suggested-${Date.now()}-${i}`,
        name: s.name || 'Oponente Sugerido',
        socials: s.socials || {},
        sentiment: 'neutral'
      }));
      setCompetitors([...competitors, ...newCompetitors]);
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const addManualCompetitor = () => {
    const newComp: Competitor = {
      id: `manual-${Date.now()}`,
      name: '',
      socials: {},
      sentiment: 'neutral'
    };
    setCompetitors([...competitors, newComp]);
  };

  const removeCompetitor = (id: string) => {
    setCompetitors(competitors.filter((c: Competitor) => c.id !== id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setIdentity({ ...identity, photoOfficial: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const addSubCharacter = () => {
    const newChars = [...(identity.subCharacters || [])];
    newChars.push({ role: 'Vice-Prefeito', name: '' });
    setIdentity({ ...identity, subCharacters: newChars });
  };

  const removeSubCharacter = (idx: number) => {
    const newChars = [...(identity.subCharacters || [])];
    newChars.splice(idx, 1);
    setIdentity({ ...identity, subCharacters: newChars });
  };

  const updateSubCharacter = (idx: number, field: string, value: string) => {
    const newChars = [...(identity.subCharacters || [])];
    newChars[idx] = { ...newChars[idx], [field]: value };
    setIdentity({ ...identity, subCharacters: newChars });
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* 1. Perfil do Candidato */}
      <section className="glass-card p-6 border-indigo-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
            <User size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Quem sou eu</h2>
            <p className="text-xs text-slate-500">Defina a identidade que a IA assumirá em toda a plataforma.</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Photo Section */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative group w-32 h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
              {identity.photoOfficial ? (
                <img src={identity.photoOfficial} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                  <User size={40} />
                </div>
              )}
              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera size={24} className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase">Foto Oficial</p>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome Civil</label>
              <input 
                value={identity.name}
                onChange={e => setIdentity({...identity, name: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
                placeholder="Ex: João da Silva Santos"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Nome de Urna / Campanha</label>
              <input 
                value={identity.urnName}
                onChange={e => setIdentity({...identity, urnName: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
                placeholder="Ex: João do Povo"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Cargo Desejado</label>
              <input 
                value={identity.position}
                onChange={e => setIdentity({...identity, position: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
                placeholder="Ex: Prefeito"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Cidade Sede / Concorrência</label>
              <input 
                value={identity.location}
                onChange={e => setIdentity({...identity, location: e.target.value})}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
                placeholder="Ex: Porto Alegre"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Estado (UF)</label>
            <input 
              value={identity.state}
              onChange={e => setIdentity({...identity, state: e.target.value})}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
              placeholder="Ex: RS"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Partido</label>
            <input 
              value={identity.party}
              onChange={e => setIdentity({...identity, party: e.target.value})}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
              placeholder="Ex: PL"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Coligação</label>
            <input 
              value={identity.coalition}
              onChange={e => setIdentity({...identity, coalition: e.target.value})}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none" 
              placeholder="Ex: Mudança Já (PL/PP/MDB)"
            />
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Histórico Político</label>
          <textarea 
            value={identity.history}
            onChange={e => setIdentity({...identity, history: e.target.value})}
            rows={3}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none resize-none" 
            placeholder="Relate mandatos anteriores, cargos ocupados e trajetória política..."
          />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Biografia Base (Narrativa IA)</label>
            <textarea 
              value={identity.bio_base}
              onChange={e => setIdentity({...identity, bio_base: e.target.value})}
              rows={4}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none resize-none" 
              placeholder="Descreva as principais bandeiras e o histórico do candidato para que a IA possa emulá-lo perfeitamente..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Diretrizes de Tom (Voz da IA)</label>
            <textarea 
              value={identity.ai_directives}
              onChange={e => setIdentity({...identity, ai_directives: e.target.value})}
              rows={4}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none resize-none" 
              placeholder="Ex: Use um tom esperançoso mas firme, foque em segurança e família, evite termos técnicos complexos..."
            />
          </div>
        </div>
      </section>

      {/* 1.5 Subpersonagens (Vices, Suplentes) */}
      <section className="glass-card p-6 border-indigo-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Users size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Vices & Suplentes</h2>
              <p className="text-xs text-slate-500">Adicione outros integrantes da chapa majoritária.</p>
            </div>
          </div>
          <button 
            onClick={addSubCharacter}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            <Plus size={14} /> Novo Subpersonagem
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {identity.subCharacters?.map((char: any, idx: number) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-950/50 border border-white/10 rounded-xl relative group">
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Função</label>
                    <input 
                      value={char.role}
                      onChange={e => updateSubCharacter(idx, 'role', e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 text-slate-300 text-xs py-1 outline-none focus:border-indigo-500/50"
                      placeholder="Ex: Vice-Prefeito"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-500 uppercase">Nome</label>
                    <input 
                      value={char.name}
                      onChange={e => updateSubCharacter(idx, 'name', e.target.value)}
                      className="w-full bg-transparent border-b border-white/10 text-slate-300 text-xs py-1 outline-none focus:border-indigo-500/50"
                      placeholder="Nome completo"
                    />
                  </div>
                </div>
              </div>
              <button 
                onClick={() => removeSubCharacter(idx)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Gestão de Oponentes */}
      <section className="glass-card p-6 border-emerald-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Target size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Inteligência Competitiva</h2>
              <p className="text-xs text-slate-500">Monitore oponentes e receba alertas de ataques ou tendências.</p>
            </div>
          </div>
          <button 
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg disabled:opacity-50"
          >
            {suggesting ? <Sparkles className="animate-pulse" size={14} /> : <Sparkles size={14} />}
            Sugestão IA
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {competitors.map((comp: Competitor, idx: number) => (
            <div key={comp.id} className="flex flex-wrap items-end gap-3 p-4 bg-black/20 rounded-xl border border-white/5 group">
              <div className="flex-1 min-w-[200px] space-y-1">
                <label className="text-[9px] font-black text-slate-600 uppercase">Nome do Oponente</label>
                <input 
                  value={comp.name}
                  onChange={e => {
                    const newComps = [...competitors];
                    newComps[idx].name = e.target.value;
                    setCompetitors(newComps);
                  }}
                  className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-200 outline-none focus:border-emerald-500/50 transition-all" 
                />
              </div>
              <div className="w-40 space-y-1">
                <label className="text-[9px] font-black text-slate-600 uppercase">Instagram</label>
                <input 
                  value={comp.socials.instagram || ''}
                  onChange={e => {
                    const newComps = [...competitors];
                    newComps[idx].socials.instagram = e.target.value;
                    setCompetitors(newComps);
                  }}
                  placeholder="@user"
                  className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-sm outline-none focus:border-emerald-500/50 transition-all font-mono" 
                />
              </div>
              <button 
                onClick={() => removeCompetitor(comp.id)}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button 
            onClick={addManualCompetitor}
            className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-white/5 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-500/20 transition-all text-sm font-bold"
          >
            <Plus size={16} /> Adicionar Oponente Manualmente
          </button>
        </div>
      </section>

      {/* 3. Configuração de Vizinhança */}
      <section className="glass-card p-6 border-amber-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
            <Map size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Vizinhança & Regionalismo</h2>
            <p className="text-xs text-slate-500">Cidades ou regiões que devem ser priorizadas no monitoramento.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
           {neighborhood.map((city: string, idx: number) => (
              <div key={idx} className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full flex items-center gap-2 text-amber-200 text-sm font-medium">
                {city}
                <button onClick={() => setNeighborhood(neighborhood.filter((_: any, i: number) => i !== idx))}><X size={12} /></button>
              </div>
           ))}
           <div className="relative">
             <input 
               onKeyDown={e => {
                 if (e.key === 'Enter') {
                   const val = e.currentTarget.value.trim();
                   if (val && !neighborhood.includes(val)) {
                     setNeighborhood([...neighborhood, val]);
                     e.currentTarget.value = '';
                   }
                 }
               }}
               placeholder="+ Adicionar cidade..."
               className="bg-transparent border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-400 outline-none focus:border-amber-500/50"
             />
           </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50"
        >
          {loading ? 'Salvando...' : (
            <>
              <Save size={18} />
              Finalizar Setup de Identidade
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
