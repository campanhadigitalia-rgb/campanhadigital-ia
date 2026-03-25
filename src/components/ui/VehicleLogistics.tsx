import { useState, useEffect, useCallback } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import type { Vehicle } from '../../types';
import { Plus, Car, Fuel, Wrench, CheckCircle2 } from 'lucide-react';

export function VehicleLogistics() {
  const { campaignId } = useCampaign();
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [driver, setDriver] = useState('');
  const [contractType, setContractType] = useState<Vehicle['contract_type']>('alugado');
  const [fuelQuota, setFuelQuota] = useState('');

  const fetchVehicles = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'admin_vehicles'), where('campaign_id', '==', campaignId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      setVehicles(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !profile) return;
    try {
      await addDoc(collection(db, 'admin_vehicles'), {
        campaign_id: campaignId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: profile.uid,
        plate: plate.toUpperCase(),
        model,
        driver,
        contract_type: contractType,
        fuel_quota: Number(fuelQuota) || 0,
        status: 'active'
      });
      setPlate(''); setModel(''); setDriver(''); setFuelQuota(''); setIsModalOpen(false);
      fetchVehicles();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar veículo.');
    }
  };

  const toggleStatus = async (id: string, currentStatus: Vehicle['status']) => {
    const nextStatus = currentStatus === 'active' ? 'maintenance' : currentStatus === 'maintenance' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'admin_vehicles', id), { status: nextStatus, updatedAt: serverTimestamp() });
      fetchVehicles();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-amber-500 flex items-center gap-2"><Car size={24} /> Frota Cadastrada</h3>
          <p className="text-sm text-slate-400">Controle de veículos, motoristas e cota de combustível do comitê.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-colors">
          <Plus size={16} /> Add Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="p-8 text-slate-500">Carregando frota...</div>
        ) : vehicles.length === 0 ? (
          <div className="p-8 text-slate-500 border border-dashed border-white/10 rounded-xl text-center w-full col-span-full">Nenhum veículo registrado na campanha.</div>
        ) : vehicles.map(v => (
          <div key={v.id} className="glass-card p-5 border border-amber-500/20 relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <span className="px-2 py-1 bg-black/40 text-xs font-mono font-bold text-slate-300 border border-white/10 rounded">{v.plate}</span>
                 <h4 className="font-bold text-white mt-2 text-lg">{v.model}</h4>
                 <p className="text-sm text-amber-400 capitalize">{v.contract_type}</p>
               </div>
               <button 
                onClick={() => toggleStatus(v.id, v.status)}
                title="Mudar Status"
                className={`p-2 rounded-full border transition-colors ${v.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : v.status === 'maintenance' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-800 border-slate-600 text-slate-500'}`}
               >
                 {v.status === 'active' ? <CheckCircle2 size={18} /> : v.status === 'maintenance' ? <Wrench size={18} /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-500" />}
               </button>
             </div>
             
             <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/5 text-sm">
               <div className="flex-1">
                 <p className="text-xs text-slate-500 uppercase font-bold">Motorista</p>
                 <p className="font-medium text-slate-200 truncate">{v.driver}</p>
               </div>
               <div className="flex items-center gap-2 text-amber-400">
                 <Fuel size={16} />
                 <span className="font-black text-lg">{v.fuel_quota}L<span className="text-[10px] text-slate-500 ml-1">/mês</span></span>
               </div>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Cadastrar Veículo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Placa</label>
                  <input required value={plate} onChange={e => setPlate(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50 uppercase font-mono" placeholder="ABC-1234" maxLength={8} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Modelo</label>
                  <input required value={model} onChange={e => setModel(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50" placeholder="Gol, Kwid..." />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Motorista (Responsável)</label>
                <input required value={driver} onChange={e => setDriver(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50" placeholder="Nome completo" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Contrato</label>
                  <select value={contractType} onChange={e => setContractType(e.target.value as Vehicle['contract_type'])} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50 text-sm [&>option]:bg-slate-900">
                    <option value="alugado">Alugado</option>
                    <option value="cedido">Comodato/Cedido</option>
                    <option value="proprio">Próprio</option>
                  </select>
                 </div>
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Cota Gasolina (L/Mês)</label>
                  <input required type="number" value={fuelQuota} onChange={e => setFuelQuota(e.target.value)} className="w-full mt-1 bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-amber-500/50" placeholder="Ex: 200" />
                 </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-colors">Cadastrar Veículo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
