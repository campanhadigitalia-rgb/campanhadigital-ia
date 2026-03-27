import { useState, useEffect } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Send, CheckCircle, Clock, Plus, X, ArrowRightLeft } from 'lucide-react';

export type Dept = 'Financeiro' | 'Jurídico';

interface Props {
  currentDepartment: Dept;
}

interface RequestItem {
  id: string;
  title: string;
  desc: string;
  fromDept: Dept;
  toDept: Dept;
  status: 'Pendente' | 'Respondida';
  response?: string;
  createdAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function DepartmentRequests({ currentDepartment }: Props) {
  const { campaignId } = useCampaign();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeRes, setActiveRes] = useState<RequestItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [toDept, setToDept] = useState<Dept>(currentDepartment === 'Financeiro' ? 'Jurídico' : 'Financeiro');
  const [resText, setResText] = useState('');

  useEffect(() => {
    if (!campaignId) return;
    const q = query(
      collection(db, `campaigns/${campaignId}/department_requests`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as RequestItem)));
    });
    return () => unsub();
  }, [campaignId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !title) return;
    await addDoc(collection(db, `campaigns/${campaignId}/department_requests`), {
      title,
      desc,
      fromDept: currentDepartment,
      toDept,
      status: 'Pendente',
      createdAt: serverTimestamp()
    });
    setIsModalOpen(false);
    setTitle('');
    setDesc('');
  };

  const handleResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !activeRes) return;
    await updateDoc(doc(db, `campaigns/${campaignId}/department_requests`, activeRes.id), {
      status: 'Respondida',
      response: resText,
      updatedAt: serverTimestamp()
    });
    setActiveRes(null);
    setResText('');
  };

  const myIncoming = requests.filter(r => r.toDept === currentDepartment);
  const myOutgoing = requests.filter(r => r.fromDept === currentDepartment);

  // Exibe apenas as mais recentes na mini-view
  const displayItems = [...myIncoming, ...myOutgoing].sort((a,b) => {
    const tA = a.createdAt?.seconds || 0;
    const tB = b.createdAt?.seconds || 0;
    return tB - tA;
  }).slice(0, 5);

  const pendingIncomingCount = myIncoming.filter(r => r.status === 'Pendente').length;

  return (
    <div className="glass-card border border-white/5 overflow-hidden flex flex-col relative w-full h-full min-h-[300px]">
       <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg relative">
                <ArrowRightLeft size={16}/>
                {pendingIncomingCount > 0 && (
                   <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full text-[9px] font-black text-white flex items-center justify-center animate-pulse">{pendingIncomingCount}</span>
                )}
             </div>
             <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-200">Mesa de Comunicação</h3>
                <p className="text-[9px] font-bold text-slate-400">Tickets {currentDepartment}</p>
             </div>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-500/20 transition-all">
             <Plus size={14}/> Nova Solicitação
          </button>
       </div>

       <div className="p-4 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 opacity-50">
               <MessageCircle size={32} className="text-slate-600 mb-3" />
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Caixa de Entrada Vazia</p>
               <p className="text-[10px] text-slate-500 mt-1">Nenhuma solicitação trafegada.</p>
            </div>
          ) : (
             displayItems.map(req => {
                const isMine = req.fromDept === currentDepartment;
                const needsMyAction = !isMine && req.status === 'Pendente';
                
                return (
                  <div key={req.id} className={`p-3 rounded-lg border transition-all ${needsMyAction ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-black/30 border-white/5 hover:bg-black/40'}`}>
                     <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1">
                           {isMine ? (
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-white/5 flex gap-1"><ArrowRightLeft size={10}/> Enviado p/ {req.toDept}</span>
                           ) : (
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex gap-1"><ArrowRightLeft size={10}/> De: {req.fromDept}</span>
                           )}
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase flex items-center gap-1 ${req.status === 'Respondida' ? 'text-emerald-400' : 'text-amber-400'}`}>
                           {req.status === 'Pendente' ? <Clock size={10}/> : <CheckCircle size={10}/>} {req.status}
                        </span>
                     </div>
                     <p className="text-[11px] font-bold text-slate-200">{req.title}</p>
                     {req.desc && <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{req.desc}</p>}
                     
                     {/* Secretion Action OR Response Box */}
                     {req.status === 'Respondida' && req.response ? (
                        <div className="mt-3 p-2 bg-slate-900 border border-white/5 rounded-lg border-l-2 border-l-emerald-500">
                           <p className="text-[9px] font-black uppercase text-emerald-500 mb-0.5">Resposta ({isMine ? req.toDept : currentDepartment}):</p>
                           <p className="text-[10px] text-slate-300">{req.response}</p>
                        </div>
                     ) : needsMyAction ? (
                        <button onClick={() => {setActiveRes(req); setResText('');}} className="mt-3 w-full py-1.5 rounded bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/40 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-colors">
                           <Send size={12}/> Responder Solicitação
                        </button>
                     ) : null}
                  </div>
                );
             })
          )}
       </div>

       {/* MODAL NOVA SOLICITAÇÃO */}
       {isModalOpen && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <form onSubmit={handleCreate} className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center">
                 <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest"><MessageCircle size={16} className="text-indigo-400"/> Nova Solicitação</h3>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><X size={20}/></button>
             </div>
             
             <div className="space-y-3 pt-2">
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-500 uppercase">Para qual Departamento?</label>
                   <select value={toDept} onChange={e => setToDept(e.target.value as Dept)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-indigo-500/50">
                     <option value="Jurídico">Jurídico / Compliance</option>
                     <option value="Financeiro">Financeiro / Contábil</option>
                   </select>
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-500 uppercase">Assunto Breve</label>
                   <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Liberar Nota Fiscal G12, Aprovar Contrato X..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white outline-none focus:border-indigo-500/50" />
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-500 uppercase">Detalhes Adicionais</label>
                   <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Insira IDs de transação ou CPFs para facilitar a busca..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white min-h-[100px] resize-none outline-none focus:border-indigo-500/50"></textarea>
                 </div>
             </div>
             
             <div className="flex justify-end pt-2">
               <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                  <Send size={14}/> Enviar Ticket
               </button>
             </div>
           </form>
         </div>
       )}

       {/* MODAL RESPONDER */}
       {activeRes && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <form onSubmit={handleResponse} className="bg-slate-900 border border-emerald-500/30 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
             <div className="flex justify-between items-center border-b border-white/5 pb-3">
                 <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest"><MessageCircle size={16} className="text-emerald-400"/> Responder Ticket</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">De: {activeRes.fromDept}</p>
                 </div>
                 <button type="button" onClick={() => setActiveRes(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
             </div>
             
             <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                <p className="text-[11px] font-bold text-slate-200">{activeRes.title}</p>
                {activeRes.desc && <p className="text-[10px] text-slate-400 mt-1">{activeRes.desc}</p>}
             </div>
             
             <div className="space-y-1 pt-2">
                <label className="text-[9px] font-black text-slate-500 uppercase">Sua Resposta / Solução</label>
                <textarea required value={resText} onChange={e => setResText(e.target.value)} placeholder="Digite o retorno oficial..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white min-h-[100px] resize-none outline-none focus:border-emerald-500/50"></textarea>
             </div>
             
             <div className="flex justify-end pt-2">
               <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                  <CheckCircle size={14}/> Finalizar Chamado
               </button>
             </div>
           </form>
         </div>
       )}
    </div>
  );
}
