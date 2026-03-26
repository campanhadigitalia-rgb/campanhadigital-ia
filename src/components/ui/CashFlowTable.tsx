import { useState, useEffect, useCallback } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, addDoc, serverTimestamp, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import type { CashTransaction, FundraisingCampaign } from '../../types';
import { Plus, Download, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2, AlertCircle, FileText, User, Building2, X, Edit2, Link } from 'lucide-react';

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const CATEGORY_LABELS: Record<string, string> = {
  fundoPartidario: 'Fundo Partidário',
  doacaoFisica: 'Doação PF',
  vaquinha: 'Vaquinha',
  eventos: 'Eventos',
  pessoal: 'Equipe / Pessoal',
  grafica: 'Gráfica / Impressos',
  marketing: 'Tráfego / Marketing',
  outros: 'Outros / Diversos'
};

export function CashFlowTable() {
  const { campaignId } = useCampaign();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<{
    id: string;
    name: string;
    type?: string;
    category?: string;
    legalStatus?: string;
    contractValue?: number;
  }[]>([]);
  const [fundCamps, setFundCamps] = useState<FundraisingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState<string>('doacaoFisica');
  const [paidStatus, setPaidStatus] = useState<'provisioned' | 'paid'>('paid');
  const [supplierId, setSupplierId] = useState('');
  const [linkedCampaignId, setLinkedCampaignId] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [editId, setEditId] = useState<string | null>(null);

  const openNewModal = () => {
    setEditId(null);
    setDesc(''); setAmount(''); setType('income'); setCategory('doacaoFisica');
    setPaidStatus('paid'); setSupplierId(''); setLinkedCampaignId(''); setAttachmentUrl('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const openEditModal = (t: CashTransaction) => {
    setEditId(t.id!);
    setDesc(t.description || '');
    setAmount((t.amount || 0).toString());
    setType(t.type || 'income');
    setCategory(t.category || 'outros');
    setPaidStatus(t.paidStatus || 'paid');
    setSupplierId(t.supplierId || '');
    setLinkedCampaignId(t.linkedCampaignId || '');
    setAttachmentUrl(t.attachmentUrl || '');
    setTransactionDate(t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !campaignId) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      
      const base64 = await base64Promise;
      setAttachmentUrl(base64);
    } catch (err: unknown) {
      console.error(err);
      alert('Erro ao converter arquivo para Base64.');
    } finally {
      setIsUploading(false);
    }
  };

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterSupplier, setFilterSupplier] = useState<string>('all');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  const [fundraising, setFundraising] = useState<CashTransaction[]>([]);

  const fetchSuppliers = useCallback(() => {
    if (!campaignId) return;
    const p = `campaigns/${campaignId}/people`;
    return onSnapshot(collection(db, p), snap => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, name: d.data().name, ...d.data() })));
    });
  }, [campaignId]);

  const fetchFundCamps = useCallback(() => {
    if (!campaignId) return;
    const p = `campaigns/${campaignId}/fundraisingCampaigns`;
    return onSnapshot(collection(db, p), snap => {
      setFundCamps(snap.docs.map(d => ({ id: d.id, ...d.data() } as FundraisingCampaign)));
    });
  }, [campaignId]);

  useEffect(() => {
    if (!campaignId) return;

    // 1. Transações Manuais
    const q = query(collection(db, 'finance_transactions'), where('campaign_id', '==', campaignId));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CashTransaction));
      setTransactions(data);
      setLoading(false);
    });

    // 2. Transações de Vaquinha/Evento (Mapeadas para o Fluxo)
    const qFund = query(collection(db, `campaigns/${campaignId}/fundraisingCampaigns`));
    const unsubFund = onSnapshot(qFund, (snap) => {
      const data = snap.docs.map(d => {
        const doc = d.data();
        return {
          id: d.id,
          description: doc.title,
          amount: Number(doc.raised) || 0,
          type: 'income',
          category: doc.type === 'vaquinha' ? 'vaquinha' : 'eventos',
          date: doc.createdAt?.seconds ? new Date(doc.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
          status: 'completed',
          paidStatus: 'paid',
          isAuto: true,
          campaign_id: campaignId,
          createdAt: doc.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: 'system'
        } as unknown as CashTransaction;
      });
      setFundraising(data);
    });

    const unsubSuppliers = fetchSuppliers();
    const unsubCamps = fetchFundCamps();
    return () => { unsub(); unsubFund(); unsubSuppliers?.(); unsubCamps?.(); };
  }, [campaignId, fetchSuppliers, fetchFundCamps]);

  // Combine and sort
  const allTransactions = [...transactions, ...fundraising].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !profile) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return alert('Valor inválido');

    // Validação Jurídica Check for expenses
    if (type === 'expense' && supplierId) {
       const supplier = suppliers.find(s => s.id === supplierId);
       if (supplier && supplier.legalStatus !== 'approved') {
          if (!confirm('Este fornecedor AINDA NÃO foi aprovado pelo Jurídico. Deseja provisionar este gasto mesmo assim?')) return;
       }
    }

    if (editId) {
      try {
        const docData = {
          updatedAt: serverTimestamp(),
          description: desc,
          amount: value,
          type, 
          category, 
          paidStatus,
          supplierId: type === 'expense' ? supplierId : '',
          attachmentUrl,
          linkedCampaignId: (type === 'income' && linkedCampaignId) ? linkedCampaignId : '',
          date: new Date(transactionDate).toISOString()
        };
        await updateDoc(doc(db, 'finance_transactions', editId), docData);
        setEditId(null); setIsModalOpen(false);
      } catch (e) {
        console.error(e);
        alert('Erro ao editar transação.');
      }
      return;
    }

    try {
      let feeTransaction = null;
      let linkedCamp = null;

      if (type === 'income' && linkedCampaignId) {
        linkedCamp = fundCamps.find(c => c.id === linkedCampaignId);
        if (linkedCamp && linkedCamp.feePercentage && linkedCamp.feePercentage > 0) {
           const feeVal = value * (linkedCamp.feePercentage / 100);
           feeTransaction = {
             campaign_id: campaignId,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp(),
             createdBy: profile.uid,
             description: `Taxa da Plataforma (${linkedCamp.feePercentage}%) - ${desc}`,
             amount: feeVal,
             type: 'expense',
             category: 'outros',
             status: 'completed',
             paidStatus: 'paid',
             supplierId: '',
             attachmentUrl: '',
             linkedCampaignId: linkedCamp.id,
             date: new Date().toISOString()
           };
        }
      }

      const docData = {
        campaign_id: campaignId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.uid,
        description: desc,
        amount: value,
        type, 
        category, 
        status: 'completed',
        paidStatus,
        supplierId: type === 'expense' ? supplierId : '',
        attachmentUrl,
        linkedCampaignId: (type === 'income' && linkedCampaignId) ? linkedCampaignId : '',
        date: new Date(transactionDate).toISOString()
      };
      
      await addDoc(collection(db, 'finance_transactions'), docData);
      
      if (feeTransaction) {
         await addDoc(collection(db, 'finance_transactions'), feeTransaction);
      }
      
      if (linkedCamp) {
         const p = `campaigns/${campaignId}/fundraisingCampaigns`;
         await updateDoc(doc(db, p, linkedCamp.id), { raised: (linkedCamp.raised || 0) + value });
      }

      setDesc(''); setAmount(''); setSupplierId(''); setAttachmentUrl(''); setLinkedCampaignId(''); setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar transação.');
    }
  };

  const handleTogglePaid = async (t: CashTransaction) => {
    if (!t.id) return;
    const newStatus = t.paidStatus === 'paid' ? 'provisioned' : 'paid';
    await updateDoc(doc(db, 'finance_transactions', t.id), { paidStatus: newStatus });
  };

  const filteredTransactions = allTransactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesSupplier = filterSupplier === 'all' || t.supplierId === filterSupplier;
    
    let matchesDate = true;
    if (dateStart) matchesDate = matchesDate && new Date(t.date) >= new Date(dateStart);
    if (dateEnd) matchesDate = matchesDate && new Date(t.date) <= new Date(dateEnd);

    return matchesSearch && matchesType && matchesCategory && matchesSupplier && matchesDate;
  });

  const cIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const cExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = cIncome - cExpense;

  const totalIncome = allTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex flex-col justify-between border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-emerald-400">
            <ArrowUpRight size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Total Entradas</span>
          </div>
          <span className="text-2xl font-black text-white mt-1">{formatCurrency(cIncome)}</span>
        </div>
        <div className="glass-card p-4 flex flex-col justify-between border border-rose-500/20 bg-rose-500/5">
          <div className="flex items-center gap-2 text-rose-400">
            <ArrowDownRight size={18} /> <span className="text-[10px] font-black uppercase tracking-widest">Total Saídas</span>
          </div>
          <span className="text-2xl font-black text-white mt-1">{formatCurrency(cExpense)}</span>
        </div>
        <div className="glass-card p-4 flex flex-col justify-between border border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center gap-2 text-indigo-400">
            <span className="text-[10px] font-black uppercase tracking-widest">Saldo em Conta</span>
          </div>
          <span className={`text-2xl font-black mt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>

      <div className="glass-card flex-1 border border-white/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><FileText size={20}/></div>
             <div>
               <h3 className="text-sm font-bold text-slate-200">Livro Caixa SPCE (Realimentado)</h3>
               <p className="text-[10px] text-slate-500 font-medium">Total Global: <span className="text-emerald-400">{formatCurrency(totalIncome)}</span> / <span className="text-rose-400">{formatCurrency(totalExpense)}</span></p>
             </div>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Download size={14} /> Exportar
            </button>
            <button onClick={openNewModal} className="flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
              <Plus size={16} /> Novo
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="p-3 bg-black/40 border-b border-white/5 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
             <input 
               type="text" 
               placeholder="Buscar descrição ou categoria..." 
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
               className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50"
             />
          </div>
          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value as any)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 [&>option]:bg-slate-900"
          >
            <option value="all">Tipos: Todos</option>
            <option value="income">Entradas</option>
            <option value="expense">Saídas</option>
          </select>
          <select 
            value={filterCategory} 
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 [&>option]:bg-slate-900"
          >
            <option value="all">Categorias: Todas</option>
            {Object.entries(CATEGORY_LABELS).map(([k,v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select 
            value={filterSupplier} 
            onChange={e => setFilterSupplier(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500/50 [&>option]:bg-slate-900 max-w-[150px]"
          >
            <option value="all">Fornecedores: Todos</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase">De:</span>
            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-500/50" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Até:</span>
            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-500/50" />
          </div>
          {(searchTerm || filterType !== 'all' || filterCategory !== 'all' || filterSupplier !== 'all' || dateStart || dateEnd) && (
            <button 
              onClick={() => { setSearchTerm(''); setFilterType('all'); setFilterCategory('all'); setFilterSupplier('all'); setDateStart(''); setDateEnd(''); }} 
              className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors"
              title="Limpar Filtros"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="p-4 text-[9px] font-black tracking-widest text-slate-500 uppercase">Data</th>
                <th className="p-4 text-[9px] font-black tracking-widest text-slate-500 uppercase">Origem / Fornecedor</th>
                <th className="p-4 text-[9px] font-black tracking-widest text-slate-500 uppercase">Categoria</th>
                <th className="p-4 text-[9px] font-black tracking-widest text-slate-500 uppercase text-right">Valor</th>
                <th className="p-4 text-[9px] font-black tracking-widest text-slate-500 uppercase text-center">Jurídico</th>
                <th className="p-4 text-[9px] font-black tracking-widest text-slate-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Processando registros...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Nenhuma movimentação encontrada com os filtros atuais.</td></tr>
              ) : filteredTransactions.map(t => {
                const supplier = t.supplierId ? suppliers.find(s => s.id === t.supplierId) : null;
                const isApproved = supplier ? supplier.legalStatus === 'approved' : t.type === 'income';

                return (
                  <tr key={t.id} className="hover:bg-white/2 transition-colors">
                    <td className="p-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {t.type === 'income' ? <User size={12} className="text-emerald-500/50" /> : <Building2 size={12} className="text-indigo-500/50" />}
                        <div>
                          <p className="text-xs font-bold text-slate-200">{t.description}</p>
                          {supplier && <p className="text-[9px] text-slate-500 font-medium">Contrato: {supplier.name}</p>}
                        </div>
                      </div>
                      {t.attachmentUrl && (
                        <a href={t.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1 ml-6 text-[9px] text-indigo-400 hover:text-indigo-300 w-max bg-indigo-500/10 px-1.5 rounded border border-indigo-500/20">
                          <Link size={8}/> Documento Anexo
                        </a>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 text-[9px] uppercase font-black text-slate-400 bg-slate-800 border border-white/5 rounded">
                        {CATEGORY_LABELS[t.category] || t.category}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <span className={`text-xs font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {isApproved ? (
                        <CheckCircle2 size={16} className="text-emerald-500 mx-auto" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-500 mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleTogglePaid(t)}
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase transition-all ${t.paidStatus === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}
                          title="Status de Pagamento"
                        >
                          {t.paidStatus === 'paid' ? <CheckCircle2 size={10}/> : <Clock size={10}/>}
                          {t.paidStatus === 'paid' ? 'Pago' : 'Pendente'}
                        </button>
                        <button onClick={() => openEditModal(t)} className="p-1 px-1.5 flex items-center gap-1 bg-white/5 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded transition-colors text-[9px] uppercase font-bold" title="Editar Trasanção">
                          <Edit2 size={10} /> Editar
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

      {/* Modal de Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Novo Lançamento SPCE</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1"><X size={20} className="rotate-45" /></button>
            </div>
            
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-5">
              <div className="flex bg-black/40 p-1 rounded-xl">
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'income' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Receita / Entrada</button>
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${type === 'expense' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Despesa / Saída</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valor (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 font-bold text-xs uppercase">R$</span>
                    <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg pl-9 p-2.5 text-white font-bold outline-none focus:border-indigo-500/50" placeholder="0.00" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data Efetiva</label>
                  <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-indigo-500/50" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Descrição do Lançamento</label>
                <input required value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-indigo-500/50" placeholder="Ex: Doação Eleitor José, Impressão Santinhos..." />
              </div>

              {fundCamps.length > 0 && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase ml-1">Vincular a uma Vaquinha / Evento</label>
                  <select value={linkedCampaignId} onChange={e => setLinkedCampaignId(e.target.value)} className="w-full bg-black/50 border border-emerald-500/30 rounded-lg p-3 text-white text-xs outline-none focus:border-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)] [&>option]:bg-slate-900">
                    <option value="">Nenhum vínculo (Entrada Avulsa)...</option>
                    {fundCamps.map(c => (
                      <option key={c.id} value={c.id}>
                         {c.type === 'evento' ? '🎪' : '🫶'} {c.title} {c.feePercentage ? `(Taxa: ${c.feePercentage}%)` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Categoria de Entrada/Saída</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-indigo-500/50 [&>option]:bg-slate-900">
                    {type === 'income' ? (
                      <optgroup label="Entradas (Receitas)">
                        <option value="fundoPartidario">Fundo Partidário (FEFC)</option>
                        <option value="doacaoFisica">Doação Pessoa Física</option>
                        <option value="vaquinha">Crowdfunding / Vaquinha</option>
                        <option value="eventos">Eventos Arrecadação</option>
                      </optgroup>
                    ) : (
                      <optgroup label="Saídas (Despesas)">
                        <option value="pessoal">Equipe / Cabos Eleitorais</option>
                        <option value="grafica">Materiais Gráficos</option>
                        <option value="marketing">Impulsionamento / Digital</option>
                      </optgroup>
                    )}
                    <option value="outros">Outros / Diversos</option>
                  </select>
                 </div>
                 <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Status de Pagamento</label>
                  <select value={paidStatus} onChange={e => setPaidStatus(e.target.value as any)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-2.5 text-white text-xs outline-none focus:border-indigo-500/50 [&>option]:bg-slate-900">
                    <option value="paid">Efetivado (Pago)</option>
                    <option value="provisioned">Provisionado (A Pagar)</option>
                  </select>
                 </div>
              </div>

              {type === 'expense' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-bold text-indigo-400 uppercase ml-1">Vincular Fornecedor / Contrato</label>
                  <select required={type === 'expense'} value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full bg-black/50 border border-indigo-500/30 rounded-lg p-3 text-white text-xs outline-none focus:border-indigo-500 shadow-[inset_0_0_10px_rgba(79,70,229,0.1)] [&>option]:bg-slate-900">
                    <option value="">Selecione um fornecedor validado...</option>
                    {suppliers.filter((s: {id: string, name: string, type?: string}) => s.type !== 'Doador').map(s => (
                      <option key={s.id} value={s.id}>
                        {s.legalStatus === 'approved' ? '✅' : '⚠️'} {s.name} - {s.category} ({fmt(s.contractValue || 0)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-slate-500 italic mt-1">
                    ⚠️ Somente fornecedores com o selo ✅ estão 100% regulares no Jurídico.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Anexar Comprovante / Recibo</label>
                <div className="flex gap-2 items-center">
                  <label className={`flex-1 flex items-center justify-center gap-2 border border-dashed rounded-lg p-3 text-xs font-bold cursor-pointer transition-all ${
                    attachmentUrl ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-black/40 text-slate-400 hover:bg-slate-800'
                  }`}>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" disabled={isUploading} />
                    {isUploading ? 'Enviando...' : attachmentUrl ? 'Comprovante Anexado (Trocar)' : 'Selecionar Arquivo PDF/Imagem'}
                  </label>
                  {attachmentUrl && (
                     <button type="button" onClick={() => window.open(attachmentUrl, '_blank')} className="p-3 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors" title="Ver Arquivo Anexo">
                       <Link size={16} />
                     </button>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-between gap-3">
                <p className="text-[9px] text-slate-500 flex items-center gap-1"><AlertCircle size={12}/> Dados auditáveis pelo SPCE</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-xs font-black uppercase text-slate-400 hover:text-white transition-colors">Abortar</button>
                  <button type="submit" className="px-6 py-2.5 rounded-lg text-xs font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all">
                    {editId ? 'Atualizar Fluxo' : 'Consolidar Fluxo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
