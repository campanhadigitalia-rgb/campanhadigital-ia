import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import { Package, Plus, Box, ArrowRightLeft, Users, CornerDownRight, CheckCircle2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  stock: number;
}

interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out';
  quantity: number;
  personId?: string;
  personName?: string;
  createdAt: { seconds: number };
}

interface Person {
  id: string;
  name: string;
}

export function MaterialInventory() {
  const { activeCampaign } = useCampaign();
  const [tab, setTab] = useState<'manager' | 'pdv'>('manager');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    if (!activeCampaign) return;

    const unsubs: (() => void)[] = [];

    // Produtos
    unsubs.push(onSnapshot(collection(db, `campaigns/${activeCampaign.id}/products`), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
    }));

    // Transações
    unsubs.push(onSnapshot(collection(db, `campaigns/${activeCampaign.id}/inventory_transactions`), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryTransaction));
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setTransactions(data);
    }));

    // Pessoas (Suppliers)
    unsubs.push(onSnapshot(collection(db, `campaigns/${activeCampaign.id}/people`), snap => {
      setPeople(snap.docs.map(d => ({ id: d.id, name: d.data().name } as Person)));
    }));

    return () => unsubs.forEach(fn => fn());
  }, [activeCampaign]);

  // PDV State
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<string>('');

  const addToCart = (p: Product) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === p.id);
      if (ex) return prev.map(i => i.product.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product: p, quantity: 1 }];
    });
  };

  const removeFromCart = (pid: string) => {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === pid);
      if (ex && ex.quantity > 1) return prev.map(i => i.product.id === pid ? { ...i, quantity: i.quantity - 1 } : i);
      return prev.filter(i => i.product.id !== pid);
    });
  };

  const handleCheckout = async () => {
    if (!activeCampaign || cart.length === 0 || !selectedPerson) return;
    
    const personName = people.find(p => p.id === selectedPerson)?.name || 'Desconhecido';

    try {
      for (const item of cart) {
        await addDoc(collection(db, `campaigns/${activeCampaign.id}/inventory_transactions`), {
          productId: item.product.id,
          productName: item.product.name,
          type: 'out',
          quantity: item.quantity,
          personId: selectedPerson,
          personName,
          createdAt: serverTimestamp()
        });

        const newStock = Math.max(0, item.product.stock - item.quantity);
        await setDoc(doc(db, `campaigns/${activeCampaign.id}/products`, item.product.id), {
          stock: newStock
        }, { merge: true });
      }

      setCart([]);
      setSelectedPerson('');
      alert('Saída concluída e estoque atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao processar checkout');
    }
  };

  // Entrada de Estoque State
  const [newEntry, setNewEntry] = useState({ productName: '', quantity: 1, personId: '' });
  const [addingEntry, setAddingEntry] = useState(false);

  const handleAddEntry = async () => {
    if (!activeCampaign || !newEntry.productName.trim() || !newEntry.personId) return;
    setAddingEntry(true);
    
    try {
      let product = products.find(p => p.name.toLowerCase() === newEntry.productName.toLowerCase());
      const personName = people.find(p => p.id === newEntry.personId)?.name || 'Fornecedor';

      if (!product) {
        const prodRef = await addDoc(collection(db, `campaigns/${activeCampaign.id}/products`), {
          name: newEntry.productName,
          description: 'Cadastrado via Entrada',
          stock: newEntry.quantity
        });
        product = { id: prodRef.id, name: newEntry.productName, description: '', stock: newEntry.quantity };
      } else {
        await setDoc(doc(db, `campaigns/${activeCampaign.id}/products`, product.id), {
          stock: product.stock + newEntry.quantity
        }, { merge: true });
      }

      await addDoc(collection(db, `campaigns/${activeCampaign.id}/inventory_transactions`), {
        productId: product.id,
        productName: product.name,
        type: 'in',
        quantity: newEntry.quantity,
        personId: newEntry.personId,
        personName,
        createdAt: serverTimestamp()
      });

      setNewEntry({ productName: '', quantity: 1, personId: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setAddingEntry(false);
    }
  };

  if (tab === 'pdv') {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between p-4 bg-indigo-600 rounded-t-2xl shadow-lg shrink-0 z-20">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2 m-0"><Box /> PDV / Saída Rápida</h2>
            <p className="text-indigo-200 text-xs mt-1 m-0">Toque nos itens para adicionar ao carrinho.</p>
          </div>
          <button onClick={() => setTab('manager')} className="px-4 py-2 bg-black/20 hover:bg-black/40 text-white rounded-lg font-bold text-sm transition-colors">
            Voltar a Gestão
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-slate-900 border-x border-b border-indigo-500/20 rounded-b-2xl">
          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start content-start">
            {products.map(p => (
              <button key={p.id} onClick={() => addToCart(p)}
                className="aspect-square bg-slate-800 border border-slate-700 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center p-4 gap-3 active:scale-95 transition-all relative overflow-hidden group shadow-lg">
                <div className="w-14 h-14 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Package size={28} />
                </div>
                <div className="text-center w-full">
                  <p className="font-bold text-slate-200 text-sm truncate w-full">{p.name}</p>
                  <p className="text-xs text-indigo-400 font-mono mt-0.5">{p.stock} em estoque</p>
                </div>
              </button>
            ))}
          </div>

          {/* Checkout Panel */}
          <div className="w-full md:w-80 bg-slate-950 border-t md:border-t-0 md:border-l border-white/10 flex flex-col shrink-0 relative z-10 shadow-[-10px_0_20px_rgba(0,0,0,0.5)] h-64 md:h-auto">
            <div className="p-4 border-b border-white/5 bg-slate-900/50">
              <h3 className="font-bold text-slate-200 m-0">Cesta de Saída</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Box size={32} className="opacity-50" />
                  <p className="text-sm font-medium">Toque nos produtos</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex justify-between items-center group">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-slate-200 text-sm truncate">{item.product.name}</p>
                      <p className="text-[10px] text-slate-500">Estoque atual: {item.product.stock}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      <button onClick={() => removeFromCart(item.product.id)} className="text-slate-400 hover:text-red-400 select-none text-lg leading-none p-1">-</button>
                      <span className="font-mono text-sm font-bold text-white min-w-[20px] text-center">{item.quantity}</span>
                      <button onClick={() => addToCart(item.product)} className="text-slate-400 hover:text-emerald-400 select-none text-lg leading-none p-1">+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-slate-900 flex flex-col gap-3 shrink-0">
              <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">Para quem? (Pessoa / Liderança)</label>
                <select value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500">
                  <option value="">-- Selecione --</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <button onClick={handleCheckout} disabled={cart.length === 0 || !selectedPerson}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.3)] disabled:shadow-none uppercase tracking-wider text-sm transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={18} /> Confirmar Saída
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Header and Toggle */}
      <div className="glass-card p-6 flex flex-wrap items-center justify-between gap-4 border border-indigo-500/20">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2"><Package className="text-indigo-400" /> Gestão de Estoque Físico</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-lg">Controle de materiais de campanha, panfletos, bandeiras e suprimentos do comitê.</p>
        </div>
        <button onClick={() => setTab('pdv')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all">
          <Box size={18} /> MODO PDV (SAÍDAS RÁPIDAS)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Bloco 1: Registro de Entradas */}
        <div className="glass-card border border-emerald-500/20 flex flex-col">
          <div className="p-4 border-b border-emerald-500/20 bg-emerald-950/20 flex items-center gap-2">
            <CornerDownRight size={18} className="text-emerald-400" />
            <h3 className="font-bold text-emerald-300 m-0">Registrar Entrada (Compra/Doação)</h3>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 mb-1 block">Mercadoria (Digite para Criar ou usar Existente)</label>
              <input type="text" list="products-list" autoComplete="off" placeholder="Ex: Panfleto Prefeito"
                value={newEntry.productName} onChange={e => setNewEntry(p => ({ ...p, productName: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
              <datalist id="products-list">
                {products.map(p => <option key={p.id} value={p.name} />)}
              </datalist>
            </div>
            
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="text-xs font-bold text-slate-400 mb-1 block">Quantidade</label>
                <input type="number" min="1" value={newEntry.quantity} onChange={e => setNewEntry(p => ({ ...p, quantity: Number(e.target.value) }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500" />
              </div>
              <div className="w-2/3">
                <label className="text-xs font-bold text-slate-400 mb-1 block">Fornecedor / Origem</label>
                <select value={newEntry.personId} onChange={e => setNewEntry(p => ({ ...p, personId: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500">
                  <option value="">-- Selecione --</option>
                  {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <button onClick={handleAddEntry} disabled={addingEntry || !newEntry.productName.trim() || !newEntry.personId}
              className="mt-2 flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
              <Plus size={16} /> Incorporar ao Estoque
            </button>
          </div>
        </div>

        {/* Bloco 2: Produtos Cadastrados */}
        <div className="glass-card border border-slate-700/50 flex flex-col max-h-96">
          <div className="p-4 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-300 m-0 flex items-center gap-2"><Package size={16} className="text-slate-400" /> Produtos Disponíveis</h3>
            <span className="text-xs text-slate-500 font-bold bg-slate-950 px-2 py-1 rounded">{products.length} itens</span>
          </div>
          <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            {products.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex justify-between items-center">
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-sm text-slate-200 truncate">{p.name}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-lg font-black leading-none ${p.stock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{p.stock}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-500">unidades</span>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-500 text-sm">Nenhum produto em estoque.</div>
            )}
          </div>
        </div>

      </div>

      {/* Relatório de Movimentação */}
      <div className="glass-card border border-slate-700/50">
        <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-slate-400" />
          <h3 className="font-bold text-slate-300 m-0 text-sm">Extrato de Movimentação</h3>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-950 text-slate-500 uppercase tracking-wider font-black">
              <tr>
                <th className="p-3 border-b border-white/10">Data</th>
                <th className="p-3 border-b border-white/10 w-24 text-center">Tipo</th>
                <th className="p-3 border-b border-white/10">Produto</th>
                <th className="p-3 border-b border-white/10 text-center">Qtde</th>
                <th className="p-3 border-b border-white/10">Origem / Destino (Pessoa)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-slate-900/20">
              {transactions.map(t => {
                const isOut = t.type === 'out';
                const date = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleString('pt-BR') : '';
                return (
                  <tr key={t.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 text-[10px] text-slate-500 font-mono">{date}</td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${isOut ? 'text-rose-400 border-rose-500/20 bg-rose-500/10' : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'}`}>
                        {isOut ? 'Saída' : 'Entrada'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-300">{t.productName}</td>
                    <td className="p-3 text-center font-black font-mono text-sm text-slate-200">{t.quantity}</td>
                    <td className="p-3 text-slate-400 flex items-center gap-1.5"><Users size={12} className="text-slate-500" /> {t.personName || '—'}</td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-sm">Nenhuma movimentação registrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
