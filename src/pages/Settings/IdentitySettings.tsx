import { useState } from 'react';
import {
  User, Target, Map, Sparkles, Plus, Trash2, Save, Camera, Users,
  Phone, Hash, Globe, CheckCircle
} from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { suggestOpponents } from '../../services/aiService';
import { runMonitoringCycle } from '../../services/monitorService';
import type { Competitor, CampaignIdentity, ElectionScope } from '../../types';

const SCOPE_OPTIONS: { value: ElectionScope; label: string; desc: string }[] = [
  { value: 'municipal',  label: 'Municipal',  desc: 'Prefeito, Vereador — disputa na cidade' },
  { value: 'estadual',   label: 'Estadual',   desc: 'Governador, Deputado Estadual/Federal — disputa no estado' },
  { value: 'federal',    label: 'Federal',    desc: 'Presidente, Senador — disputa nacional' },
];

function InputField({ label, value, onChange, placeholder, hint, mono }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none ${mono ? 'font-mono text-sm' : ''}`}
      />
      {hint && <p className="text-[10px] text-slate-600 pl-1">{hint}</p>}
    </div>
  );
}

export default function IdentitySettings() {
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [identity, setIdentity] = useState<CampaignIdentity>(
    activeCampaign?.identity || {
      name: '', urnName: '', cpf: '', candidateNumber: '',
      position: '', electionScope: 'municipal', location: '',
      state: '', party: '', coalition: '',
      whatsappOfficial: '',
      socialMedia: { instagram: '', facebook: '', tiktok: '', youtube: '', twitter: '' },
      history: '', bio_base: '', ai_directives: '',
      photoOfficial: '', subCharacters: [],
    }
  );

  const [competitors, setCompetitors] = useState<Competitor[]>(
    activeCampaign?.competitors || []
  );

  const [neighborhood, setNeighborhood] = useState<string[]>(
    activeCampaign?.neighborhood || []
  );

  const handleSave = async () => {
    if (!activeCampaign) return;
    setLoading(true);
    try {
      const ref = doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id);
      await updateDoc(ref, { identity, competitors, neighborhood, updatedAt: new Date() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      runMonitoringCycle(activeCampaign).catch(err => console.error('Monitor Cycle:', err));
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
        aiSuggested: true,
        socials: s.socials || {},
        sentiment: 'neutral',
      }));
      setCompetitors(prev => [...prev, ...newCompetitors]);
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const addManualCompetitor = () => {
    setCompetitors(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: '', party: '', position: '', candidateNumber: '',
      aiSuggested: false,
      socials: {}, sentiment: 'neutral',
    }]);
  };

  const updateCompetitor = (id: string, field: string, value: string | boolean) => {
    setCompetitors(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const updateCompetitorSocial = (id: string, platform: string, value: string) => {
    setCompetitors(prev => prev.map(c =>
      c.id === id ? { ...c, socials: { ...c.socials, [platform]: value } } : c
    ));
  };

  const removeCompetitor = (id: string) => {
    setCompetitors(prev => prev.filter(c => c.id !== id));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setIdentity({ ...identity, photoOfficial: reader.result as string });
    reader.readAsDataURL(file);
  };

  const setId = (field: keyof CampaignIdentity, val: string) =>
    setIdentity(p => ({ ...p, [field]: val }));

  const setSocial = (platform: string, val: string) =>
    setIdentity(p => ({ ...p, socialMedia: { ...p.socialMedia, [platform]: val } }));

  return (
    <div className="flex flex-col gap-8 max-w-4xl">

      {/* ── 1. Perfil do Candidato ────────────────────────── */}
      <section className="glass-card p-6 border-indigo-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><User size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Quem sou eu</h2>
            <p className="text-xs text-slate-500">Identidade que a IA assumirá em toda a plataforma.</p>
          </div>
        </div>

        {/* Foto + campos básicos */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative group w-32 h-32 rounded-xl overflow-hidden bg-slate-900 border border-white/10">
              {identity.photoOfficial
                ? <img src={identity.photoOfficial} alt="Avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={40} /></div>
              }
              <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera size={24} className="text-white" />
                <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
              </label>
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase">Foto Oficial</p>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="Nome Civil Completo" value={identity.name} onChange={v => setId('name', v)} placeholder="Ex: João da Silva Santos" />
            <InputField label="Nome de Urna / Campanha" value={identity.urnName} onChange={v => setId('urnName', v)} placeholder="Ex: João do Povo" />
            <InputField label="CPF" value={identity.cpf ?? ''} onChange={v => setId('cpf', v)} placeholder="000.000.000-00" mono hint="Formato: 000.000.000-00" />
            <InputField label="Número TSE (Urna)" value={identity.candidateNumber ?? ''} onChange={v => setId('candidateNumber', v)} placeholder="Ex: 10, 4015, 45678" mono />
          </div>
        </div>

        {/* Âmbito eleitoral */}
        <div className="mb-6">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block mb-2">Âmbito da Eleição</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SCOPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setIdentity(p => ({ ...p, electionScope: opt.value }))}
                className={`p-3 rounded-xl border text-left transition-all ${identity.electionScope === opt.value ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-black/20 hover:border-white/10'}`}
              >
                <p className="text-sm font-bold text-slate-200">{opt.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mt-2 pl-1">
            {identity.electionScope === 'municipal'
              ? 'A Cidade de Disputa é a cidade onde o candidato concorre.'
              : identity.electionScope === 'estadual'
              ? 'A Cidade de Disputa é a sede do comitê principal no estado.'
              : 'A Cidade e Estado indicam a sede do comitê central nacional.'}
          </p>
        </div>

        {/* Cargo e localização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <InputField label="Cargo Disputado" value={identity.position} onChange={v => setId('position', v)} placeholder="Ex: Prefeito, Deputado Estadual" />
          <InputField
            label={identity.electionScope === 'municipal' ? 'Cidade de Disputa' : 'Cidade sede do Comitê'}
            value={identity.location}
            onChange={v => setId('location', v)}
            placeholder="Ex: Porto Alegre"
          />
        </div>

        {/* Partido, Estado, Coligação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <InputField label="Partido" value={identity.party} onChange={v => setId('party', v)} placeholder="Ex: PL" />
          <InputField label="Estado (UF)" value={identity.state} onChange={v => setId('state', v)} placeholder="Ex: RS" mono />
          <InputField label="Coligação" value={identity.coalition ?? ''} onChange={v => setId('coalition', v)} placeholder="Ex: Juntos por Porto Alegre" />
        </div>

        {/* Contatos oficiais */}
        <div className="mb-6">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 block mb-3">Contato & Redes Oficiais</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Phone size={10} /> WhatsApp Oficial</label>
              <input value={identity.whatsappOfficial ?? ''} onChange={e => setId('whatsappOfficial', e.target.value)}
                placeholder="+55 51 99999-9999"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Globe size={10} /> Instagram</label>
              <input value={identity.socialMedia?.instagram ?? ''} onChange={e => setSocial('instagram', e.target.value)}
                placeholder="@nomedenurna"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Globe size={10} /> Facebook</label>
              <input value={identity.socialMedia?.facebook ?? ''} onChange={e => setSocial('facebook', e.target.value)}
                placeholder="facebook.com/candidato"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Globe size={10} /> TikTok</label>
              <input value={identity.socialMedia?.tiktok ?? ''} onChange={e => setSocial('tiktok', e.target.value)}
                placeholder="@nomedenurna"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Globe size={10} /> YouTube</label>
              <input value={identity.socialMedia?.youtube ?? ''} onChange={e => setSocial('youtube', e.target.value)}
                placeholder="youtube.com/@candidato"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1 flex items-center gap-1"><Hash size={10} /> X / Twitter</label>
              <input value={identity.socialMedia?.twitter ?? ''} onChange={e => setSocial('twitter', e.target.value)}
                placeholder="@nomedenurna"
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none font-mono text-sm" />
            </div>
          </div>
        </div>

        {/* Histórico e Bio */}
        <div className="mt-4 space-y-1 mb-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Histórico Político</label>
          <textarea value={identity.history} onChange={e => setId('history', e.target.value)} rows={3}
            className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none resize-none"
            placeholder="Relate mandatos anteriores, cargos ocupados e trajetória política..." />
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Biografia Base (Narrativa IA)</label>
            <textarea value={identity.bio_base} onChange={e => setId('bio_base', e.target.value)} rows={4}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none resize-none"
              placeholder="Descreva as principais bandeiras e o histórico do candidato para que a IA possa emulá-lo perfeitamente..." />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Diretrizes de Tom (Voz da IA)</label>
            <textarea value={identity.ai_directives ?? ''} onChange={e => setId('ai_directives', e.target.value)} rows={4}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:border-indigo-500/50 outline-none resize-none"
              placeholder="Ex: Use um tom esperançoso mas firme, foque em segurança e família, evite termos técnicos complexos..." />
          </div>
        </div>
      </section>

      {/* ── 2. Vices & Suplentes ─────────────────────────── */}
      <section className="glass-card p-6 border-indigo-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Users size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Vices & Suplentes</h2>
              <p className="text-xs text-slate-500">Adicione outros integrantes da chapa majoritária.</p>
            </div>
          </div>
          <button
            onClick={() => setIdentity(p => ({ ...p, subCharacters: [...(p.subCharacters || []), { role: 'Vice', name: '' }] }))}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
          >
            <Plus size={14} /> Adicionar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {identity.subCharacters?.map((char, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-950/50 border border-white/10 rounded-xl group">
              <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase">Função</label>
                  <input value={char.role}
                    onChange={e => {
                      const c = [...(identity.subCharacters || [])];
                      c[idx] = { ...c[idx], role: e.target.value };
                      setIdentity(p => ({ ...p, subCharacters: c }));
                    }}
                    className="w-full bg-transparent border-b border-white/10 text-slate-300 text-xs py-1 outline-none focus:border-indigo-500/50"
                    placeholder="Ex: Vice-Prefeito" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase">Nome</label>
                  <input value={char.name}
                    onChange={e => {
                      const c = [...(identity.subCharacters || [])];
                      c[idx] = { ...c[idx], name: e.target.value };
                      setIdentity(p => ({ ...p, subCharacters: c }));
                    }}
                    className="w-full bg-transparent border-b border-white/10 text-slate-300 text-xs py-1 outline-none focus:border-indigo-500/50"
                    placeholder="Nome completo" />
                </div>
              </div>
              <button
                onClick={() => setIdentity(p => ({ ...p, subCharacters: (p.subCharacters || []).filter((_, i) => i !== idx) }))}
                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Inteligência Competitiva ──────────────────── */}
      <section className="glass-card p-6 border-emerald-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Target size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Inteligência Competitiva</h2>
              <p className="text-xs text-slate-500">Cadastre oponentes — serão monitorados automaticamente.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSuggest}
              disabled={suggesting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg disabled:opacity-50"
            >
              {suggesting ? <Sparkles className="animate-pulse" size={14} /> : <Sparkles size={14} />}
              Sugestão IA
            </button>
            <button
              onClick={addManualCompetitor}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all"
            >
              <Plus size={14} /> Manual
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {competitors.map(comp => (
            <div key={comp.id} className={`p-4 rounded-xl border group ${comp.aiSuggested ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 bg-black/20'}`}>
              {comp.aiSuggested && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase">
                    ⚠️ Sugerido pela IA — aguardando validação
                  </span>
                  <button
                    onClick={() => updateCompetitor(comp.id, 'aiSuggested', false)}
                    className="flex items-center gap-1 text-[9px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full hover:bg-emerald-500/10 transition-colors"
                  >
                    <CheckCircle size={9} /> Confirmar
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">Nome do Oponente</label>
                  <input value={comp.name} onChange={e => updateCompetitor(comp.id, 'name', e.target.value)}
                    className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-200 outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">Partido</label>
                  <input value={comp.party ?? ''} onChange={e => updateCompetitor(comp.id, 'party', e.target.value)}
                    placeholder="Ex: PT, PSD..." className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-sm outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">Cargo disputado</label>
                  <input value={comp.position ?? ''} onChange={e => updateCompetitor(comp.id, 'position', e.target.value)}
                    placeholder="Ex: Prefeito..." className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-sm outline-none focus:border-emerald-500/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">Nº TSE</label>
                  <input value={comp.candidateNumber ?? ''} onChange={e => updateCompetitor(comp.id, 'candidateNumber', e.target.value)}
                    placeholder="Ex: 13..." className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-xs font-mono outline-none focus:border-emerald-500/50 transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase flex items-center gap-1"><Globe size={8} /> Instagram</label>
                  <input value={comp.socials.instagram ?? ''} onChange={e => updateCompetitorSocial(comp.id, 'instagram', e.target.value)}
                    placeholder="@user" className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-sm outline-none focus:border-emerald-500/50 transition-all font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">TikTok</label>
                  <input value={comp.socials.tiktok ?? ''} onChange={e => updateCompetitorSocial(comp.id, 'tiktok', e.target.value)}
                    placeholder="@user" className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-sm outline-none focus:border-emerald-500/50 transition-all font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-600 uppercase">X/Twitter</label>
                  <input value={comp.socials.twitter ?? ''} onChange={e => updateCompetitorSocial(comp.id, 'twitter', e.target.value)}
                    placeholder="@user" className="w-full bg-transparent border-b border-white/10 pb-1 text-slate-400 text-sm outline-none focus:border-emerald-500/50 transition-all font-mono" />
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button onClick={() => removeCompetitor(comp.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {competitors.length === 0 && (
            <div className="py-8 text-center text-slate-600 text-sm border border-dashed border-white/5 rounded-xl">
              Nenhum oponente cadastrado. Use "Sugestão IA" ou adicione manualmente.
            </div>
          )}
        </div>
      </section>

      {/* ── 4. Cidades Prioritárias ──────────────────────── */}
      <section className="glass-card p-6 border-amber-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><Map size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-100 uppercase tracking-tight">Cidades Prioritárias</h2>
            <p className="text-xs text-slate-500">Cidades ou regiões priorizadas pelo monitoramento e busca de menções.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {neighborhood.map((city, idx) => (
            <div key={idx} className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full flex items-center gap-2 text-amber-200 text-sm font-medium">
              {city}
              <button onClick={() => setNeighborhood(n => n.filter((_, i) => i !== idx))} className="text-amber-500 hover:text-red-400 transition-colors">
                <XIcon size={12} />
              </button>
            </div>
          ))}
          <input
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const val = e.currentTarget.value.trim();
                if (val && !neighborhood.includes(val)) {
                  setNeighborhood(n => [...n, val]);
                  e.currentTarget.value = '';
                }
              }
            }}
            placeholder="+ Adicionar cidade (Enter)"
            className="bg-transparent border border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-400 outline-none focus:border-amber-500/50"
          />
        </div>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 ${saved ? 'bg-emerald-600' : 'bg-indigo-600 hover:bg-indigo-500'} text-white`}
        >
          {loading ? 'Salvando...' : saved ? <><CheckCircle size={18} /> Salvo!</> : <><Save size={18} /> Salvar Identidade</>}
        </button>
      </div>
    </div>
  );
}

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  );
}
