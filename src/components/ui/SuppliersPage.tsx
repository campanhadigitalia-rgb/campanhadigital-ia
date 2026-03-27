import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { Plus, Trash2, Building2, User, Car, Package, ShieldCheck, ShieldAlert, ShieldQuestion, Clock, FileText, CheckCircle2, Copy } from 'lucide-react';

type SupplierType = 'Pessoa Física' | 'Pessoa Jurídica' | 'Veículo' | 'Material' | 'Outro';
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

interface Supplier {
  id: string;
  type: SupplierType;
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  category: string;
  contractValue: number;
  isMonthly?: boolean;
  notes: string;
  activity?: string;
  signatureStatus?: 'pending' | 'signed_gov' | 'signed_physical' | 'signed_digital';
  legalStatus: ApprovalStatus;
  financeStatus: ApprovalStatus;
  paymentStatus: 'paid' | 'pending';
  documentsUrl?: string[];
  createdAt?: { seconds: number };
  roles?: string[];
}

const CATEGORIES = [
  'Locação de Veículo', 'Locação de Imóvel', 'Serviços de Assessoria',
  'Impressão / Gráfica', 'Alimentação em Campo', 'Equipamentos',
  'Serviços de TI', 'Segurança Privada', 'Material de Propaganda',
  'Pesquisa de Opinião', 'Transporte de Eleitores', 'Outro'
];

const TYPE_ICONS: Record<SupplierType, React.FC<{size?: number, className?: string}>> = {
  'Pessoa Física': User,
  'Pessoa Jurídica': Building2,
  'Veículo': Car,
  'Material': Package,
  'Outro': Package,
};

const STATUS_CONFIG: Record<ApprovalStatus, { label: string, color: string, icon: React.FC<{size?: number, className?: string}> }> = {
  pending: { label: 'Pendente', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  approved: { label: 'Aprovado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: ShieldCheck },
  rejected: { label: 'Rejeitado', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: ShieldAlert },
  flagged: { label: 'Revisão', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: ShieldQuestion },
};

const TYPE_COLORS: Record<SupplierType, string> = {
  'Pessoa Física': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'Pessoa Jurídica': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  'Veículo': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Material': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  'Outro': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function SuppliersPage() {
  const { campaignId } = useCampaign();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [filterType, setFilterType] = useState<SupplierType | 'Todos'>('Todos');
  const [form, setForm] = useState<Omit<Supplier, 'id'>>({
    type: 'Pessoa Jurídica', name: '', cpfCnpj: '', phone: '', email: '',
    category: 'Locação de Veículo', contractValue: 0, notes: '',
    legalStatus: 'pending', financeStatus: 'pending', paymentStatus: 'pending', isMonthly: false,
    activity: '', signatureStatus: 'pending', roles: ['fornecedor']
  });
  const [documentsUrl, setDocumentsUrl] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Draft Modal state
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [draftSupplier, setDraftSupplier] = useState<Supplier | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const getPath = useCallback(() => campaignId ? `campaigns/${campaignId}/people` : null, [campaignId]);

  useEffect(() => {
    const p = getPath();
    if (!p) { setSuppliers([]); return; }
    return onSnapshot(collection(db, p), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as Supplier))
        .filter(s => s.roles?.includes('fornecedor') || s.contractValue > 0 || ['Veículo', 'Material'].includes(s.type));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setSuppliers(data);
    });
  }, [getPath]);

  useEffect(() => {
    if (!campaignId) return;
    const unsub = onSnapshot(collection(db, `campaigns/${campaignId}/legal_templates`), snap => {
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [campaignId]);

  const openDraftModal = (s: Supplier) => {
    setDraftSupplier(s);
    setSelectedTemplateId('');
    setDraftContent('');
    setIsGeneratingDraft(true);
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!draftSupplier) return;
    const t = templates.find(x => x.id === templateId);
    if (!t) return;
    
    let content = t.content || '';
    content = content.replace(/\{\{NOME\}\}/g, draftSupplier.name);
    content = content.replace(/\{\{CPF_CNPJ\}\}/g, draftSupplier.cpfCnpj || '___');
    content = content.replace(/\{\{VALOR\}\}/g, fmt(draftSupplier.contractValue || 0));
    content = content.replace(/\{\{OBJETO\}\}/g, draftSupplier.notes || draftSupplier.activity || '___');
    content = content.replace(/\{\{DATA\}\}/g, new Date().toLocaleDateString('pt-BR'));
    
    setDraftContent(content);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !campaignId) return;

    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        urls.push(base64);
      }
      setDocumentsUrl(prev => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      alert('Falha ao converter arquivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdd = async () => {
    const p = getPath();
    if (!p || !form.name.trim()) return;
    
    setAdding(true);
    try {
      await addDoc(collection(db, p), { 
        ...form, 
        documentsUrl,
        createdAt: serverTimestamp() 
      }); 
      setDocumentsUrl([]);
      setForm({ 
        type: 'Pessoa Jurídica', name: '', cpfCnpj: '', phone: '', email: '', 
        category: 'Locação de Veículo', contractValue: 0, notes: '', 
        legalStatus: 'pending', financeStatus: 'pending', paymentStatus: 'pending', isMonthly: false,
        activity: '', signatureStatus: 'pending', roles: ['fornecedor']
      });
    } finally { 
      setAdding(false); 
    }
  };

  const handleUpdateField = async (id: string, field: string, value: any) => {
    const p = getPath();
    if (!p) return;
    await updateDoc(doc(db, p, id), { [field]: value });
  };

  const handleDelete = async (id: string) => {
    const p = getPath();
    if (!p) return;
    if (confirm('Deseja excluir este fornecedor permanentemente?')) {
      await deleteDoc(doc(db, p, id));
    }
  };

  const totalContracted = suppliers.reduce((acc, s) => acc + (s.contractValue ?? 0), 0);
  const filtered = filterType === 'Todos' ? suppliers : suppliers.filter(s => s.type === filterType);

  const inp = 'bg-slate-900 border border-slate-700 text-slate-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-emerald-500/50 w-full';

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20">
          <Building2 size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0 flex items-center gap-2"><Building2 className="text-indigo-400" /> Base de Fornecedores & Contratos</h2>
          <p className="text-sm text-slate-400 m-0 mt-0.5">Cadastre contratos para validação dupla (Financeira + Jurídica). Sincroniza com CRM Global.</p>
        </div>
      </div>

      {/* Form */}
      <div className="glass-card border border-emerald-500/15 p-4 bg-emerald-500/5">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Plus size={14} /> Novo Contrato
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SupplierType }))} className={inp}>
            {['Pessoa Física', 'Pessoa Jurídica', 'Veículo', 'Material', 'Outro'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Nome / Razão Social *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${inp} sm:col-span-2`} />
          <input placeholder="CPF / CNPJ" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} className={inp} />
          
          <input placeholder="Telefone (WhatsApp)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
          <input placeholder="E-mail" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} />
          
          <div className="col-span-2 relative">
             <input type="text" list="supplierCategories" placeholder="Categoria (Digite ou Selecione)" 
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp} />
             <datalist id="supplierCategories">
               {CATEGORIES.map(c => <option key={c} value={c} />)}
             </datalist>
          </div>

          <div className="relative col-span-2 sm:col-span-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
            <input type="number" placeholder="Valor contrato" value={form.contractValue || ''}
              onChange={e => setForm(f => ({ ...f, contractValue: Number(e.target.value) }))}
              className={`${inp} pl-8`} />
          </div>
          <select value={form.isMonthly ? 'mensal' : 'unico'} onChange={e => setForm(f => ({...f, isMonthly: e.target.value === 'mensal'}))} className={inp}>
            <option value="unico">Pag. Único</option>
            <option value="mensal">Mensal</option>
          </select>
          <input placeholder="Breve objeto do contrato / Descrição livre" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inp} sm:col-span-2`} />
          
          <select value={form.signatureStatus} onChange={e => setForm(f => ({ ...f, signatureStatus: e.target.value as any }))} className={`${inp} sm:col-span-3 lg:col-span-3`}>
            <option value="pending">Assinatura Pendente</option>
            <option value="signed_gov">Assinado (Gov.br / Digital)</option>
            <option value="signed_digital">Assinado (Certificado Digital / A1)</option>
            <option value="signed_physical">Assinado (Físico / Papel)</option>
          </select>
          
          {/* UPLOAD MULTIPLO */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-6 flex flex-wrap items-center gap-3 p-3 bg-black/20 rounded-lg border border-slate-700 mt-2">
            <label className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors ${isUploading ? 'bg-slate-700 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
               <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,image/*" />
               {isUploading ? 'Enviando Arquivos...' : 'Anexar Documentos / Notas Fiscais'}
            </label>
            {documentsUrl.map((url, i) => (
               <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30 transition-colors">
                 <FileText size={12} /> Doc {i + 1}
               </a>
            ))}
            
            <button onClick={handleAdd} disabled={adding || !form.name.trim() || isUploading}
              className="ml-auto bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-6 py-2 rounded-lg font-black uppercase text-xs tracking-widest transition-all">
              Registrar Contrato
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-slate-700/30 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 flex-wrap bg-slate-900/40 justify-between">
          <div className="flex gap-2">
            {(['Todos', 'Pessoa Física', 'Pessoa Jurídica', 'Veículo', 'Material'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all ${filterType === t ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="text-[10px] uppercase font-black text-indigo-400 tracking-widest">
            Total Validado Global: {fmt(totalContracted)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-500 border-b border-white/5 uppercase tracking-widest font-black text-[9px]">
                <th className="p-4">Fornecedor</th>
                <th className="p-4">Contato & Categoria</th>
                <th className="p-4 text-right">Valor Negociado</th>
                <th className="p-4 text-center">Gestão de Pagto</th>
                <th className="p-4 text-center">Jurídico / Compliance</th>
                <th className="p-4 text-center">Financeiro</th>
                <th className="p-4 w-10">Opções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => {
                const Icon = TYPE_ICONS[s.type] ?? Package;
                const jurStatus = STATUS_CONFIG[s.legalStatus] || STATUS_CONFIG.pending;
                const finStatus = STATUS_CONFIG[s.financeStatus || 'pending'];

                return (
                  <tr key={s.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-slate-200">{s.name}</p>
                      <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 mt-1 rounded border text-[8px] font-black uppercase ${TYPE_COLORS[s.type]}`}>
                        <Icon size={8} />{s.type}
                      </span>
                      {s.cpfCnpj && <span className="text-[10px] text-slate-500 block mt-1">{s.cpfCnpj}</span>}
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 font-medium">{s.category}</p>
                      <p className="text-[10px] text-slate-500 mt-1 italic max-w-[150px] truncate" title={s.notes}>{s.notes}</p>
                      {(s.phone || s.email) && (
                         <div className="text-[9px] text-slate-600 font-mono mt-1">
                           {s.phone && <span>📞 {s.phone} </span>} {s.email && <span>✉️ {s.email}</span>}
                         </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                       <p className="font-black text-emerald-400">{fmt(s.contractValue)}</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{s.isMonthly ? 'Mensal' : 'Único'}</p>
                    </td>
                    <td className="p-4 text-center">
                       <button onClick={() => handleUpdateField(s.id, 'paymentStatus', s.paymentStatus === 'paid' ? 'pending' : 'paid')}
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-black uppercase transition-colors ${
                             s.paymentStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                          {s.paymentStatus === 'paid' ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                          {s.paymentStatus === 'paid' ? 'Liquidado' : 'A Pagar'}
                       </button>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase ${jurStatus.color}`}>
                          <jurStatus.icon size={12} /> {jurStatus.label}
                        </span>
                        <div className="flex gap-1 opacity-70 hover:opacity-100 transition-opacity">
                           <button onClick={() => handleUpdateField(s.id, 'legalStatus', 'approved')} className="p-1 text-emerald-500 bg-slate-800 hover:bg-emerald-500/10 rounded" title="Aprovação Jurídica"><ShieldCheck size={12}/></button>
                           <button onClick={() => handleUpdateField(s.id, 'legalStatus', 'rejected')} className="p-1 text-rose-500 bg-slate-800 hover:bg-rose-500/10 rounded" title="Rejeitar Documentação"><ShieldAlert size={12}/></button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase ${finStatus.color}`}>
                          <finStatus.icon size={12} /> {finStatus.label}
                        </span>
                        <div className="flex gap-1 opacity-70 hover:opacity-100 transition-opacity">
                           <button onClick={() => handleUpdateField(s.id, 'financeStatus', 'approved')} className="p-1 text-indigo-400 bg-slate-800 hover:bg-indigo-500/20 rounded" title="Autorizar Financeiro"><ShieldCheck size={12}/></button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1 flex-col items-center">
                        <button onClick={() => openDraftModal(s)} className="p-1.5 w-full justify-center flex bg-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 rounded border border-slate-700 transition-all text-[9px] font-bold" title="Gerar Minuta de Contrato">
                           <FileText size={12} className="mr-1"/> Minuta
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 w-full justify-center flex text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all rounded bg-slate-900 border border-slate-800">
                           <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Compliance Info */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex gap-4">
        <ShieldCheck className="text-indigo-400 shrink-0" size={24} />
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-tight">Regra de Dupla Aprovação</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            O Financeiro atesta o lastro financeiro / pagamento da contratação. O Jurídico (Módulo Dossiê) atesta a regularidade fiscal do prestador. Sem ambas, o lançamento no Livro Caixa será denunciado por inconformidade ao TSE.
          </p>
        </div>
      </div>

      {/* Draft Component / Generator */}
      {isGeneratingDraft && draftSupplier && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-indigo-500/30 shadow-[0_0_50px_rgba(79,70,229,0.2)] rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-800/80">
              <div>
                <h4 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest"><FileText className="text-indigo-400" /> Automação de Minuta</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-1">Carregando do Módulo Jurídico: {draftSupplier.name}</p>
              </div>
            </div>
            
            <div className="p-4 bg-indigo-500/10 border-b border-indigo-500/20">
               <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest pl-1">Selecionar Modelo (Criado no Jurídico)</label>
               <select className="w-full mt-2 bg-slate-950 border border-indigo-500/30 text-slate-200 rounded-lg p-3 text-xs outline-none" 
                       value={selectedTemplateId} 
                       onChange={e => applyTemplate(e.target.value)}>
                  <option value="" disabled>-- Escolha um modelo de Contrato Oficial --</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.title} [Versão {t.version || '1.0'}]</option>
                  ))}
               </select>
               {templates.length === 0 && (
                 <p className="text-[10px] text-amber-500 mt-2 font-bold bg-amber-500/10 p-2 rounded">
                   ⚠️ Nenhum modelo localizado. O advogado precisa criar minutas na "Central Jurídica -&gt; Gestão de Minutas".
                 </p>
               )}
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-black/40">
               {draftContent ? (
                  <pre className="font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap font-medium">
                    {draftContent}
                  </pre>
               ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-xs font-bold uppercase py-10">
                     Aguardando seleção do modelo...
                  </div>
               )}
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-slate-900/80">
              {draftContent && (
                <button 
                  onClick={() => { navigator.clipboard.writeText(draftContent); alert('Copiado para a área de transferência!'); }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                >
                  <Copy size={14} /> Copiar Documento Pronto
                </button>
              )}
              <button onClick={() => setIsGeneratingDraft(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-black uppercase">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
