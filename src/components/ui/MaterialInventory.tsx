import { useState, useEffect, useCallback } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { MaterialItem } from '../../types';
import { Plus, Package } from 'lucide-react';

// fallback local formatter
const formatC = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function MaterialInventory() {
  const { campaignId } = useCampaign();
  const { profile } = useAuth();
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<MaterialItem['type']>('santinho');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('');

  const fetchInventory = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'admin_inventory'), where('campaign_id', '==', campaignId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaterialItem));
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !profile) return;
    try {
      await addDoc(collection(db, 'admin_inventory'), {
        campaign_id: campaignId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.uid,
        name,
        type,
        quantity_in_stock: Number(qty) || 0,
        unit_cost: Number(cost) || 0,
      });
      setName(''); setQty(''); setCost(''); setIsModalOpen(false);
      fetchInventory();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar material.');
    }
  };

  const updateQuantity = async (id: string, current: number, diff: number) => {
    const nextQ = Math.max(0, current + diff);
    try {
      await updateDoc(doc(db, 'admin_inventory', id), { quantity_in_stock: nextQ, updatedAt: serverTimestamp() });
      fetchInventory();
    } catch (e) {
      console.error(e);
    }
  };

  const totalValue = items.reduce((acc, item) => acc + (item.quantity_in_stock * item.unit_cost), 0);

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2"><Package size={24} /> Controle de Estoque Físico</h3>
          <p className="text-sm text-slate-400 mt-1">Milheiros de santinhos, faturamento e baixas de logística.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Valor em Estoque</p>
            <p className="font-black text-white">{formatC(totalValue)}</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-colors">
            <Plus size={16} /> Receber Material
          </button>
        </div>
      </div>

      <div className="glass-card flex-1 border border-white/10 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/40 border-b border-white/5">
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase">Item/Descrição</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase">Tipo</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase text-right">Qtd Estoque</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase text-right">Custo Un</th>
                <th className="p-4 text-xs font-black tracking-widest text-slate-500 uppercase text-center">Ações (Baixa)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando estoque...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Almoxarifado vazio. Nenhum material cadastrado.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <p className="text-sm font-bold text-slate-200">{item.name}</p>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 text-[10px] uppercase font-bold text-slate-300 bg-slate-800 rounded">
                      {item.type}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <span className={`text-lg font-black ${item.quantity_in_stock > 0 ? 'text-amber-400' : 'text-rose-500'}`}>
                      {item.quantity_in_stock.toLocaleString('pt-BR')}
                    </span>
                  </td>
                  <td className="p-4 text-right whitespace-nowrap text-sm text-slate-400 font-medium">
                    {formatC(item.unit_cost)}
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity_in_stock, -100)}
                        title="-100"
                        className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all font-bold text-xs"
                      >
                         -100
                      </button>
                      <button 
                         onClick={() => updateQuantity(item.id, item.quantity_in_stock, -1000)}
                         title="-1000"
                         className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all font-bold text-xs"
                      >
                         -1k
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Receber Material</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Descrição (Nome do Lote)</label>
                <input required value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50" placeholder="Ex: Santinho Vereador Lote 1" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Tipo Padrão</label>
                  <select value={type} onChange={e => setType(e.target.value as MaterialItem['type'])} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50 text-sm [&>option]:bg-slate-900">
                    <option value="santinho">Santinho</option>
                    <option value="adesivo">Adesivo Perfurado</option>
                    <option value="praguinha">Praguinha</option>
                    <option value="bandeira">Bandeira Vento</option>
                    <option value="cartaz">Cartaz A3</option>
                    <option value="outros">Outros</option>
                  </select>
                 </div>
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Faturamento (Qtd Total)</label>
                  <input required type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50" placeholder="Ex: 50000" />
                 </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Custo Unitário da Gráfica (R$)</label>
                <input required type="number" step="0.001" value={cost} onChange={e => setCost(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50" placeholder="Ex: 0.04" />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-colors">Registrar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
