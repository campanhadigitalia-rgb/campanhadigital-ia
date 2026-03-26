import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { ShieldCheck, ShieldAlert, FileText, CheckCircle2, Clock } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Supplier {
  id: string;
  name: string;
  type: string;
  category: string;
  contractValue: number;
  documentsUrl?: string[];
  isMonthly?: boolean;
  cpfCnpj?: string;
  notes?: string;
  legalStatus: 'pending' | 'approved' | 'rejected';
}

export function LegalApprovals() {
  const { activeCampaign } = useCampaign();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    
    if (!activeCampaign) {
      // Return early without doing setState inside effect if we rely on loading state
      return;
    }

    const q = query(
      collection(db, `campaigns/${activeCampaign.id}/people`),
      where('legalStatus', '==', 'pending')
    );

    const unsubscribeQuery = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
      setSuppliers(data);
      setLoading(false);
    });

    unsubscribe = unsubscribeQuery;
    return () => unsubscribe();
  }, [activeCampaign]);

  const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
    if (!activeCampaign) return;
    try {
      await updateDoc(doc(db, `campaigns/${activeCampaign.id}/people`, id), {
        legalStatus: newStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse">
        <Clock size={24} className="mx-auto mb-2 opacity-50" />
        Carregando contratos pendentes...
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="glass-card border border-emerald-500/20 p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
          <CheckCircle2 size={32} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-200">Nenhum contrato pendente</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md">
            Todos os prestadores de serviço, equipes e contratos do módulo de Pessoas já foram avaliados pelo Jurídico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border border-amber-500/20">
      <div className="p-4 border-b border-amber-500/15 bg-amber-950/20">
        <h3 className="font-bold text-amber-300 flex items-center gap-2 m-0 text-sm">
          <Clock size={16} className="text-amber-400" /> Contratos Aguardando Avaliação ({suppliers.length})
        </h3>
        <p className="text-xs text-amber-200/40 mt-1 m-0">
          Esta lista reflete os cadastros feitos no módulo de "Pessoas". Eles estão pendentes de validação para compor o SPCE Oficial.
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {suppliers.map(s => (
          <div key={s.id} className="p-4 bg-slate-900/40 hover:bg-slate-800/60 transition-colors flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 tracking-wider">
                  {s.type}
                </span>
                <span className="text-[10px] text-slate-500 uppercase">{s.category}</span>
              </div>
              <p className="font-bold text-slate-200 text-base">{s.name}</p>
              {s.cpfCnpj && <p className="font-mono text-xs text-slate-400 mt-0.5">{s.cpfCnpj}</p>}
              
              {/* Anexos */}
              {s.documentsUrl && s.documentsUrl.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {s.documentsUrl.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" 
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded border border-indigo-500/20 transition-colors">
                      <FileText size={12} /> Doc {i+1}
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col md:items-end gap-3 w-full md:w-auto">
              <div className="text-left md:text-right">
                <p className="font-black text-slate-200 text-lg">{fmt(s.contractValue)}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{s.isMonthly ? 'Recorrência Mensal' : 'Pagamento Único'}</p>
              </div>

              <div className="flex items-center gap-2 mx-auto md:mx-0">
                <button onClick={() => handleUpdateStatus(s.id, 'rejected')} 
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all">
                  <ShieldAlert size={14} /> Indeferir
                </button>
                <button onClick={() => handleUpdateStatus(s.id, 'approved')}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                  <ShieldCheck size={14} /> Deferir Contrato
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
