import { useState, useEffect, useCallback } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import type { CashTransaction } from '../../types';
import { Plus, Download, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2 } from 'lucide-react';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function CashFlowTable() {
  const { campaignId } = useCampaign();
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income'|'expense'>('income');
  const [category, setCategory] = useState<CashTransaction['category']>('doacao');

  const fetchTransactions = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'finance_transactions'),
        where('campaign_id', '==', campaignId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashTransaction));
      data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !profile) return;
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return alert('Valor inválido');

    try {
      const docData = {
        campaign_id: campaignId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.uid,
        description: desc,
        amount: value,
        type, category, status: 'completed',
        date: new Date().toISOString()
      };
      await addDoc(collection(db, 'finance_transactions'), docData);
      setDesc(''); setAmount(''); setIsModalOpen(false);
      fetchTransactions();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar transação.');
    }
  };

  const cIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const cExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = cIncome - cExpense;

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 flex flex-col justify-between border border-emerald-500/20">
          <div className="flex items-center gap-2 text-emerald-400">
            <ArrowUpRight size={18} /> <span className="text-sm font-bold uppercase">Entradas</span>
          </div>
          <span className="text-2xl font-black text-white mt-2">{formatCurrency(cIncome)}</span>
        </div>
        <div className="glass-card p-4 flex flex-col justify-between border border-rose-500/20">
          <div className="flex items-center gap-2 text-rose-400">
            <ArrowDownRight size={18} /> <span className="text-sm font-bold uppercase">Saídas (Despesas)</span>
          </div>
          <span className="text-2xl font-black text-white mt-2">{formatCurrency(cExpense)}</span>
        </div>
        <div className="glass-card p-4 flex flex-col justify-between border border-indigo-500/20">
          <div className="flex items-center gap-2 text-indigo-400">
            <span className="text-sm font-bold uppercase">Saldo em Conta</span>
          </div>
          <span className={`text-2xl font-black mt-2 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(balance)}
          </span>
        </div>
      </div>

      <div className="glass-card flex-1 border border-white/10 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-slate-900">
          <h3 className="text-lg font-bold text-slate-200">Livro Caixa SPCE</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold bg-white/5 hover:bg-white/10 text-white transition-colors">
              <Download size={16} /> Exportar
            </button>
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-colors">
              <Plus size={16} /> Novo Lançamento
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase">Data</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase">Descrição/Origem</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase">Categoria</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase text-right">Valor</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando transações...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhum lançamento no Livro Caixa.</td></tr>
              ) : transactions.map(t => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm text-slate-400 whitespace-nowrap">
                    {new Date(t.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-200">{t.description}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-[10px] uppercase font-bold text-slate-300 bg-slate-800 rounded">
                      {t.category}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap">
                    <span className={`text-sm font-black ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {t.status === 'completed' 
                      ? <CheckCircle2 size={16} className="text-emerald-500 mx-auto" /> 
                      : <Clock size={16} className="text-amber-500 mx-auto" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Novo Lançamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              <div className="flex gap-4">
                <label className="flex-1 flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={type === 'income'} onChange={() => setType('income')} name="type" className="accent-emerald-500" />
                  <span className="text-sm font-bold text-emerald-400">Entrada (Receita)</span>
                </label>
                <label className="flex-1 flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={type === 'expense'} onChange={() => setType('expense')} name="type" className="accent-rose-500" />
                  <span className="text-sm font-bold text-rose-400">Saída (Despesa)</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descrição do Recibo/NF</label>
                <input required value={desc} onChange={e => setDesc(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50" placeholder="Ex: Doação Eleitor X, Gráfica Y" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Valor (R$)</label>
                  <input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50" placeholder="0.00" />
                 </div>
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Categoria</label>
                  <select value={category} onChange={e => setCategory(e.target.value as CashTransaction['category'])} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm [&>option]:bg-slate-900">
                    <option value="fundo">FP / FEFC</option>
                    <option value="doacao">Doação PF</option>
                    <option value="evento">Evento Arrecadação</option>
                    <option value="pessoal">Equipe Pessoal</option>
                    <option value="grafica">Gráfica / Impressos</option>
                    <option value="impulsionamento">Tráfego / Meta Ads</option>
                    <option value="outros">Despesas Diversas</option>
                  </select>
                 </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-colors">Salvar Registro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
