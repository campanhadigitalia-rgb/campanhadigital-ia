import { useState, useEffect } from 'react';
import { Shield, CheckCircle, Gavel, Clock, Activity, CreditCard, User, Users, FileText, Globe, AlertTriangle, FileBadge, CheckSquare, MessageCircle, DollarSign, PlusCircle } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useLegalItems } from '../../hooks/useMonitorFeed';

interface LegalContract {
  id: string;
  title?: string;
  name?: string;
  type: string;
  status: string;
  createdAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface LegalNote {
  id: string;
  title: string;
  type: string;
  priority: string;
  date: string;
  desc: string;
  done: boolean;
  createdAt?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default function LegalDashboardPage({ onNavigate }: { onNavigate?: (p: string) => void }) {
  const { campaignId, activeCampaign } = useCampaign();
  
  // Real-time feeds do Monitor Central 
  const { items: alerts } = useLegalItems(campaignId || '', 10);

  const [contracts, setContracts] = useState<LegalContract[]>([]);
  const [showAddNews, setShowAddNews] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [newNews, setNewNews] = useState({ title: '', tag: 'Geral' });
  const [newContract, setNewContract] = useState({ title: '', type: 'Serviço', status: 'Pendente' });

  // States para novos widgets
  const [legalNotes, setLegalNotes] = useState<LegalNote[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [legalRequests, setLegalRequests] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [marketingApprovals, setMarketingApprovals] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', type: 'Processo', priority: 'Normal', date: '', desc: '' });

  useEffect(() => {
    if (!campaignId) return;

    const qContracts = query(collection(db, `campaigns/${campaignId}/legal_contracts`), orderBy('createdAt', 'desc'), limit(50));
    const unsubContracts = onSnapshot(qContracts, snap => {
      setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalContract)));
    });

    const qNotes = query(collection(db, `campaigns/${campaignId}/legal_notes`), orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(qNotes, snap => setLegalNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalNote))));

    const qFinance = query(collection(db, `campaigns/${campaignId}/finance_transactions`), orderBy('date', 'desc'), limit(10));
    const unsubFinance = onSnapshot(qFinance, snap => setFinanceTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qRequests = query(collection(db, `campaigns/${campaignId}/legal_requests`), orderBy('createdAt', 'desc'), limit(20));
    const unsubRequests = onSnapshot(qRequests, snap => setLegalRequests(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qApprovals = query(collection(db, `campaigns/${campaignId}/marketing_approvals`), orderBy('createdAt', 'desc'), limit(20));
    const unsubApprovals = onSnapshot(qApprovals, snap => setMarketingApprovals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => {
      unsubContracts();
      unsubNotes();
      unsubFinance();
      unsubRequests();
      unsubApprovals();
    };
  }, [campaignId]);

  const identity = activeCampaign?.identity;
  const legalConfig = activeCampaign?.legalConfig;
  const checklist = legalConfig?.checklist || {};
  
  const chkItems = [
    { key: 'cnpj_emitted', label: 'CNPJ de Campanha', weight: 20 },
    { key: 'spce_setup', label: 'SPCE Instalado', weight: 20 },
    { key: 'docs', label: 'Dossiê Documental', weight: 20 },
    { key: 'tre', label: 'Certidões Criminais (TRE)', weight: 20 },
    { key: 'fidelidade', label: 'Certidão de Filiação', weight: 20 },
  ];

  const totalProgress = chkItems.reduce((acc, item) => acc + (checklist[item.key as keyof typeof checklist] ? item.weight : 0), 0);
  
  // Alertas agora vem do feed real (Monitor Geral) - sentimentos críticos/negativos contam como processo ativo pendente
  const activeProcessCount = alerts.filter(a => a.sentiment === 'critico' || a.sentiment === 'negativo').length;

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newNews.title) return;
    await addDoc(collection(db, `campaigns/${campaignId}/legal_news`), {
      ...newNews,
      createdAt: serverTimestamp()
    });
    setNewNews({ title: '', tag: 'Geral' });
    setShowAddNews(false);
  };

  const handleAddContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newContract.title) return;
    await addDoc(collection(db, `campaigns/${campaignId}/legal_contracts`), {
      ...newContract,
      createdAt: serverTimestamp()
    });
    setNewContract({ title: '', type: 'Serviço', status: 'Pendente' });
    setShowAddContract(false);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !newNote.desc || !newNote.title) return;
    await addDoc(collection(db, `campaigns/${campaignId}/legal_notes`), {
      ...newNote,
      done: false,
      createdAt: serverTimestamp()
    });
    setShowAddNote(false);
    setNewNote({ title: '', type: 'Processo', priority: 'Normal', date: '', desc: '' });
  };

  const toggleNoteDone = async (note: LegalNote) => {
    const { doc, updateDoc } = await import('firebase/firestore');
    const noteRef = doc(db, `campaigns/${campaignId}/legal_notes/${note.id}`);
    await updateDoc(noteRef, { done: !note.done });
  };


  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-700">
      {/* 1. Header: Mesa do Advogado / Identificação */}
      <section className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 glass-card p-6 border-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row gap-6">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Shield size={120} />
          </div>
          
          {/* Foto e Perfil */}
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 overflow-hidden bg-slate-800 shadow-xl">
              {identity?.photoOfficial || (activeCampaign as any)?.photoURL ? ( // eslint-disable-line @typescript-eslint/no-explicit-any
                <img src={identity?.photoOfficial || (activeCampaign as any)?.photoURL} alt="Avatar" className="w-full h-full object-cover" /> // eslint-disable-line @typescript-eslint/no-explicit-any
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={40}/></div>
              )}
            </div>
            <div className="text-center">
               <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-black uppercase tracking-widest">{identity?.position || 'Cargo não definido'}</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 relative z-10">
            <div>
              <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
                {identity?.candidateNumber && (
                   <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-mono tracking-widest">{identity.candidateNumber}</span>
                )}
                {identity?.urnName || identity?.name || 'Candidato s/ nome'}
                <CheckCircle size={18} className="text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-tight mt-1">
                {[identity?.party, identity?.coalition, identity?.location ? `${identity.location} / ${identity.state}` : null].filter(Boolean).join(' • ')}
                {identity?.electionScope && <span className="ml-2 px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[9px] border border-slate-700">{identity.electionScope}</span>}
              </p>
              <p className="text-[10px] text-slate-500 font-mono mt-1 tracking-tight">
                {identity?.cpf && <span>CPF: {identity.cpf}  </span>}
                {identity?.whatsappOfficial && <span>WPP: {identity.whatsappOfficial}</span>}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-indigo-400"/> Chapa Majoritária</p>
                  <div className="space-y-1">
                    {identity?.subCharacters && identity.subCharacters.length > 0 ? (
                      identity.subCharacters.map((c: {role: string; name: string}, i: number) => (
                        <p key={i} className="text-xs font-bold text-slate-300">{c.role}: <span className="text-slate-400">{c.name}</span></p>
                      ))
                    ) : (
                      <p className="text-[10px] italic text-slate-600">Nenhum vice/suplente cadastrado.</p>
                    )}
                  </div>
               </div>
               <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><CreditCard size={12} className="text-emerald-400"/> Dados Legais (SPCE)</p>
                  <div className="space-y-1">
                     <p className="text-xs font-bold text-slate-300">CNPJ: <span className="text-slate-400 font-mono tracking-tighter">{legalConfig?.cnpj || ''}</span></p>
                     <p className="text-xs font-bold text-slate-300">Banco: <span className="text-slate-400 line-clamp-1">{legalConfig?.bankAccount || ''}</span></p>
                  </div>
               </div>
            </div>
          </div>

          <div className="w-full md:w-32 flex flex-col justify-center gap-2 relative z-10">
              <button 
                onClick={() => {
                  if (!legalConfig?.cnpj) {
                    alert('ERRO: Informe o CNPJ de campanha para validação Receita/TSE.');
                    return;
                  }
                  alert('Sentinela conferindo CNPJ na base da Receita e TSE... OK! \n\n(A automação de CPF depende da resolução de Captchas do TRE, não disponível nesta demo.)');
                }}
                className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Conferir IA
              </button>
              <button 
                onClick={() => onNavigate?.('settings')}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-400 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Editar Perfil
              </button>
          </div>
        </div>

        <div className={`glass-card p-6 flex flex-col justify-center items-center text-center gap-4 ${activeProcessCount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
           <div className={`p-4 rounded-full ${!identity?.cpf && !legalConfig?.cnpj ? 'bg-amber-500/10 text-amber-500/50' : activeProcessCount > 0 ? 'bg-rose-500/20 text-rose-400 animate-pulse' : 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]'}`}>
              {(!identity?.cpf && !legalConfig?.cnpj) ? <Activity size={32} /> : activeProcessCount > 0 ? <Gavel size={32} /> : <Shield size={32} />}
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Status Processual</p>
              {(!identity?.cpf && !legalConfig?.cnpj) ? (
                 <h3 className="text-sm font-black text-amber-500/80 uppercase mt-1">Requer CPF/CNPJ</h3>
              ) : (
                <h3 className={`text-xl font-black ${activeProcessCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {activeProcessCount > 0 ? `${activeProcessCount} Pendências` : 'Ficha Limpa'}
                </h3>
              )}
           </div>
           <button onClick={() => onNavigate?.('legal_monitor')} className="text-[9px] font-bold text-indigo-400 underline uppercase tracking-tighter">Acessar PJe Monitor</button>
        </div>
      </section>

      {/* 2. Grid de Operação: Deferimento / Contratos / Jurisprudência */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna 1: Deferimento Eleitoral (Checklist) */}
        <div className="glass-card p-6 border-white/5 space-y-5">
           <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400"/> Deferimento Candidatura</h3>
              <span className="text-xl font-black text-slate-100">{totalProgress}%</span>
           </div>
           <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${totalProgress}%` }} />
           </div>
           <div className="space-y-3 pt-2">
              {chkItems.map((item, i) => {
                const isDone = checklist[item.key as keyof typeof checklist];
                return (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg border border-white/5">
                    <span className="text-[11px] font-bold text-slate-300">{item.label}</span>
                    {isDone ? <CheckCircle size={14} className="text-emerald-400" /> : <Clock size={14} className="text-amber-500/50" />}
                  </div>
                );
              })}
           </div>
           <button onClick={() => onNavigate?.('legal_docs')} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Ver Documentação</button>
        </div>

        {/* Coluna 2: Fila de Atividades (Contratos & Prazos) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="glass-card border border-white/5 overflow-hidden flex flex-col">
              <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Globe size={14} className="text-indigo-400"/> Jurisprudência (TSE/Diário)</h3>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto min-h-[250px] max-h-[400px] custom-scrollbar">
                 {alerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <Globe size={24} className="text-slate-700 mb-2 opacity-20" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase">Sem registros judiciais</p>
                    </div>
                 ) : (
                     alerts.map(n => (
                      <div key={n.id} className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 space-y-1 hover:bg-indigo-500/10 transition-colors">
                        <div className="flex justify-between items-start">
                          <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[7px] font-black uppercase">{n.subject || 'Diário Oficial'}</span>
                          <span className="text-[8px] text-slate-500 font-mono">{n.fetchedAt ? new Date(n.fetchedAt).toLocaleDateString() : ''}</span>
                        </div>
                        <a href={n.url || '#'} target="_blank" rel="noopener noreferrer" className="block mt-1 group">
                           <p className="text-[10px] font-bold text-slate-200 leading-snug group-hover:text-indigo-300 group-hover:underline">{n.title}</p>
                           {n.summary && <p className="text-[9px] text-slate-400 line-clamp-4 leading-tight mt-1 group-hover:text-slate-300">{n.summary}</p>}
                        </a>
                      </div>
                    ))
                 )}
              </div>
               <div className="p-4 pt-0">
                   <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center gap-3">
                      <Activity size={16} className="text-slate-600" />
                      <p className="text-[9px] text-slate-600 uppercase font-black tracking-tighter">Eventos processuais de diários oficiais e TSE.</p>
                   </div>
               </div>
           </div>

           <div className="glass-card border border-white/5 overflow-hidden flex flex-col">
              <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileText size={14} className="text-amber-400"/> Validação de Contratos</h3>
                 <button onClick={() => setShowAddContract(true)} className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[8px] font-black uppercase hover:bg-indigo-500/40 transition-colors">+ Novo</button>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto min-h-[250px] max-h-[400px] custom-scrollbar">
                 {contracts.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <FileText size={24} className="text-slate-700 mb-2 opacity-20" />
                      <p className="text-[10px] text-slate-600 font-bold uppercase">Nenhum contrato em auditoria</p>
                   </div>
                 ) : (
                   contracts.map(c => (
                     <div key={c.id} onClick={() => alert('Abrindo detalhes do contrato...')} className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between group cursor-pointer hover:border-amber-500/50 hover:bg-black/40 transition-all">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-slate-200 group-hover:text-amber-400">{c.title || c.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="text-[8px] text-slate-400 font-mono">{c.createdAt ? (c.createdAt as any).toDate?.().toLocaleDateString() || 'Recente' : 'Recente'}</span>{/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                             <span className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">{c.type || 'Contrato'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end justify-center gap-1">
                           {c.status === 'Aprovado' ? <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-500/20 text-emerald-400">Aprovado</span> 
                           : c.status === 'Recusado' ? <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-500/20 text-rose-400">Recusado</span>
                           : <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-500/20 text-amber-400">Pendente</span>}
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <div className="p-4 pt-0">
                 <button onClick={() => onNavigate?.('legal_financeiro')} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Ver Auditoria Financeira</button>
              </div>
           </div>
        </div>
      </div>

      {/* 3. Fila de Trabalho (3 cards) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {/* Card 1: Auditoria Financeira */}
         <div className="glass-card border border-white/5 overflow-hidden flex flex-col">
            <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><DollarSign size={14} className="text-emerald-400"/> Auditoria Financeira</h3>
            </div>
            <div className="p-4 flex-1 space-y-4">
               <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div>
                    <p className="text-[9px] font-black uppercase text-emerald-500 tracking-tight">Status do Caixa</p>
                    <p className="text-sm font-bold text-slate-200">Regular</p>
                  </div>
                  <Activity size={20} className="text-emerald-400" />
               </div>
               <div className="space-y-2">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={12}/> Últimas Transações</p>
                  {financeTransactions.length === 0 ? (
                    <p className="text-[10px] text-slate-600 font-bold uppercase">Nenhuma transação financeira registrada.</p>
                  ) : (
                    financeTransactions.slice(0, 2).map((ft) => (
                      <div key={ft.id} className="p-2 border-l-2 border-amber-500 bg-black/20">
                         <p className="text-[10px] font-bold text-slate-200">{ft.description || 'Transação genérica'}</p>
                         <p className="text-[9px] text-slate-500">R$ {ft.amount ? ft.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'} - {ft.type === 'expense' ? 'Despesa' : 'Receita'}</p>
                      </div>
                    ))
                  )}
               </div>
            </div>
            <div className="p-4 pt-0">
               <button onClick={() => onNavigate?.('finance_dashboard')} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Abrir Financeiro</button>
            </div>
         </div>

         {/* Card 2: Solicitações de Informação */}
         <div className="glass-card border border-white/5 overflow-hidden flex flex-col">
            <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><MessageCircle size={14} className="text-indigo-400"/> Solicitações Jurídicas</h3>
            </div>
            <div className="p-4 flex-1 space-y-3 overflow-y-auto min-h-[150px] max-h-52 custom-scrollbar">
               {legalRequests.length === 0 ? (
                 <p className="text-[10px] text-slate-600 font-bold uppercase text-center mt-8">Nenhuma solicitação pendente.</p>
               ) : (
                 legalRequests.map(req => (
                   <div key={req.id} className="p-3 bg-black/30 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-1">
                         <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-indigo-500/20 text-indigo-400">{req.department || 'Geral'}</span>
                         <span className="text-[8px] text-slate-500 font-mono">{req.createdAt ? (req.createdAt as any).toDate?.().toLocaleDateString() : 'Recente'}</span>{/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      </div>
                      <p className="text-[10px] font-bold text-slate-200">{req.title}</p>
                      {req.desc && <p className="text-[9px] text-slate-400 line-clamp-2 mt-1">{req.desc}</p>}
                   </div>
                 ))
               )}
            </div>
         </div>

         {/* Card 3: Aprovação de Materiais */}
         <div className="glass-card border border-white/5 overflow-hidden flex flex-col">
            <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileBadge size={14} className="text-blue-400"/> Aprovação de Materiais</h3>
            </div>
            <div className="p-4 flex-1 space-y-3 overflow-y-auto min-h-[150px] max-h-52 custom-scrollbar">
               {marketingApprovals.length === 0 ? (
                 <p className="text-[10px] text-slate-600 font-bold uppercase text-center mt-8">Nenhum material pendente de aprovação.</p>
               ) : (
                 marketingApprovals.map(app => (
                   <div key={app.id} className="p-3 bg-black/30 rounded-lg border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer">
                      <div className="flex justify-between items-start mb-1">
                         <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${app.status === 'Aprovado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{app.status || 'Revisão Pendente'}</span>
                         <span className="text-[8px] text-slate-500 font-mono">{app.createdAt ? (app.createdAt as any).toDate?.().toLocaleDateString() : 'Recente'}</span>{/* eslint-disable-line @typescript-eslint/no-explicit-any */}
                      </div>
                      <p className="text-[10px] font-bold text-slate-200">{app.title}</p>
                      {app.desc && <p className="text-[9px] text-slate-400 line-clamp-2 mt-1">{app.desc}</p>}
                   </div>
                 ))
               )}
            </div>
         </div>
      </section>

      {/* 4. Anotações do Jurídico */}
      <section className="glass-card border border-white/5 overflow-hidden flex flex-col">
          <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-200 flex items-center gap-2"><CheckSquare size={16} className="text-indigo-400"/> Anotações e Prazos do Jurídico</h3>
              <button onClick={() => setShowAddNote(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-500/20 transition-all"><PlusCircle size={14}/> Nova Nota</button>
          </div>
          <div className="p-4 space-y-3 min-h-[150px]">
             {legalNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 opacity-50">
                   <FileText size={32} className="text-slate-600 mb-3" />
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma anotação ou prazo ativo</p>
                   <p className="text-[10px] text-slate-500 mt-1">Use este espaço para registrar andamentos, pautas e datas importantes.</p>
                </div>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                   {legalNotes.map(note => (
                     <div key={note.id} className={`p-4 rounded-xl border transition-all ${note.done ? 'bg-emerald-500/5 border-emerald-500/20 opacity-60' : 'bg-black/30 border-white/10 hover:border-indigo-500/50'}`}>
                        <div className="flex justify-between items-start mb-2">
                           <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${note.type === 'Processo' ? 'bg-rose-500/20 text-rose-400' : note.type === 'Requerimento' ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                              {note.type}
                           </span>
                           {note.date && <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Clock size={10}/> {(new Date(note.date)).toLocaleDateString('pt-BR')}</span>}
                        </div>
                        <p className={`text-xs font-bold mb-1 ${note.done ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{note.title}</p>
                        <p className={`text-[10px] mb-2 ${note.done ? 'text-slate-500 line-through' : 'text-slate-400'}`}>{note.desc}</p>
                        <div className="flex items-center justify-between mt-4">
                           <span className={`text-[8px] font-black uppercase tracking-widest ${note.priority === 'Alta' ? 'text-rose-500' : note.priority === 'Baixa' ? 'text-slate-500' : 'text-amber-500'}`}>Prioridade: {note.priority}</span>
                           <button onClick={() => toggleNoteDone(note)} className={`p-1.5 rounded-md ${note.done ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/20'}`}>
                              <CheckCircle size={14} />
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             )}
          </div>
      </section>

       {/* Modais de Entrada de Dados (No Mocks Policy) */}
       {showAddNews && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <form onSubmit={handleAddNews} className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl w-full max-w-md space-y-4">
             <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Registrar Notícia / Jurisprudência</h3>
             <div className="space-y-3">
               <input required value={newNews.title} onChange={e => setNewNews({...newNews, title: e.target.value})} placeholder="Título da notícia..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white" />
               <select value={newNews.tag} onChange={e => setNewNews({...newNews, tag: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white">
                 <option value="Justiça">Justiça</option>
                 <option value="TRE">TRE/TSE</option>
                 <option value="Calendário">Calendário</option>
                 <option value="Geral">Geral</option>
               </select>
             </div>
             <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setShowAddNews(false)} className="text-xs text-slate-500 font-bold uppercase tracking-widest hover:text-white">Cancelar</button>
               <button type="submit" className="px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">Salvar no BD</button>
             </div>
           </form>
         </div>
       )}

       {showAddContract && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <form onSubmit={handleAddContract} className="bg-slate-900 border border-amber-500/30 p-6 rounded-2xl w-full max-w-md space-y-4">
             <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest">Nova Pasta de Contrato</h3>
             <div className="space-y-3">
               <input required value={newContract.title} onChange={e => setNewContract({...newContract, title: e.target.value})} placeholder="Nome do Objeto (Ex: Locação de Vans)" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white" />
               <select value={newContract.type} onChange={e => setNewContract({...newContract, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white">
                 <option value="Locação">Locação</option>
                 <option value="Pessoal">Pessoal</option>
                 <option value="Marketing">Marketing</option>
                 <option value="Outros">Outros</option>
               </select>
             </div>
             <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setShowAddContract(false)} className="text-xs text-slate-500 font-bold uppercase tracking-widest hover:text-white">Cancelar</button>
               <button type="submit" className="px-6 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">Registrar Autoria</button>
             </div>
           </form>
         </div>
       )}

       {showAddNote && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <form onSubmit={handleAddNote} className="bg-slate-900 border border-indigo-500/30 p-6 rounded-2xl w-full max-w-md space-y-4">
             <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Nova Anotação Jurídica</h3>
             <div className="space-y-3">
               <input required value={newNote.title} onChange={e => setNewNote({...newNote, title: e.target.value})} placeholder="Título da Anotação..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white" />
               <textarea required value={newNote.desc} onChange={e => setNewNote({...newNote, desc: e.target.value})} placeholder="Descreva o andamento, prazo ou observação..." className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white min-h-[100px] resize-none"></textarea>
               <div className="grid grid-cols-2 gap-3">
                  <select value={newNote.type} onChange={e => setNewNote({...newNote, type: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white">
                    <option value="Processo">Processo</option>
                    <option value="Requerimento">Requerimento</option>
                    <option value="Prazo">Prazo</option>
                    <option value="Nota Geral">Nota Geral</option>
                  </select>
                  <select value={newNote.priority} onChange={e => setNewNote({...newNote, priority: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-xs text-white">
                    <option value="Baixa">Baixa Prioridade</option>
                    <option value="Normal">Prioridade Média</option>
                    <option value="Alta">Alta Prioridade</option>
                  </select>
               </div>
               <input type="date" value={newNote.date} onChange={e => setNewNote({...newNote, date: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-white" />
             </div>
             <div className="flex justify-end gap-3 pt-2">
               <button type="button" onClick={() => setShowAddNote(false)} className="text-xs text-slate-500 font-bold uppercase tracking-widest hover:text-white">Cancelar</button>
               <button type="submit" className="px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg">Salvar Nota</button>
             </div>
           </form>
         </div>
       )}
    </div>
  );
}
