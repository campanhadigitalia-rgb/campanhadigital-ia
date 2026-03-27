import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import {
  Heart, Plus, Trash2, Share2, CheckCircle2,
  Calendar, Target, Banknote, Globe, Info, Percent, QrCode, Edit2, Users
} from 'lucide-react';
import type { FundraisingCampaign } from '../../types';

type CampaignType = 'vaquinha' | 'evento';
type CampaignStatus = 'Ativa' | 'Encerrada' | 'Rascunho';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function VaquinhaPage() {
  const { campaignId, activeCampaign } = useCampaign();
  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
  const [rsvps, setRsvps] = useState<Record<string, number>>({});
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [form, setForm] = useState<Omit<FundraisingCampaign, 'id' | 'createdAt' | 'updatedAt' | 'campaign_id' | 'createdBy'>>({
    type: 'vaquinha', title: '', description: '',
    goal: 0, raised: 0, pixKey: activeCampaign?.legalConfig?.pix || '',
    eventDate: '', eventLocation: '', status: 'Ativa', shareLink: '',
    feePercentage: 0
  });

  const getPath = useCallback(() =>
    campaignId ? `campaigns/${campaignId}/fundraisingCampaigns` : null,
    [campaignId]);

  useEffect(() => {
    if (activeCampaign?.legalConfig?.pix && !editingId) {
      const pix = activeCampaign.legalConfig.pix;
      setForm(f => ({ ...f, pixKey: pix }));
    }
  }, [activeCampaign?.legalConfig?.pix, editingId]);

  useEffect(() => {
    const p = getPath();
    if (!p) { setCampaigns([]); return; }
    return onSnapshot(collection(db, p), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FundraisingCampaign));
      data.sort((a, b) => {
        const getSec = (ts: any) => {
          if (!ts) return 0;
          if (typeof ts.seconds === 'number') return ts.seconds;
          if (ts instanceof Date) return ts.getTime() / 1000;
          return 0;
        };
        return getSec(b.createdAt) - getSec(a.createdAt);
      });
      setCampaigns(data);
    });
  }, [getPath]);

  useEffect(() => {
    if (!campaignId) return;
    const qRsvps = query(collection(db, 'event_rsvps'), where('campaign_id', '==', campaignId));
    return onSnapshot(qRsvps, snap => {
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const evId = d.data().event_id;
        counts[evId] = (counts[evId] || 0) + 1;
      });
      setRsvps(counts);
    });
  }, [campaignId]);

  const handleUpdateStatus = async (id: string, status: CampaignStatus) => {
    const p = getPath();
    if (!p) return;
    try {
      const ref = doc(db, p, id);
      await updateDoc(ref, { status });
    } catch (err) {
      console.error("Erro ao atualizar status da campanha:", err);
      alert("Erro ao atualizar status.");
    }
  };

  const handleAdd = async () => {
    const p = getPath();
    if (!p) { alert('Erro: Campanha não carregada.'); return; }
    if (!form.title.trim()) return;
    
    setAdding(true);
    try { 
      if (editingId) {
         await updateDoc(doc(db, p, editingId), { ...form, updatedAt: serverTimestamp() });
         setEditingId(null);
         alert('Campanha/Evento atualizado!');
      } else {
         await addDoc(collection(db, p), { ...form, raised: 0, createdAt: serverTimestamp() }); 
         alert('Criado com sucesso!');
      }
      setForm(f => ({ ...f, title: '', description: '', goal: 0, eventDate: '', eventLocation: '', shareLink: '', feePercentage: 0 }));
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    } finally { 
      setAdding(false); 
    }
  };

  const handleEdit = (c: FundraisingCampaign) => {
    if (!c.id) return;
    setEditingId(c.id);
    setForm({
      type: c.type || 'vaquinha',
      title: c.title || '',
      description: c.description || '',
      goal: c.goal || 0,
      raised: c.raised || 0,
      pixKey: c.pixKey || '',
      eventDate: c.eventDate || '',
      eventLocation: c.eventLocation || '',
      status: c.status || 'Ativa',
      shareLink: c.shareLink || '',
      feePercentage: c.feePercentage || 0
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const p = getPath();
    if (!p) return;
    if (confirm('Deseja excluir?')) await deleteDoc(doc(db, p, id));
  };

  const handleCopyPix = async (id: string, pixKey: string) => {
    await navigator.clipboard.writeText(pixKey);
    setCopiedId(`pix_${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };
  
  const handleCopyLink = async (id: string, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedId(`link_${id}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inp = 'bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-2 text-xs w-full';

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/20">
          <Heart size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0">Vaquinhas & Eventos</h2>
          <p className="text-sm text-slate-400 m-0">Iniciativas de arrecadação coletiva e eventos presenciais.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-900/10 border border-amber-500/20 text-[11px] text-amber-200/70">
        <Info size={16} className="text-amber-400 shrink-0" />
        <p>Atenção: Seguindo as normas do TSE, toda arrecadação coletiva (crowdfunding) deve ser realizada por empresas cadastradas e homologadas. O registro dessas transações no Livro Caixa é obrigatório.</p>
      </div>

      <div className="glass-card border border-rose-500/15 p-5 relative overflow-hidden">
        {editingId && <div className="absolute top-0 left-0 bg-amber-500 text-black px-3 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-br-lg z-10">Modo de Edição</div>}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-2">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CampaignType }))} className={inp}>
            <option value="vaquinha">Vaquinha</option>
            <option value="evento">Evento c/ RSVP</option>
          </select>
          <input placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={`${inp} sm:col-span-2`} />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
            <input type="number" placeholder="Meta R$" value={form.goal || ''}
              onChange={e => setForm(f => ({ ...f, goal: Number(e.target.value) }))}
              className={`${inp} pl-8`} />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold"><Percent size={12} /></span>
            <input type="number" step="0.1" placeholder="Taxa (%)" value={form.feePercentage || ''}
              onChange={e => setForm(f => ({ ...f, feePercentage: Number(e.target.value) }))}
              className={`${inp} pl-8`} title="Taxa cobrada pela plataforma" />
          </div>
          <input placeholder="Chave PIX Eleitoral" value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} className={inp} />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CampaignStatus }))} className={inp}>
            {['Ativa', 'Rascunho', 'Encerrada'].map(s => <option key={s}>{s}</option>)}
          </select>
          <textarea placeholder="Descrição / Mensagem Pública..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`${inp} sm:col-span-3 lg:col-span-3 resize-none h-10`} />
          {form.type === 'evento' && (
            <>
              <input type="date" value={form.eventDate}
                onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className={inp} />
              <input placeholder="Local/Endereço do Evento" value={form.eventLocation}
                onChange={e => setForm(f => ({ ...f, eventLocation: e.target.value }))} className={`${inp} sm:col-span-2`} />
            </>
          )}
          {form.type !== 'evento' && (
             <input placeholder="Link da Plataforma de Vaquinha" value={form.shareLink}
               onChange={e => setForm(f => ({ ...f, shareLink: e.target.value }))} className={`${inp} sm:col-span-2 lg:col-span-2`} />
          )}
          
          <div className="col-span-2 lg:col-span-6 flex justify-end gap-2 mt-2 border-t border-white/5 pt-3">
             {editingId && (
                <button onClick={() => { setEditingId(null); setForm(f => ({...f, title: ''})); }} className="text-xs px-4 py-2 font-black uppercase text-slate-400 hover:text-white transition-colors">
                  Cancelar Edição
                </button>
             )}
             <button onClick={handleAdd} disabled={adding || !form.title.trim()}
               className={`px-6 py-2 rounded-lg font-black uppercase text-xs transition-all shadow-lg shadow-rose-500/20 disabled:opacity-40 flex items-center gap-1 ${editingId ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'}`}>
               {adding ? '...' : editingId ? <><Edit2 size={14} /> Atualizar</> : <><Plus size={14} /> Criar</>}
             </button>
          </div>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="glass-card border border-slate-700/30 py-12 text-center flex flex-col items-center gap-3">
          <Heart size={32} className="text-slate-700" />
          <p className="text-slate-500 font-bold">Nenhuma vaquinha ou evento criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => {
            const progress = c.goal > 0 ? Math.min(((c.raised ?? 0) / c.goal) * 100, 100) : 0;
            const rsvpCount = c.id ? rsvps[c.id] || 0 : 0;
            const publicLink = c.type === 'evento' && c.id ? `${window.location.origin}/e/${campaignId}/${c.id}` : c.shareLink || '';

            return (
              <div key={c.id} className={`glass-card border p-5 flex flex-col gap-3 ${
                c.status === 'Encerrada' ? 'border-slate-700/20 opacity-60' :
                c.type === 'evento' ? 'border-amber-500/20' : 'border-rose-500/20'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                      {c.type === 'evento' ? '🎪 Evento' : '🫶 Vaquinha'}
                      {c.feePercentage ? <span className="text-rose-400 bg-rose-500/10 px-1.5 rounded ml-2 border border-rose-500/20">Taxa: {c.feePercentage}%</span> : null}
                    </span>
                    <h3 className="font-bold text-slate-100 text-sm mt-0.5 leading-tight">{c.title}</h3>
                  </div>
                  <select value={c.status} onChange={e => handleUpdateStatus(c.id!, e.target.value as CampaignStatus)}
                    className={`text-[10px] font-bold rounded px-2 py-1 border bg-slate-900 shrink-0 outline-none ${
                      c.status === 'Ativa' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                      c.status === 'Rascunho' ? 'text-slate-400 border-slate-600/30 bg-slate-800' :
                      'text-slate-500 border-slate-700/30 bg-slate-900'
                    }`}>
                    {['Ativa', 'Rascunho', 'Encerrada'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {c.description && <p className="text-xs text-slate-400 leading-relaxed max-h-16 overflow-y-auto">{c.description}</p>}

                {c.type === 'evento' && (
                  <div className="flex flex-col gap-2">
                    {c.eventDate && (
                      <div className="flex items-center gap-3 text-[11px] font-bold text-amber-500/90 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                        <span className="flex items-center gap-1"><Calendar size={13} /> {c.eventDate}</span>
                        {c.eventLocation && <span className="flex items-center gap-1 truncate" title={c.eventLocation}><Globe size={13} /> {c.eventLocation}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[11px] font-bold text-indigo-400 bg-indigo-500/5 p-2 rounded-lg border border-indigo-500/10">
                      <span className="flex items-center gap-1.5"><Users size={14} /> Confirmações (RSVP):</span>
                      <span className="text-sm font-black px-2 bg-indigo-500/20 rounded">{rsvpCount}</span>
                    </div>
                  </div>
                )}

                {c.goal > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><Target size={10} /> Meta: {fmt(c.goal)}</span>
                      <span className="text-emerald-400">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Banknote size={10} /> Arrecadado: <span className="text-emerald-400 font-bold">{fmt(c.raised ?? 0)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => c.pixKey && handleCopyPix(c.id!, c.pixKey)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold border transition-colors ${
                      copiedId === `pix_${c.id}`
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}>
                    {copiedId === `pix_${c.id}` ? <CheckCircle2 size={11} /> : <QrCode size={11} />}
                    {copiedId === `pix_${c.id}` ? 'Pix Copiado' : 'Copiar PIX'}
                  </button>
                  {publicLink && (
                     <button onClick={() => handleCopyLink(c.id!, publicLink)}
                     className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[10px] font-bold border transition-colors ${
                       copiedId === `link_${c.id}`
                         ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                         : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border-indigo-500/20'
                     }`}>
                     {copiedId === `link_${c.id}` ? <CheckCircle2 size={11} /> : <Share2 size={11} />}
                     {copiedId === `link_${c.id}` ? 'Link Copiado' : 'Link RSVP'}
                   </button>
                  )}
                  <button onClick={() => handleEdit(c)}
                    className="p-1.5 px-2 text-slate-400 hover:text-amber-400 bg-slate-800 hover:bg-slate-700 transition-colors rounded border border-slate-700" title="Editar">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => handleDelete(c.id!)}
                    className="p-1.5 px-2 text-slate-400 hover:text-red-400 bg-slate-800 hover:bg-red-900/30 transition-colors rounded border border-slate-700" title="Excluir">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
