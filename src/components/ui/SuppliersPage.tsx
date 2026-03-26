import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { Plus, Trash2, Building2, User, Car, Package, ShieldCheck, ShieldAlert, ShieldQuestion, Clock, FileText } from 'lucide-react';

type SupplierType = 'Pessoa Física' | 'Pessoa Jurídica' | 'Veículo' | 'Material' | 'Outro';
type LegalStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

interface Supplier {
  id: string;
  type: SupplierType;
  name: string;
  cpfCnpj: string;
  contact: string;
  category: string;
  contractValue: number;
  isMonthly?: boolean;
  notes: string;
  activity?: string;
  signatureStatus?: 'pending' | 'signed_gov' | 'signed_physical';
  signedUrl?: string;
  legalStatus: LegalStatus;
  legalNotes?: string;
  documentsUrl?: string[];
  createdAt?: { seconds: number };
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

const STATUS_CONFIG: Record<LegalStatus, { label: string, color: string, icon: React.FC<{size?: number, className?: string}> }> = {
  pending: { label: 'Aguardando Jurídico', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock },
  approved: { label: 'Aprovado / Validado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: ShieldCheck },
  rejected: { label: 'Contrato Irregular', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: ShieldAlert },
  flagged: { label: 'Em Revisão', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: ShieldQuestion },
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
  // Use campaignId directly for more stability
  const { campaignId } = useCampaign();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [adding, setAdding] = useState(false);
  const [filterType, setFilterType] = useState<SupplierType | 'Todos'>('Todos');
  const [form, setForm] = useState<Omit<Supplier, 'id'>>({
    type: 'Pessoa Jurídica', name: '', cpfCnpj: '', contact: '',
    category: 'Locação de Veículo', contractValue: 0, notes: '',
    legalStatus: 'pending', isMonthly: false,
    activity: '', signatureStatus: 'pending', signedUrl: ''
  });
  const [documentsUrl, setDocumentsUrl] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftContent, setDraftContent] = useState('');

  const getPath = useCallback(() =>
    campaignId ? `campaigns/${campaignId}/people` : null,
    [campaignId]);

  useEffect(() => {
    const p = getPath();
    if (!p) { setSuppliers([]); return; }
    return onSnapshot(collection(db, p), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setSuppliers(data);
    });
  }, [getPath]);

  const generateDraft = (s: Supplier) => {
    const draftText = `
CONTRATO DE PRESTAÇÃO DE SERVIÇOS - CAMPANHA ELEITORAL 2026

CONTRATANTE: [NOME DO CANDIDATO/COMITÊ]
CONTRATADO: ${s.name}
CPF/CNPJ: ${s.cpfCnpj || '—'}

OBJETO: O contratado prestará serviços de ${s.activity || '[DESCREVER ATIVIDADE]'} para a campanha eleitoral.
VALOR: ${fmt(s.contractValue || 0)} (${s.isMonthly ? 'Mensal' : 'Pagamento Único'})

DATA: ${new Date().toLocaleDateString('pt-BR')}

_________________________________________
Assinatura do Contratado
    `;
    setDraftContent(draftText);
    setIsGeneratingDraft(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !campaignId) return;

    setIsUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Convert to Base64
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
    } catch (err: unknown) {
      console.error(err);
      alert('Falha ao converter arquivo para Base64.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdd = async () => {
    const p = getPath();
    if (!p) { 
       alert('Erro: Campanha não carregada.');
       return; 
    }
    if (!form.name.trim()) return;
    
    setAdding(true);
    try {
      await addDoc(collection(db, p), { 
        ...form, 
        documentsUrl,
        legalStatus: 'pending',
        createdAt: serverTimestamp() 
      }); 
      setDocumentsUrl([]);
    } finally { 
      setAdding(false); 
    }
    setForm({ 
      type: 'Pessoa Jurídica', name: '', cpfCnpj: '', contact: '', 
      category: 'Locação de Veículo', contractValue: 0, notes: '', 
      legalStatus: 'pending', isMonthly: false,
      activity: '', signatureStatus: 'pending', signedUrl: ''
    });
  };

  const handleUpdateStatus = async (id: string, status: LegalStatus) => {
    const p = getPath();
    if (!p) return;
    await updateDoc(doc(db, p, id), { legalStatus: status });
  };

  const handleDelete = async (id: string) => {
    const p = getPath();
    if (!p) return;
    if (confirm('Deseja excluir este fornecedor?')) {
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
          <h2 className="text-xl font-bold text-slate-100 m-0 flex items-center gap-2"><Building2 className="text-indigo-400" /> Base de Pessoas e Fornecedores</h2>
          <p className="text-sm text-slate-400 m-0 mt-0.5">Cadastre contratos, membros da equipe e prestadores para validação jurídica do Módulo Pessoas.</p>
        </div>
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 font-bold rounded-lg transition-colors">
          <Plus size={16} /> Novo Fornecedor
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: suppliers.length, color: 'slate' },
          { label: 'Aguardando Jurídico', count: suppliers.filter(s => s.legalStatus === 'pending').length, color: 'amber' },
          { label: 'Contratos Válidos', count: suppliers.filter(s => s.legalStatus === 'approved').length, color: 'emerald' },
          { label: 'Valor Total Contratado', count: null, value: fmt(totalContracted), color: 'indigo' },
        ].map(k => (
          <div key={k.label} className={`glass-card p-4 border border-${k.color}-500/15`}>
            <p className={`text-[9px] font-black uppercase tracking-widest text-${k.color}-400/70`}>{k.label}</p>
            <p className={`text-xl font-black text-${k.color}-400 mt-1`}>{k.value ?? k.count}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="glass-card border border-emerald-500/15 p-4 bg-emerald-500/5">
        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Plus size={14} /> Novo Contrato para Validação
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SupplierType }))} className={inp}>
            {['Pessoa Física', 'Pessoa Jurídica', 'Veículo', 'Material', 'Outro'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Nome / Razão Social *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${inp} sm:col-span-2`} />
          <input placeholder="CPF / CNPJ" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} className={inp} />
          <input placeholder="Contato" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inp} />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
            <input type="number" placeholder="Valor contrato" value={form.contractValue || ''}
              onChange={e => setForm(f => ({ ...f, contractValue: Number(e.target.value) }))}
              className={`${inp} pl-8`} />
          </div>
          <select value={form.isMonthly ? 'mensal' : 'unico'} onChange={e => setForm(f => ({...f, isMonthly: e.target.value === 'mensal'}))} className={inp}>
            <option value="unico">Pagamento Único</option>
            <option value="mensal">Pagamento Mensal</option>
          </select>
          <input placeholder="Breve objeto do contrato (ex: Aluguel de van p/ 30 dias)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inp} sm:col-span-2 lg:col-span-2`} />
          <input placeholder="Atividade Prestada" value={form.activity} onChange={e => setForm(f => ({ ...f, activity: e.target.value }))} className={inp} />
          <select value={form.signatureStatus} onChange={e => setForm(f => ({ ...f, signatureStatus: e.target.value as 'pending' | 'signed_gov' | 'signed_physical' }))} className={inp}>
            <option value="pending">Assinatura Pendente</option>
            <option value="signed_gov">Assinado (Gov.br)</option>
            <option value="signed_physical">Assinado (Físico)</option>
          </select>
          
          {/* UPLOAD MULTIPLO VAI AQUI NESSA LINHA */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-6 flex flex-wrap items-center gap-3 p-3 bg-black/20 rounded-lg border border-slate-700">
            <label className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded cursor-pointer transition-colors ${isUploading ? 'bg-slate-700 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
               <input type="file" multiple className="hidden" onChange={handleFileUpload} disabled={isUploading} accept=".pdf,image/*" />
               {isUploading ? 'Enviando Arquivos...' : 'Anexar Documentos (CNH, RG, Contratos)'}
            </label>
            {documentsUrl.map((url, i) => (
               <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded border border-indigo-500/30 transition-colors">
                 <FileText size={12} /> Doc {i + 1}
               </a>
            ))}
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-6 flex justify-end">
            <button onClick={handleAdd} disabled={adding || !form.name.trim() || isUploading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-6 py-2 rounded-lg font-black uppercase text-xs tracking-widest transition-all">
              Submeter ao Jurídico
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card border border-slate-700/30 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 flex-wrap bg-slate-900/40">
          {(['Todos', 'Pessoa Física', 'Pessoa Jurídica', 'Veículo', 'Material'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight border transition-all ${filterType === t ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-500 border-b border-white/5 uppercase tracking-widest font-black text-[9px]">
                <th className="p-4">Tipo</th>
                <th className="p-4">Fornecedor</th>
                <th className="p-4">Categoria / Objeto</th>
                <th className="p-4 text-right">Valor</th>
                <th className="p-4">Anexos</th>
                <th className="p-4 text-center">Status Jurídico</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(s => {
                const Icon = TYPE_ICONS[s.type] ?? Package;
                const status = STATUS_CONFIG[s.legalStatus] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;

                return (
                  <tr key={s.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold w-max uppercase ${TYPE_COLORS[s.type]}`}>
                        <Icon size={10} />{s.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-200">{s.name}</p>
                      {s.cpfCnpj && <p className="font-mono text-[10px] text-slate-500 mt-1">{s.cpfCnpj}</p>}
                    </td>
                    <td className="p-4">
                      <p className="text-slate-300 font-medium">{s.category}</p>
                      <p className="text-[10px] text-slate-500 mt-1 italic">{s.notes}</p>
                    </td>
                    <td className="p-4 text-right">
                       <p className="font-black text-slate-200">{fmt(s.contractValue)}</p>
                       <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{s.isMonthly ? 'Mensal' : 'Único'}</p>
                    </td>
                    <td className="p-4">
                      {s.documentsUrl && s.documentsUrl.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {s.documentsUrl.map((url, i) => (
                             <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-[9px] font-bold text-indigo-300 border border-slate-700 transition">
                               <FileText size={8} /> D{i+1}
                             </a>
                          ))}
                        </div>
                      ) : <span className="text-[9px] text-slate-600 uppercase font-bold">Sem anexos</span>}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${status.color}`}>
                          <StatusIcon size={12} /> {status.label}
                        </span>
                        <div className="flex gap-1">
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(s.id, 'approved'); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded" title="Aprovar"><ShieldCheck size={14}/></button>
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(s.id, 'rejected'); }} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded" title="Rejeitar"><ShieldAlert size={14}/></button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button onClick={() => generateDraft(s)} className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all" title="Gerar Minuta"><FileText size={14} /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="grid grid-cols-1 md:hidden gap-6">
          {filtered.map(s => {
            const Config = STATUS_CONFIG[s.legalStatus || 'pending'];
            const TypeIcon = TYPE_ICONS[s.type as keyof typeof TYPE_ICONS] || User;
            return (
              <div key={s.id} className="glass-card p-6 border border-white/5 relative overflow-hidden flex flex-col gap-4">
                 <div className="flex justify-between items-start">
                   <div>
                     <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border text-[9px] font-bold w-max uppercase mb-2 ${TYPE_COLORS[s.type]}`}>
                        <TypeIcon size={10} />{s.type}
                     </span>
                     <p className="font-bold text-slate-200 text-sm">{s.name}</p>
                     {s.cpfCnpj && <p className="font-mono text-[10px] text-slate-500 mt-1">{s.cpfCnpj}</p>}
                   </div>
                   <div className="text-right">
                     <p className="font-black text-emerald-400 text-sm">{fmt(s.contractValue)}</p>
                     <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{s.isMonthly ? 'Mensal' : 'Único'}</p>
                   </div>
                 </div>
                 
                 <div className="bg-black/30 p-2 rounded-lg text-xs flex justify-between items-center gap-2">
                    <span className="text-slate-400">Categoria: <span className="text-slate-200">{s.category}</span></span>
                 </div>

                 <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${Config.color}`}>
                      <Config.icon size={14} /> {Config.label}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => handleUpdateStatus(s.id, 'approved')} className="p-1.5 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 rounded" title="Aprovar"><ShieldCheck size={14}/></button>
                       <button onClick={() => handleUpdateStatus(s.id, 'rejected')} className="p-1.5 text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 rounded" title="Refugar/Rejeitar"><ShieldAlert size={14}/></button>
                       <button onClick={() => handleDelete(s.id)} className="p-1.5 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded" title="Excluir"><Trash2 size={14}/></button>
                    </div>
                 </div>

                 {s.documentsUrl && s.documentsUrl.length > 0 && (
                   <div className="border-t border-white/5 pt-3 flex flex-wrap gap-1">
                      <p className="w-full text-[9px] font-bold text-slate-500 mb-1 uppercase">Anexos:</p>
                      {s.documentsUrl.map((url, i) => (
                         <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-[9px] font-bold text-indigo-300 border border-slate-700">
                           <FileText size={10} /> D{i+1}
                         </a>
                      ))}
                   </div>
                 )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Compliance Info */}
      <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex gap-4">
        <ShieldCheck className="text-indigo-400 shrink-0" size={24} />
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-tight">Compliance de Contratação</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Conforme normas do TSE, toda despesa deve estar lastreada em contrato válido e nota fiscal. 
            Este módulo trava o pagamento no **Livro Caixa** se o fornecedor não tiver o selo de validação jurídica.
          </p>
        </div>
      </div>
      {/* Draft Modal */}
      {isGeneratingDraft && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-500/5">
              <h4 className="text-lg font-bold flex items-center gap-2"><FileText className="text-indigo-400" /> Minuta de Contrato Sugerida</h4>
              <button onClick={() => setIsGeneratingDraft(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 font-mono text-sm leading-relaxed text-slate-300 whitespace-pre-wrap bg-black/20">
              {draftContent}
            </div>
            <div className="p-4 border-t border-white/5 flex justify-end gap-3 bg-slate-900/50">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(draftContent);
                  alert('Copiado para a área de transferência!');
                }}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                Copiar Texto
              </button>
              <button onClick={() => setIsGeneratingDraft(false)} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
