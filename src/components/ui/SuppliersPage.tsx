import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { Plus, Trash2, Building2, User, Car, Package, ShieldCheck, ShieldAlert, ShieldQuestion, Clock } from 'lucide-react';

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
  notes: string;
  legalStatus: LegalStatus;
  legalNotes?: string;
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

const STATUS_CONFIG: Record<LegalStatus, { label: string, color: string, icon: any }> = {
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
  const { activeCampaign } = useCampaign();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [adding, setAdding] = useState(false);
  const [filterType, setFilterType] = useState<SupplierType | 'Todos'>('Todos');
  const [form, setForm] = useState<Omit<Supplier, 'id'>>({
    type: 'Pessoa Jurídica', name: '', cpfCnpj: '', contact: '',
    category: 'Locação de Veículo', contractValue: 0, notes: '',
    legalStatus: 'pending'
  });

  const path = useCallback(() =>
    activeCampaign ? `campaigns/${activeCampaign.id}/suppliers` : null,
    [activeCampaign]);

  useEffect(() => {
    const p = path();
    if (!p) { setSuppliers([]); return; }
    return onSnapshot(collection(db, p), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setSuppliers(data);
    });
  }, [path]);

  const handleAdd = async () => {
    const p = path();
    if (!p || !form.name.trim()) return;
    setAdding(true);
    try { 
      await addDoc(collection(db, p), { 
        ...form, 
        legalStatus: 'pending', // Sempre inicia como pendente conforme pedido do usuário
        createdAt: serverTimestamp() 
      }); 
    }
    finally { setAdding(false); }
    setForm({ type: 'Pessoa Jurídica', name: '', cpfCnpj: '', contact: '', category: 'Locação de Veículo', contractValue: 0, notes: '', legalStatus: 'pending' });
  };

  const handleUpdateStatus = async (id: string, status: LegalStatus) => {
    const p = path();
    if (!p) return;
    await updateDoc(doc(db, p, id), { legalStatus: status });
  };

  const handleDelete = async (id: string) => {
    const p = path();
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
          <h2 className="text-xl font-bold text-slate-100 m-0">Governança: Fornecedores & Contratos</h2>
          <p className="text-sm text-slate-400 m-0 mt-0.5">
            Cadastre contratos para validação jurídica. Somente contratos **Aprovados** permitem saída no Livro Caixa.
          </p>
        </div>
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
          <input placeholder="Breve objeto do contrato (ex: Aluguel de van p/ 30 dias)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inp} sm:col-span-2 lg:col-span-3`} />
          <button onClick={handleAdd} disabled={adding || !form.name.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all">
            Submeter ao Jurídico
          </button>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-500 border-b border-white/5 uppercase tracking-widest font-black text-[9px]">
                <th className="p-4">Tipo</th>
                <th className="p-4">Fornecedor</th>
                <th className="p-4">Categoria / Objeto</th>
                <th className="p-4 text-right">Valor</th>
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
                    <td className="p-4 text-right font-black text-slate-200">{fmt(s.contractValue)}</td>
                    <td className="p-4">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase ${status.color}`}>
                          <StatusIcon size={12} /> {status.label}
                        </span>
                        {/* Actions for testing/demo - In real app this would be in Legal tab only */}
                        <div className="flex gap-1">
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(s.id, 'approved'); }} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded" title="Aprovar"><ShieldCheck size={14}/></button>
                           <button onClick={(e) => { e.stopPropagation(); handleUpdateStatus(s.id, 'rejected'); }} className="p-1 text-rose-500 hover:bg-rose-500/10 rounded" title="Rejeitar"><ShieldAlert size={14}/></button>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleDelete(s.id)}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-lg"><Trash2 size={14} /></button>
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
          <p className="text-xs font-bold text-slate-300 uppercase tracking-tight">Compliance de Contratação</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Conforme normas do TSE, toda despesa deve estar lastreada em contrato válido e nota fiscal. 
            Este módulo trava o pagamento no **Livro Caixa** se o fornecedor não tiver o selo de validação jurídica.
          </p>
        </div>
      </div>
    </div>
  );
}
