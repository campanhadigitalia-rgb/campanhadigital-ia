import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { 
  CheckCircle2, XCircle, FileText, 
  Building2, User, ShieldCheck
} from 'lucide-react';

type LegalStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
type SupplierType = 'Pessoa Jurídica' | 'Pessoa Física' | 'Veículo';

interface Supplier {
  id: string;
  type: SupplierType;
  name: string;
  cpfCnpj: string;
  category: string;
  contractValue: number;
  legalStatus: LegalStatus;
  notes?: string;
  createdAt?: { seconds: number };
}

export function LegalSuppliers() {
  const { campaignId } = useCampaign();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<LegalStatus | 'all'>('pending');

  const getPath = useCallback(() =>
    campaignId ? `campaigns/${campaignId}/suppliers` : null,
    [campaignId]);

  useEffect(() => {
    const p = getPath();
    if (!p) { setSuppliers([]); setLoading(false); return; }
    
    setLoading(true);
    const unsub = onSnapshot(collection(db, p), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
      data.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setSuppliers(data);
      setLoading(false);
    });
    return () => unsub();
  }, [getPath]);

  const handleUpdateStatus = async (id: string, status: LegalStatus) => {
    const p = getPath();
    if (!p) return;
    try {
      await updateDoc(doc(db, p, id), { legalStatus: status });
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const filtered = suppliers.filter(s => filterStatus === 'all' || s.legalStatus === filterStatus);

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex items-center gap-4 bg-indigo-500/5 p-4 rounded-xl border border-indigo-500/10 mb-2">
        <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.2)]">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-100 m-0 uppercase tracking-tight">Compliance de Contratos</h2>
          <p className="text-sm text-slate-400 m-0">Auditória jurídica de gastos de campanha.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 border-b border-white/5 pb-4">
        {['all', 'pending', 'approved', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilterStatus(f as any)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight transition-all border ${
              filterStatus === f ? 'bg-indigo-500 text-white' : 'bg-transparent border-white/5 text-slate-600'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovados' : 'Rejeitados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map(s => (
            <div key={s.id} className="glass-card p-4 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
                  {s.type==='Pessoa Jurídica'?<Building2 size={20}/>:<User size={20}/>}
                </div>
                <div>
                   <h3 className="font-bold text-slate-100 text-sm m-0">{s.name}</h3>
                   <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                     <span className="flex items-center gap-1.5"><FileText size={12}/> {s.category}</span>
                     <span className="font-black text-slate-400">{formatCurrency(s.contractValue)}</span>
                   </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <button onClick={() => handleUpdateStatus(s.id, 'approved')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.legalStatus === 'approved' ? 'bg-emerald-500 text-white' : 'text-emerald-500'}`}><CheckCircle2 size={12}/> {s.legalStatus==='approved'?'OK':''}</button>
                 <button onClick={() => handleUpdateStatus(s.id, 'rejected')} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.legalStatus === 'rejected' ? 'bg-rose-500 text-white' : 'text-rose-500'}`}><XCircle size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
