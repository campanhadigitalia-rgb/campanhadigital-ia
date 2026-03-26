import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { Scale, Plus, Trash2, Clock, CheckCircle2 } from 'lucide-react';

interface LegalCase {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  status: 'active' | 'settled' | 'dismissed' | 'appeal';
  priority: 'low' | 'medium' | 'high';
  defendant: string;
  plaintiff: string;
  notes: string;
  nextStep?: string;
  createdAt?: { seconds: number };
}

export function LegalCaseManager() {
  const { activeCampaign } = useCampaign();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState<Omit<LegalCase, 'id'>>({
    caseNumber: '', title: '', description: '',
    status: 'active', priority: 'medium',
    defendant: '', plaintiff: '', notes: ''
  });

  type CaseStatus = LegalCase['status'];
  type CasePriority = LegalCase['priority'];

  const path = useCallback(() => 
    activeCampaign ? `campaigns/${activeCampaign.id}/legal_cases` : null,
    [activeCampaign]);

  useEffect(() => {
    const p = path();
    if (!p) return;
    return onSnapshot(collection(db, p), snap => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalCase)));
    });
  }, [path]);

  const handleAdd = async () => {
    const p = path();
    if (!p || !form.caseNumber) return;
    await addDoc(collection(db, p), { ...form, createdAt: serverTimestamp() });
    setForm({ caseNumber: '', title: '', description: '', status: 'active', priority: 'medium', defendant: '', plaintiff: '', notes: '' });
    setIsAdding(false);
  };

  const updateStatus = async (id: string, status: LegalCase['status']) => {
    const p = path();
    if (!p) return;
    await updateDoc(doc(db, p, id), { status });
  };

  const inp = 'bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 w-full';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Scale className="text-indigo-400" size={20} /> Controle de Processos Judiciais
          </h3>
          <p className="text-xs text-slate-400 italic">Acompanhamento de ações, defesas e prazos jurídicos da campanha.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
        >
          <Plus size={16} /> {isAdding ? 'Cancelar' : 'Novo Processo'}
        </button>
      </div>

      {isAdding && (
        <div className="glass-card p-6 border border-indigo-500/20 bg-indigo-500/5 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="Nº do Processo *" value={form.caseNumber} onChange={e => setForm({...form, caseNumber: e.target.value})} className={inp} />
            <input placeholder="Título / Assunto *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className={inp} />
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as CasePriority})} className={inp}>
              <option value="low">Prioridade Baixa</option>
              <option value="medium">Prioridade Média</option>
              <option value="high">Prioridade Alta</option>
            </select>
            <input placeholder="Autor (Requerente)" value={form.plaintiff} onChange={e => setForm({...form, plaintiff: e.target.value})} className={inp} />
            <input placeholder="Réu (Requerido)" value={form.defendant} onChange={e => setForm({...form, defendant: e.target.value})} className={inp} />
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value as CaseStatus})} className={inp}>
              <option value="active">Em Andamento</option>
              <option value="appeal">Em Recurso</option>
              <option value="settled">Acordo Extrajudicial</option>
              <option value="dismissed">Arquivado / Extinto</option>
            </select>
            <textarea placeholder="Resumo e Notas de Defesa..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className={`${inp} md:col-span-3 h-24 resize-none`} />
            <div className="md:col-span-3 flex justify-end">
              <button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20">
                Lançar Processo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cases.map(c => (
          <div key={c.id} className="glass-card p-5 border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.priority === 'high' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Scale size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{c.caseNumber}</p>
                  <h4 className="font-bold text-slate-200 text-sm group-hover:text-white transition-colors">{c.title}</h4>
                </div>
              </div>
              <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                c.status === 'active' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                c.status === 'settled' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                'text-slate-400 border-white/10 bg-white/5'
              }`}>
                {c.status}
              </div>
            </div>

            <div className="space-y-3 mb-4">
               <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 uppercase font-black">Autor:</span>
                  <span className="text-slate-300">{c.plaintiff || '—'}</span>
               </div>
               <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 uppercase font-black">Réu:</span>
                  <span className="text-slate-300">{c.defendant || '—'}</span>
               </div>
               <p className="text-xs text-slate-400 leading-relaxed line-clamp-2 italic">
                 "{c.notes || 'Sem observações extras.'}"
               </p>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <div className="flex gap-1">
                <button onClick={() => updateStatus(c.id, 'active')} className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors" title="Marcar como Ativo"><Clock size={16}/></button>
                <button onClick={() => updateStatus(c.id, 'settled')} className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors" title="Marcar como Acordo"><CheckCircle2 size={16}/></button>
              </div>
              <button 
                onClick={async () => {
                   if(confirm('Excluir registro do processo?')) await deleteDoc(doc(db, path()!, c.id));
                }}
                className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {cases.length === 0 && !isAdding && (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-3xl opacity-50">
           <Scale size={48} className="text-slate-600 mb-4" />
           <p className="text-slate-400 font-medium">Nenhum processo jurídico cadastrado.</p>
           <p className="text-[10px] text-slate-600 uppercase font-black mt-2">Clique em 'Novo Processo' para iniciar o controle.</p>
        </div>
      )}
    </div>
  );
}
