import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import {
  Heart, Plus, Trash2, Copy, Share2, CheckCircle2, ExternalLink,
  Calendar, Target, Banknote, Globe, Info
} from 'lucide-react';

type CampaignType = 'vaquinha' | 'evento';
type CampaignStatus = 'Ativa' | 'Encerrada' | 'Rascunho';

interface FundraisingCampaign {
  id: string;
  type: CampaignType;
  title: string;
  description: string;
  goal: number;
  raised?: number;
  pixKey: string;
  eventDate?: string;
  eventLocation?: string;
  status: CampaignStatus;
  shareLink?: string;
  createdAt?: { seconds: number };
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function VaquinhaPage() {
  const { activeCampaign } = useCampaign();
  const [campaigns, setCampaigns] = useState<FundraisingCampaign[]>([]);
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<FundraisingCampaign, 'id'>>({
    type: 'vaquinha', title: '', description: '',
    goal: 0, raised: 0, pixKey: activeCampaign?.legalConfig?.pix || '',
    eventDate: '', eventLocation: '', status: 'Ativa', shareLink: ''
  });

  const path = useCallback(() =>
    activeCampaign ? `campaigns/${activeCampaign.id}/fundraisingCampaigns` : null,
    [activeCampaign]);

  useEffect(() => {
    setForm(f => ({ ...f, pixKey: activeCampaign?.legalConfig?.pix || '' }));
  }, [activeCampaign]);

  useEffect(() => {
    const p = path();
    if (!p) { setCampaigns([]); return; }
    return onSnapshot(collection(db, p), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FundraisingCampaign));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setCampaigns(data);
    });
  }, [path]);

  const handleAdd = async () => {
    const p = path();
    if (!p || !form.title.trim()) return;
    setAdding(true);
    try { await addDoc(collection(db, p), { ...form, raised: 0, createdAt: serverTimestamp() }); }
    finally { setAdding(false); }
    setForm(f => ({ ...f, title: '', description: '', goal: 0, eventDate: '', eventLocation: '', shareLink: '' }));
  };

  const handleDelete = async (id: string) => {
    const p = path();
    if (!p) return;
    await deleteDoc(doc(db, p, id));
  };

  const handleUpdateStatus = async (id: string, status: CampaignStatus) => {
    const p = path();
    if (!p) return;
    await updateDoc(doc(db, p, id), { status });
  };

  const handleCopyPix = async (id: string, pixKey: string) => {
    await navigator.clipboard.writeText(pixKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const inp = 'bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 w-full';

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-rose-500/15 text-rose-400 rounded-xl border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
          <Heart size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0 leading-tight">Engajamento: Vaquinhas & Eventos</h2>
          <p className="text-sm text-slate-400 m-0 mt-0.5">
            Crie campanhas de micro-doações (CPF) e eventos de arrecadação integrados ao seu caixa.
          </p>
        </div>
      </div>

      {/* Info TSE */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-900/10 border border-amber-500/20 text-xs text-amber-200/70">
        <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-amber-400">Atenção TSE:</strong> Doações devem ser registradas no SPCE.
          A chave PIX deve ser a da conta bancária eleitoral (CNPJ do comitê financeiro).
          Limite por pessoa física: 10% dos rendimentos brutos declarados ao IR.{' '}
          <a href="https://www.tse.jus.br/partidos/financiamento-de-campanhas/prestacao-de-contas" target="_blank" rel="noreferrer"
            className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5">
            Ver normas TSE <ExternalLink size={10} />
          </a>
        </span>
      </div>

      {/* Add form */}
      <div className="glass-card border border-rose-500/15 p-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Nova Campanha / Evento</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CampaignType }))} className={inp}>
            <option value="vaquinha">🫶 Vaquinha Online</option>
            <option value="evento">🎪 Evento de Arrecadação</option>
          </select>
          <input placeholder="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={`${inp} sm:col-span-2`} />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
            <input type="number" placeholder="Meta de arrecadação" value={form.goal || ''}
              onChange={e => setForm(f => ({ ...f, goal: Number(e.target.value) }))}
              className={`${inp} pl-8`} />
          </div>
          <input placeholder="Chave PIX" value={form.pixKey} onChange={e => setForm(f => ({ ...f, pixKey: e.target.value }))} className={inp} />
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CampaignStatus }))} className={inp}>
            {['Ativa', 'Rascunho', 'Encerrada'].map(s => <option key={s}>{s}</option>)}
          </select>
          <textarea placeholder="Descrição / mensagem para doadores"
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className={`${inp} sm:col-span-3 lg:col-span-3 resize-none h-10`} />
          {form.type === 'evento' && (
            <>
              <input type="date" value={form.eventDate}
                onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} className={inp} />
              <input placeholder="Local do evento" value={form.eventLocation}
                onChange={e => setForm(f => ({ ...f, eventLocation: e.target.value }))} className={`${inp} sm:col-span-2`} />
            </>
          )}
          <input placeholder="Link de divulgação (URL landing page)" value={form.shareLink}
            onChange={e => setForm(f => ({ ...f, shareLink: e.target.value }))} className={`${inp} sm:col-span-2 lg:col-span-2`} />
          <button onClick={handleAdd} disabled={adding || !form.title.trim()}
            className="bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white px-4 rounded-lg font-bold flex items-center justify-center gap-1 text-xs transition-colors">
            <Plus size={14} /> Criar
          </button>
        </div>
      </div>

      {/* Campaigns list */}
      {campaigns.length === 0 ? (
        <div className="glass-card border border-slate-700/30 py-12 text-center flex flex-col items-center gap-3">
          <Heart size={32} className="text-slate-700" />
          <p className="text-slate-500 font-bold">Nenhuma vaquinha ou evento criado ainda.</p>
          <p className="text-slate-600 text-xs max-w-sm">
            Crie sua primeira campanha de arrecadação acima. Compartilhe a chave PIX com multiplicadores para captar doações legais.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map(c => {
            const progress = c.goal > 0 ? Math.min(((c.raised ?? 0) / c.goal) * 100, 100) : 0;
            return (
              <div key={c.id} className={`glass-card border p-5 flex flex-col gap-3 ${
                c.status === 'Encerrada' ? 'border-slate-700/20 opacity-60' :
                c.type === 'evento' ? 'border-amber-500/20' : 'border-rose-500/20'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">{c.type === 'evento' ? '🎪 Evento' : '🫶 Vaquinha'}</span>
                    <h3 className="font-bold text-slate-100 text-sm mt-0.5 leading-tight">{c.title}</h3>
                  </div>
                  <select value={c.status} onChange={e => handleUpdateStatus(c.id, e.target.value as CampaignStatus)}
                    className={`text-[10px] font-bold rounded px-2 py-1 border bg-transparent focus:outline-none shrink-0 ${
                      c.status === 'Ativa' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                      c.status === 'Rascunho' ? 'text-slate-400 border-slate-600/30 bg-slate-800' :
                      'text-slate-500 border-slate-700/30 bg-slate-900'
                    }`}>
                    {['Ativa', 'Rascunho', 'Encerrada'].map(s => <option key={s} className="bg-slate-900">{s}</option>)}
                  </select>
                </div>

                {c.description && <p className="text-xs text-slate-400 leading-relaxed">{c.description}</p>}

                {c.type === 'evento' && c.eventDate && (
                  <div className="flex items-center gap-4 text-xs text-amber-400/80">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {c.eventDate}</span>
                    {c.eventLocation && <span className="flex items-center gap-1"><Globe size={11} /> {c.eventLocation}</span>}
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

                <div className="pt-2 border-t border-white/5 flex items-center gap-2 flex-wrap">
                  <button onClick={() => handleCopyPix(c.id, c.pixKey)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold border transition-colors ${
                      copiedId === c.id
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}>
                    {copiedId === c.id ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                    {copiedId === c.id ? 'PIX Copiado!' : 'Copiar PIX'}
                  </button>
                  {c.shareLink && (
                    <a href={c.shareLink} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors">
                      <Share2 size={11} /> Link
                    </a>
                  )}
                  <button onClick={() => handleDelete(c.id)}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded">
                    <Trash2 size={13} />
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
