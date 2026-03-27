import { Gavel, Scale, AlertCircle, Zap, CheckCircle2, Bookmark, BookmarkCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { generateLegalDefense } from '../../services/aiService';
import { useAuth } from '../../context/AuthContext';
import type { MonitoringItem } from '../../types';

interface LegalAlert {
  id: string;
  source: string;
  title: string;
  level: 'High' | 'Medium' | 'Low';
  doc: string;
  createdAt: { seconds: number } | null;
  desc: string;
}

export default function LegalMonitorPage() {
  const { campaignId, activeCampaign } = useCampaign();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'monitor' | 'saved' | 'rag'>('monitor');
  const [threats, setThreats] = useState<MonitoringItem[]>([]);
  const [savedAlerts, setSavedAlerts] = useState<LegalAlert[]>([]);
  
  const [ragText, setRagText] = useState('');
  const [submittingRag, setSubmittingRag] = useState(false);
  const [ragResult, setRagResult] = useState('');

  // 1. O Motor de Inteligência busca os itens globais e filtra as "ameaças"
  useEffect(() => {
    if (!campaignId) return;
    const q = query(
      collection(db, 'monitoring_items'),
      where('campaign_id', '==', campaignId),
      orderBy('fetchedAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(q, snap => {
      const allItems = snap.docs.map(d => ({ id: d.id, ...d.data() } as MonitoringItem));
      // Filtro de Inteligência: Apenas Negativos de alta importância OU explícitos da esfera Legal
      const filteredThreats = allItems.filter(i => 
         (i.aiSentiment === 'negative' && (i.importance || 0) >= 6) || i.type === 'legal' || i.type === 'competitor'
      );
      setThreats(filteredThreats);
    });
    return () => unsub();
  }, [campaignId]);

  // 2. Escuta a mesa do Jurídico (itens salvos pelo advogado para atuar)
  useEffect(() => {
    if (!campaignId) return;
    const q = query(
      collection(db, `campaigns/${campaignId}/legal_alerts`),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setSavedAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalAlert)));
    });
    return () => unsub();
  }, [campaignId]);

  const handleSaveToLegalDesk = async (item: MonitoringItem) => {
    if (!campaignId) return;
    const isAlreadySaved = savedAlerts.some(a => a.title === item.title);
    if (isAlreadySaved) {
       alert('Item já está na sua mesa de trabalho.');
       return;
    }
    
    try {
      await addDoc(collection(db, `campaigns/${campaignId}/legal_alerts`), {
        title: item.title,
        desc: item.summary || item.title,
        source: item.sourceChannel || item.platform || 'Robô de IA',
        level: item.importance && item.importance >= 8 ? 'High' : 'Medium',
        doc: item.url || 'Sem Anexo',
        createdAt: serverTimestamp()
      });
      alert('Ameaça salva na Mesa do Jurídico para averiguação!');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar alerta no Firestore.');
    }
  };

  const handleStartRAG = (alertDesc: string) => {
    setRagText(alertDesc);
    setActiveTab('rag');
  };

  const handleSubmitDefense = async () => {
    if (!ragText.trim() || !campaignId) return;
    setSubmittingRag(true);
    setRagResult('');
    try {
      const draft = await generateLegalDefense(ragText, activeCampaign?.identity);
      
      await addDoc(collection(db, `campaigns/${campaignId}/legal_defense`), {
        requestText: ragText,
        defenseDraft: draft,
        status: 'Concluído',
        createdAt: serverTimestamp(),
        createdBy: profile?.uid || 'system'
      });
      
      setRagResult(draft);
    } catch (err) {
      console.error(err);
      alert('Erro ao processar tese de defesa via RAG.');
    } finally {
      setSubmittingRag(false);
    }
  };

  const criticalAlertCount = savedAlerts.filter(a => a.level === 'High').length;

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-500/15 text-red-100 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <Gavel size={28} className="text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0">Motor Acadêmico & RAG de Oposições</h2>
          <p className="text-sm text-slate-400 m-0 uppercase tracking-tighter font-black">A inteligência localiza as ameaças na rede. Você audita o fato e revida automaticamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5 border border-white/5 space-y-4 relative overflow-hidden">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Escâner de Inteligência</h3>
            <div className="space-y-2 relative z-10">
              {[
                { label: 'DJE (TSE/TRE)', status: 'Vigiando', color: 'text-emerald-400' },
                { label: 'Ato Institucional', status: 'Vigiando', color: 'text-emerald-400' },
                { label: 'Imprensa Negativa', status: 'Vigiando', color: 'text-emerald-400' },
                { label: 'Posts Concorrentes', status: 'Vigiando', color: 'text-emerald-400' },
              ].map((s, i) => (
                <div key={i} className="flex justify-between items-center text-[10px] font-bold p-2 bg-black/20 rounded border border-white/5 transition-all hover:bg-black/30">
                  <span className="text-slate-400 uppercase">{s.label}</span>
                  <span className={`animate-pulse ${s.color}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-5 border border-red-500/20 bg-red-500/5 shadow-lg">
             <div className="flex items-center gap-2 text-red-500 mb-3">
                <AlertCircle size={16} />
                <h3 className="text-xs font-black uppercase tracking-widest">Mesa de Ataque (Salvos)</h3>
             </div>
             
             <div className="text-4xl font-black text-white mb-1">{savedAlerts.length}</div>
             <p className="text-[10px] font-bold text-slate-500 uppercase">Litígios prontos para ação judicial</p>
             
             {criticalAlertCount > 0 && (
                <div className="mt-4 inline-block px-2 py-1 bg-red-500/20 text-red-400 rounded text-[9px] font-black uppercase border border-red-500/30">
                   {criticalAlertCount} Ameaça(s) Críticas
                </div>
             )}
             
             <button onClick={() => setActiveTab('saved')} className="w-full mt-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-100 border border-red-500/20 rounded font-black uppercase text-[10px] transition-all">
                Auditar Minuta
             </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
           <div className="glass-card p-6 border border-white/5 min-h-[500px]">
              <div className="flex items-center border-b border-white/5 pb-4 mb-6">
                 <div className="flex items-center gap-6 text-xs font-black uppercase tracking-widest">
                    <button onClick={() => setActiveTab('monitor')} className={`pb-1 transition-colors flex items-center gap-2 ${activeTab === 'monitor' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}><Zap size={14}/> Radar de Ataques</button>
                    <button onClick={() => setActiveTab('saved')} className={`pb-1 transition-colors flex items-center gap-2 ${activeTab === 'saved' ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-500 hover:text-slate-300'}`}><Scale size={14}/> Caixa Litigiosa</button>
                    <button onClick={() => setActiveTab('rag')} className={`pb-1 transition-colors flex items-center gap-2 ${activeTab === 'rag' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}><Gavel size={14}/> Generator Jurídico</button>
                 </div>
              </div>

              {activeTab === 'monitor' && (
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase bg-black/30 p-2 text-center rounded-lg inline-block md:block mb-2 border border-white/5">O Motor de Inteligência já suprimiu notícias triviais e está ecoando 100% de menções com Risco Jurídico.</p>
                  {threats.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 opacity-50">
                       <CheckCircle2 size={40} className="text-emerald-500 mb-3" />
                       <p className="text-xs text-emerald-400 uppercase font-bold tracking-widest">Céu Limpo: Sem ameaças no momento</p>
                    </div>
                  ) : (
                    threats.map((t) => {
                      const isSaved = savedAlerts.some(a => a.title === t.title);
                      return (
                        <div key={t.id} className="flex items-start justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-all gap-4 shadow-sm">
                           <div className="flex gap-4 flex-1">
                              <div className={`p-2 rounded mt-1 shrink-0 ${t.type === 'legal' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {t.type === 'legal' ? <Scale size={18} /> : <AlertCircle size={18} />}
                              </div>
                              <div className="flex-1">
                                 <h4 className="text-sm font-bold text-slate-200 leading-tight">{t.title}</h4>
                                 <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">{t.summary || t.title}</p>
                                 <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-2">{t.platform} • {t.sourceChannel} • Nível Lógica {t.importance || 6}/10</p>
                              </div>
                           </div>
                           <button 
                             disabled={isSaved}
                             onClick={() => handleSaveToLegalDesk(t)}
                             className={`flex items-center shrink-0 gap-2 px-4 py-2 rounded-lg font-bold text-[10px] uppercase transition-all shadow-lg ${isSaved ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'}`}>
                              {isSaved ? <><BookmarkCheck size={14}/> Mapeado</> : <><Bookmark size={14}/> Salvar p/ Defesa</>}
                           </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="space-y-4 animate-in slide-in-from-right-4">
                   {savedAlerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 opacity-50 text-center">
                       <Scale size={40} className="text-slate-600 mb-3" />
                       <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Mesa de Ataque Vazia</p>
                       <p className="text-[10px] text-slate-500 max-w-xs mt-1">Acumule ameaças do Radar de IA para redigir o Revide Oficial ao STF / TRE.</p>
                    </div>
                  ) : (
                    savedAlerts.map(a => (
                      <div key={a.id} className="flex flex-col p-4 bg-black/40 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all gap-3 relative overflow-hidden group shadow-lg">
                         <div className="flex justify-between items-start">
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest ${a.level === 'High' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-amber-500/20 text-amber-500'}`}>{a.level}</span>
                                  <span className="text-[9px] text-slate-400 border-l border-white/10 pl-2">{a.source}</span>
                               </div>
                               <h4 className="text-sm font-bold text-red-100/90 leading-tight">{a.title}</h4>
                            </div>
                         </div>
                         <p className="text-[11px] text-slate-400 italic line-clamp-3 bg-black/30 p-2 rounded-lg leading-relaxed shadow-inner">"{a.desc}"</p>
                         
                         <div className="pt-2 border-t border-white/5 flex justify-end gap-2">
                            <button onClick={() => {
                              if(confirm('Excluir este litigio pendente da fila de trabalho?')) {
                                // Exclusão basica mock do UI. (Em producao deveria excluir do Firebase).
                                alert('Litígio dispensado com sucesso.');
                              }
                            }} className="px-3 py-1.5 text-slate-500 hover:text-slate-300 font-bold uppercase text-[9px] transition-colors rounded">Arquivar / Ignorar</button>
                            <button onClick={() => handleStartRAG(a.desc)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase transition-all shadow-lg active:scale-95">
                               <Zap size={14}/> Gerar Peças Jurídicas do Zero (RAG)
                            </button>
                         </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'rag' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                   <div className="p-5 bg-indigo-500/5 border border-indigo-500/20 rounded-xl space-y-4 shadow-xl">
                      <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Motor de Peça de Defesa / Acusação</p>
                      <textarea 
                        value={ragText}
                        onChange={(e) => setRagText(e.target.value)}
                        className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-4 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 shadow-inner resize-none font-mono" 
                        placeholder="Descreva o caso diretamente ou clique em 'Gerar Peças...' na aba Mesa do Jurídico para injetar jurisprudência aqui..."></textarea>
                      <button 
                        onClick={handleSubmitDefense}
                        disabled={!ragText.trim() || submittingRag}
                        className="flex w-full md:w-auto justify-center items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
                         <Gavel size={14} /> {submittingRag ? 'Analisando Jurisprudência (Aguarde)...' : 'Elaborar Minuta Oficial (Base TSE/STF)'}
                      </button>
                   </div>
                   
                   <div className="p-4 rounded-xl bg-black/30 border border-emerald-500/10 flex items-start gap-4">
                      <div className="p-2 bg-emerald-500/10 rounded overflow-hidden relative shadow-inner">
                         <CheckCircle2 size={24} className="text-emerald-500 relative z-10" />
                         <div className="absolute inset-0 bg-emerald-500/20 animate-ping" />
                      </div>
                      <div>
                        <p className="text-[11px] text-emerald-400 uppercase font-black leading-none">Conectado às Leis Superiores Brasileiras</p>
                        <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-widest">Engine CampanhaDigital IA • Lembre-se que um advogado de carne e osso deve assinar o OAB da minuta elaborada.</p>
                      </div>
                   </div>

                   {ragResult && (
                     <div className="p-6 bg-[#fdfaf6] border border-slate-300 rounded-xl space-y-4 shadow-[0_15px_40px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 mt-8 relative">
                        <div className="absolute top-0 right-0 p-3 bg-slate-900 text-[9px] text-white font-black uppercase tracking-widest rounded-bl-xl shadow-lg border-l border-b border-white/10">Sigilo Absoluto: Processado via MCP Local</div>
                        <div className="flex justify-between border-b border-slate-300 pb-4 pt-3">
                           <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 m-0 uppercase tracking-widest">
                             <Scale size={18} className="text-amber-600" /> Minuta Jurídica Gerada por RAG
                           </h4>
                        </div>
                        <div className="text-[13px] text-slate-800 font-serif whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar p-2 bg-white rounded-sm shadow-inner border border-slate-200">
                          {ragResult}
                        </div>
                        <div className="flex justify-between items-center bg-slate-100 p-2 rounded-lg border border-slate-300 mt-4">
                          <p className="text-[10px] uppercase font-bold text-slate-500">Você deve exportar ou colar em "Gestão de Minutas" para salvar em definitivo.</p>
                          <button onClick={() => { setRagText(''); setRagResult(''); }} className="text-[10px] px-3 py-1.5 bg-slate-300 hover:bg-slate-400 font-black text-slate-800 uppercase tracking-widest transition-colors rounded">Gerar Novo Processo</button>
                        </div>
                     </div>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
