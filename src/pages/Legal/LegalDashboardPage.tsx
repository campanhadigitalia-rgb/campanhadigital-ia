import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Gavel, Clock, Activity, CreditCard, User, Users, FileText, Globe, MessageSquare } from 'lucide-react';
import { useCampaign } from '../../context/CampaignContext';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface LegalAlert {
  id: string;
  title: string;
  type: 'Crítica' | 'Urgente' | 'Informativa';
  desc: string;
  createdAt: any;
}

export default function LegalDashboardPage({ onNavigate }: { onNavigate?: (p: any) => void }) {
  const { campaignId, activeCampaign } = useCampaign();
  const [alerts, setAlerts] = useState<LegalAlert[]>([]);
  const [news] = useState<any[]>([
    { id: 1, title: 'Resolução TSE 23.671: Novos limites para impulsionamento social.', tag: 'Jurisprudência' },
    { id: 2, title: 'TRE-SC publica calendário de auditoria de urnas.', tag: 'Calendário' },
    { id: 3, title: 'Entendimento sobre IA em propagandas se torna mais rígido.', tag: 'Alerta' },
  ]);

  useEffect(() => {
    if (!campaignId) return;
    const q = query(
      collection(db, `campaigns/${campaignId}/legal_alerts`),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, snap => {
      setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalAlert)));
    });
    return () => unsub();
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
  const activeProcessCount = alerts.filter((a: LegalAlert) => a.type === 'Crítica' || a.type === 'Urgente').length;


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
              {identity?.photoOfficial ? (
                <img src={identity.photoOfficial} alt="Avatar" className="w-full h-full object-cover" />
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
                {identity?.urnName || identity?.name || 'Candidato s/ nome'}
                <CheckCircle size={18} className="text-emerald-400" />
              </h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">{identity?.party || '-'} • {identity?.coalition || 'Chapa Pura'} • {identity?.location || '-'} / {identity?.state || '-'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users size={12} className="text-indigo-400"/> Chapa Majoritária</p>
                  <div className="space-y-1">
                    {identity?.subCharacters && identity.subCharacters.length > 0 ? (
                      identity.subCharacters.map((c: any, i: number) => (
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
                     <p className="text-xs font-bold text-slate-300">CNPJ: <span className="text-slate-400 font-mono tracking-tighter">{legalConfig?.cnpj || 'Não cadastrado'}</span></p>
                     <p className="text-xs font-bold text-slate-300">Banco: <span className="text-slate-400 line-clamp-1">{legalConfig?.bankAccount || 'Vazio'}</span></p>
                  </div>
               </div>
            </div>
          </div>

          <div className="w-full md:w-32 flex flex-col justify-center gap-2 relative z-10">
              <button 
                onClick={() => alert("Sentinela conferindo dados... Status: OK.")}
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

        <div className="glass-card p-6 border-rose-500/20 flex flex-col justify-center items-center text-center gap-4 bg-rose-500/5">
           <div className={`p-4 rounded-2xl bg-black/20 ${activeProcessCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-600'}`}>
              <Gavel size={32} />
           </div>
           <div>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest leading-none mb-1">Status Processual</p>
              <h3 className={`text-xl font-black ${activeProcessCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeProcessCount > 0 ? `${activeProcessCount} Pendências` : 'Ficha Limpa'}
              </h3>
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
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><FileText size={14} className="text-amber-400"/> Validação de Contratos</h3>
                 <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[8px] font-black">2 PENDENTES</span>
              </div>
              <div className="p-4 space-y-3 flex-1">
                 {[
                   { id: 1, title: 'Locação de Veículos - Frota A', date: 'Hoje', status: 'pendente' },
                   { id: 2, title: 'Contrato Social Media - Agência X', date: 'Ontem', status: 'pendente' },
                   { id: 3, title: 'Aluguel de Sede Campanha', date: '2 dias', status: 'ok' },
                 ].map(c => (
                   <div key={c.id} className="p-3 bg-black/30 rounded-lg border border-white/5 flex items-center justify-between group cursor-pointer hover:border-amber-500/30 transition-all">
                      <div>
                        <p className="text-xs font-bold text-slate-200">{c.title}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-black">{c.date} • Jurídico Financeiro</p>
                      </div>
                      {c.status === 'pendente' ? <AlertTriangle size={14} className="text-rose-500" /> : <CheckCircle size={14} className="text-emerald-500" />}
                   </div>
                 ))}
              </div>
              <div className="p-4 pt-0">
                 <button onClick={() => onNavigate?.('legal_financeiro')} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">Ver Auditoria Financeira</button>
              </div>
           </div>

           <div className="glass-card border border-white/5 overflow-hidden flex flex-col">
              <div className="p-4 bg-black/20 border-b border-white/5 flex justify-between items-center">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><Globe size={14} className="text-indigo-400"/> Jurisprudência & Notícias</h3>
              </div>
              <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-52 custom-scrollbar">
                 {news.map(n => (
                   <div key={n.id} className="p-3 bg-indigo-500/5 rounded-lg border border-indigo-500/10 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[7px] font-black uppercase">{n.tag}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-200 leading-snug">{n.title}</p>
                   </div>
                 ))}
              </div>
              <div className="p-4 pt-0">
                  <div className="p-3 bg-black/40 rounded-lg border border-white/5 flex items-center gap-3">
                     <Activity size={16} className="text-emerald-500 animate-pulse" />
                     <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">Sentinela IA vasculhando Diário da Justiça (DJE) em tempo real...</p>
                  </div>
              </div>
           </div>
        </div>
      </div>

      {/* 3. Footer: Acompanhamento Estratégico & Compliance */}
      <section className="glass-card p-6 border-indigo-500/10 bg-indigo-500/5">
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
               <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <MessageSquare size={24} />
               </div>
               <div>
                  <h3 className="text-lg font-black text-slate-100">Compliance & Monitoramento de Conteúdo</h3>
                  <p className="text-xs text-slate-500">Acompanhamento síncrono de ataques, repercussões e validade de mídia.</p>
               </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => onNavigate?.('legal_monitor')} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-500/20 transition-all">Abrir Gerador RAG</button>
               <button onClick={() => onNavigate?.('legal_compliance')} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Revisar Mídias</button>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-black/20 rounded-xl border border-rose-500/10">
               <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">Radar de Crise (IA)</p>
               <div className="space-y-3">
                  <div className="p-2 border-l-2 border-rose-500 bg-rose-500/5">
                     <p className="text-xs font-bold text-slate-200">Menção Negativa Detectada</p>
                     <p className="text-[10px] text-slate-500">Twitter: "@candidato não explicou..."</p>
                  </div>
                  <button className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter hover:underline">Gerar Defesa RAG Agora</button>
               </div>
            </div>
            <div className="p-4 bg-black/20 rounded-xl border border-emerald-500/10">
               <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Compliance de Peças</p>
               <div className="flex items-center gap-4">
                  <div className="flex-1 text-center border-r border-white/5">
                    <p className="text-xl font-black text-slate-100">12</p>
                    <p className="text-[9px] text-slate-500 uppercase">Aprovadas</p>
                  </div>
                  <div className="flex-1 text-center">
                    <p className="text-xl font-black text-rose-500">1</p>
                    <p className="text-[9px] text-slate-500 uppercase font-black text-rose-400/80">Rejeitada</p>
                  </div>
               </div>
            </div>
            <div className="p-4 bg-black/20 rounded-xl border border-white/5 space-y-3 text-center flex flex-col justify-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prestação de Contas</p>
               <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <Shield size={20} />
                  <span className="text-sm font-black uppercase">100% Ok</span>
               </div>
               <p className="text-[10px] text-slate-500 leading-tight">Sincronizada com o SPCE e o fluxo financeiro.</p>
            </div>
         </div>
      </section>
    </div>
  );
}
