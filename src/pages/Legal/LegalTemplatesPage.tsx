import { useState, useEffect } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { db } from '../../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { FileText, Plus, Save, Trash2, Clock, CheckCircle } from 'lucide-react';

interface LegalTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  updatedAt: any;
}

export default function LegalTemplatesPage() {
  const { campaignId } = useCampaign();
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<LegalTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    const q = query(collection(db, `campaigns/${campaignId}/legal_templates`), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalTemplate)));
    });
    return () => unsub();
  }, [campaignId]);

  const handleCreateNew = () => {
    setActiveTemplate({
      id: `new-${Date.now()}`,
      title: 'Nova Minuta Padrão',
      category: 'Serviço Pessoa Física',
      content: 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS...\n\nPor este instrumento particular e na melhor forma de direito, de um lado {{CAMPANHA_NOME}}, inscrita no CNPJ sob nº {{CAMPANHA_CNPJ}}, doravante denominada CONTRATANTE...\n\nSendo assim, as partes assinam o presente acordo.',
      updatedAt: new Date()
    });
  };

  const handleSave = async () => {
    if (!campaignId || !activeTemplate) return;
    setIsSaving(true);
    try {
      const docId = activeTemplate.id.startsWith('new-') ? `tpl-${Date.now()}` : activeTemplate.id;
      const docRef = doc(db, `campaigns/${campaignId}/legal_templates`, docId);
      const toSave = { ...activeTemplate, updatedAt: serverTimestamp() };
      // @ts-ignore
      delete toSave.id;
      await setDoc(docRef, toSave, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (activeTemplate.id.startsWith('new-')) {
         setActiveTemplate({ ...activeTemplate, id: docId });
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar no Firestore');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!campaignId || !confirm('Excluir esta minuta de forma irreversível? O Financeiro não poderá mais usá-la em novos contratos.')) return;
    try {
      await deleteDoc(doc(db, `campaigns/${campaignId}/legal_templates`, id));
      if (activeTemplate?.id === id) setActiveTemplate(null);
    } catch (e) {
      alert('Erro ao excluir no Firestore');
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-700">
      
      {/* SIDEBAR: Lista de Modelos */}
      <div className="w-64 glass-card border flex flex-col relative z-20 border-white/5">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
           <h2 className="text-xs font-black uppercase text-slate-300 tracking-widest flex items-center gap-2"><FileText size={14} className="text-amber-400"/> Minutas (Modelos)</h2>
           <button onClick={handleCreateNew} className="p-1.5 hover:bg-white/10 rounded-md text-amber-400 transition-colors shadow-lg"><Plus size={16}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
           {templates.length === 0 ? (
             <p className="text-[10px] text-center text-slate-500 font-bold uppercase mt-10">Nenhuma minuta arquivada no BD da campanha.</p>
           ) : (
             templates.map(t => (
               <div key={t.id} onClick={() => setActiveTemplate(t)} className={`p-3 rounded-xl border cursor-pointer transition-all ${activeTemplate?.id === t.id ? 'bg-amber-500/10 border-amber-500/30' : 'bg-black/30 border-white/5 hover:border-white/20'}`}>
                 <p className={`text-xs font-bold leading-tight ${activeTemplate?.id === t.id ? 'text-amber-400' : 'text-slate-200'}`}>{t.title}</p>
                 <div className="flex items-center justify-between mt-2">
                    <span className="text-[7px] px-1.5 py-0.5 rounded bg-white/10 uppercase font-black text-slate-400">{t.category}</span>
                    <span className="text-[8px] font-mono text-slate-500">{t.updatedAt?.toDate?.().toLocaleDateString() || 'Recente'}</span>
                 </div>
               </div>
             ))
           )}
        </div>
      </div>

      {/* ÁREA PRINCIPAL: Editor "Word" Visual */}
      <div className="flex-1 flex flex-col relative">
         {!activeTemplate ? (
           <div className="flex-1 glass-card border border-white/5 flex flex-col items-center justify-center text-center p-8 opacity-50">
             <FileText size={48} className="text-slate-600 mb-4" />
             <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Editor de Modelos Jurídicos</h3>
             <p className="text-xs text-slate-500 mt-2 max-w-sm">Selecione uma minuta no painel lateral ou crie um novo modelo. Os modelos ficam disponíveis de imediato para a Operação Financeira emitir contratos.</p>
           </div>
         ) : (
           <div className="flex-1 flex flex-col h-full bg-[#E5E7EB] rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 relative">
              {/* Toolbar do "Word" */}
              <div className="h-16 bg-white border-b border-slate-300 flex items-center justify-between px-6 shadow-sm z-10 shrink-0">
                 <div className="flex flex-col flex-1 gap-1">
                    <input value={activeTemplate.title} onChange={e => setActiveTemplate({...activeTemplate, title: e.target.value})} className="text-lg font-black text-slate-800 outline-none bg-transparent placeholder-slate-300 w-full" placeholder="Nome do Modelo (Ex: Contrato de Locação)"/>
                    <div className="flex gap-2 items-center text-[10px] font-bold uppercase text-slate-500">
                       <span className="bg-slate-200 px-1.5 py-0.5 rounded">Categoria do Documento:</span>
                       <select value={activeTemplate.category} onChange={e => setActiveTemplate({...activeTemplate, category: e.target.value})} className="bg-transparent border-none outline-none text-slate-700 font-bold hover:bg-slate-50 cursor-pointer">
                         <option value="Locação Imóveis">Locação Imóveis</option>
                         <option value="Locação Veículos">Locação Veículos</option>
                         <option value="Serviço Pessoa Física">Serviço Pessoa Física</option>
                         <option value="Serviço Marketing">Serviço Marketing</option>
                         <option value="Termos/Declarações">Termos/Declarações</option>
                         <option value="Outros">Outros</option>
                       </select>
                    </div>
                 </div>
                 <div className="flex items-center gap-4 shrink-0">
                    {activeTemplate.id && !activeTemplate.id.startsWith('new-') && (
                       <button onClick={() => handleDelete(activeTemplate.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-bold uppercase" title="Excluir Minuta"><Trash2 size={16}/> Lixeira</button>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                       <Clock size={12}/> {saved ? 'Versão Online Sincronizada' : 'Modificado localmente'}
                    </span>
                    <button onClick={handleSave} disabled={isSaving} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all text-white shadow-lg ${saved ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                       {isSaving ? <span className="animate-pulse">Salvando na Nuvem...</span> : saved ? <><CheckCircle size={14}/> Salvo!</> : <><Save size={14}/> Publicar Minuta</>}
                    </button>
                 </div>
              </div>
              
              {/* Document Editor Area (A4 aspect-like) */}
              <div className="flex-1 overflow-y-auto bg-slate-200 p-8 flex justify-center custom-scrollbar">
                 <textarea 
                   value={activeTemplate.content}
                   onChange={e => setActiveTemplate({...activeTemplate, content: e.target.value})}
                   className="w-full max-w-[850px] min-h-[1100px] h-fit bg-white shadow-xl rounded-sm outline-none p-12 md:p-24 text-sm text-slate-800 font-serif leading-relaxed resize-none border border-slate-300"
                   placeholder="Redija aqui as cláusulas do seu contrato padrão. Utilize tags como {{CONTRATADO_NOME}} ou {{VALOR_TOTAL}} se desejar auto-complete dinâmico futuro..."
                 />
              </div>
           </div>
         )}
      </div>

    </div>
  );
}
