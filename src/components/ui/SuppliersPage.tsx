import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { Plus, Trash2, Building2, User, Car, Package, Info } from 'lucide-react';

type SupplierType = 'Pessoa Física' | 'Pessoa Jurídica' | 'Veículo' | 'Material' | 'Outro';

interface Supplier {
  id: string;
  type: SupplierType;
  name: string;
  cpfCnpj: string;
  contact: string;
  category: string; // ex: Locação Veículo, Impressão, Assessoria, etc.
  contractValue: number;
  notes: string;
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
    category: 'Locação de Veículo', contractValue: 0, notes: ''
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
    try { await addDoc(collection(db, p), { ...form, createdAt: serverTimestamp() }); }
    finally { setAdding(false); }
    setForm({ type: 'Pessoa Jurídica', name: '', cpfCnpj: '', contact: '', category: 'Locação de Veículo', contractValue: 0, notes: '' });
  };

  const handleDelete = async (id: string) => {
    const p = path();
    if (!p) return;
    await deleteDoc(doc(db, p, id));
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
          <h2 className="text-xl font-bold text-slate-100 m-0">Fornecedores & Contratos</h2>
          <p className="text-sm text-slate-400 m-0 mt-0.5">
            Pré-cadastre pessoas, CNPJs, veículos e materiais. No lançamento do Livro Caixa, selecione o fornecedor.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', count: suppliers.length, color: 'slate' },
          { label: 'Pessoas Físicas', count: suppliers.filter(s => s.type === 'Pessoa Física').length, color: 'blue' },
          { label: 'PJ / CNPJs', count: suppliers.filter(s => s.type === 'Pessoa Jurídica').length, color: 'indigo' },
          { label: 'Valor Contratado', count: null, value: fmt(totalContracted), color: 'emerald' },
        ].map(k => (
          <div key={k.label} className={`glass-card p-4 border border-${k.color}-500/15`}>
            <p className={`text-[10px] font-black uppercase tracking-widest text-${k.color}-400/70`}>{k.label}</p>
            <p className={`text-2xl font-black text-${k.color}-400 mt-1`}>{k.value ?? k.count}</p>
          </div>
        ))}
      </div>

      {/* Add form */}
      <div className="glass-card border border-emerald-500/15 p-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Adicionar Fornecedor / Contrato</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as SupplierType }))} className={inp}>
            {['Pessoa Física', 'Pessoa Jurídica', 'Veículo', 'Material', 'Outro'].map(t => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Nome *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${inp} sm:col-span-2`} />
          <input placeholder="CPF / CNPJ" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))} className={inp} />
          <input placeholder="Contato (tel/email)" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} className={inp} />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={inp}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">R$</span>
            <input type="number" placeholder="Valor contrato" value={form.contractValue || ''}
              onChange={e => setForm(f => ({ ...f, contractValue: Number(e.target.value) }))}
              className={`${inp} pl-8`} />
          </div>
          <input placeholder="Observações" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inp} sm:col-span-2`} />
          <button onClick={handleAdd} disabled={adding || !form.name.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-4 rounded-lg font-bold flex items-center justify-center gap-1 text-xs transition-colors">
            <Plus size={14} /> Adicionar
          </button>
        </div>
      </div>

      {/* Filter + Table */}
      <div className="glass-card border border-slate-700/30 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center gap-2 flex-wrap">
          {(['Todos', 'Pessoa Física', 'Pessoa Jurídica', 'Veículo', 'Material'] as const).map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${filterType === t ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-slate-300'}`}>
              {t}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-slate-500">{filtered.length} fornecedor(es)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-2">
            <Building2 size={24} className="text-slate-700" />
            <p className="text-slate-500 font-bold text-sm">Nenhum fornecedor cadastrado</p>
            <p className="text-slate-600 text-xs">Use o formulário acima. Depois que salvo, aparece no seletor do Livro Caixa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/50 text-slate-400 border-b border-white/5 uppercase tracking-wider">
                  <th className="p-3 font-semibold">Tipo</th>
                  <th className="p-3 font-semibold">Nome / CPF-CNPJ</th>
                  <th className="p-3 font-semibold">Categoria</th>
                  <th className="p-3 font-semibold text-right">Valor</th>
                  <th className="p-3 font-semibold">Contato</th>
                  <th className="p-3 font-semibold">Obs</th>
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const Icon = TYPE_ICONS[s.type] ?? Package;
                  return (
                    <tr key={s.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                      <td className="p-3">
                        <span className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold w-max ${TYPE_COLORS[s.type]}`}>
                          <Icon size={10} />{s.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-slate-200">{s.name}</p>
                        {s.cpfCnpj && <p className="font-mono text-[10px] text-slate-500 mt-0.5">{s.cpfCnpj}</p>}
                      </td>
                      <td className="p-3 text-slate-400">{s.category}</td>
                      <td className="p-3 text-right font-bold text-emerald-400">{s.contractValue > 0 ? fmt(s.contractValue) : '—'}</td>
                      <td className="p-3 text-slate-400">{s.contact || '—'}</td>
                      <td className="p-3 text-slate-500 max-w-[180px] truncate">{s.notes || '—'}</td>
                      <td className="p-3">
                        <button onClick={() => handleDelete(s.id)}
                          className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded"><Trash2 size={13} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/50 border border-slate-700/30 text-xs text-slate-500">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <span>
          Todos os contratos pré-cadastrados aqui aparecem como opção de seleção ao lançar despesas no Livro Caixa (SPCE).
          Isso garante rastreabilidade de fornecedor por lançamento e facilita a prestação de contas ao TSE.
        </span>
      </div>
    </div>
  );
}
