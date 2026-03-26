import { useState, useEffect } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { db } from '../../services/firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { Plus, Car, Fuel, CheckCircle2, ChevronLeft, MapPin, Gauge, Clock, ArrowRightLeft } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  type: string;
}

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  driver: string;
  contract_type: 'alugado' | 'cedido' | 'proprio';
  fuel_quota: number;
  status: 'active' | 'maintenance' | 'inactive';
  supplierId?: string;
}

interface LogbookEntry {
  id: string;
  vehicleId: string;
  personId: string;
  personName: string;
  kmOut: number;
  obsOut: string;
  timeOut: { seconds: number };
  kmIn?: number;
  obsIn?: string;
  timeIn?: { seconds: number };
  status: 'running' | 'finished';
}

export function VehicleLogistics() {
  const { activeCampaign } = useCampaign();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [people, setPeople] = useState<Supplier[]>([]);
  const [logs, setLogs] = useState<LogbookEntry[]>([]);

  // View state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (!activeCampaign) return;

    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(collection(db, `campaigns/${activeCampaign.id}/vehicles`), snap => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    }));

    unsubs.push(onSnapshot(collection(db, `campaigns/${activeCampaign.id}/people`), snap => {
      setPeople(snap.docs.map(d => ({ id: d.id, name: d.data().name, type: d.data().type } as Supplier)));
    }));

    unsubs.push(onSnapshot(collection(db, `campaigns/${activeCampaign.id}/logbook`), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LogbookEntry));
      data.sort((a, b) => (b.timeOut?.seconds || 0) - (a.timeOut?.seconds || 0));
      setLogs(data);
    }));

    return () => unsubs.forEach(fn => fn());
  }, [activeCampaign]);

  // Vehicle Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [fuelQuota, setFuelQuota] = useState('');
  const [contractType, setContractType] = useState<Vehicle['contract_type']>('alugado');
  const [supplierId, setSupplierId] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    setCreating(true);
    try {
      await addDoc(collection(db, `campaigns/${activeCampaign.id}/vehicles`), {
        plate: plate.toUpperCase(),
        model,
        contract_type: contractType,
        fuel_quota: Number(fuelQuota) || 0,
        status: 'active',
        supplierId,
        createdAt: serverTimestamp()
      });
      setPlate(''); setModel(''); setFuelQuota(''); setSupplierId(''); setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar veículo.');
    } finally {
      setCreating(false);
    }
  };

  // Logbook form state
  const [personId, setPersonId] = useState('');
  const [kmOut, setKmOut] = useState('');
  const [obsOut, setObsOut] = useState('');
  const [loadingLog, setLoadingLog] = useState(false);

  // Return form state
  const [kmIn, setKmIn] = useState('');
  const [obsIn, setObsIn] = useState('');

  const handleCheckOut = async () => {
    if (!activeCampaign || !selectedVehicle || !personId || !kmOut) return;
    setLoadingLog(true);
    try {
      const personName = people.find(p => p.id === personId)?.name || 'Desconhecido';
      await addDoc(collection(db, `campaigns/${activeCampaign.id}/logbook`), {
        vehicleId: selectedVehicle.id,
        personId,
        personName,
        kmOut: Number(kmOut),
        obsOut,
        status: 'running',
        timeOut: serverTimestamp()
      });
      setPersonId(''); setKmOut(''); setObsOut('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLog(false);
    }
  };

  const handleCheckIn = async (logId: string) => {
    if (!activeCampaign || !kmIn) return;
    try {
      await updateDoc(doc(db, `campaigns/${activeCampaign.id}/logbook`, logId), {
        kmIn: Number(kmIn),
        obsIn,
        status: 'finished',
        timeIn: serverTimestamp()
      });
      setKmIn(''); setObsIn('');
    } catch (err) {
      console.error(err);
    }
  };

  if (selectedVehicle) {
    const vehicleLogs = logs.filter(l => l.vehicleId === selectedVehicle.id);
    const activeRun = vehicleLogs.find(l => l.status === 'running');

    return (
      <div className="flex flex-col gap-6 animate-in duration-300 slide-in-from-right-8">
        <div className="glass-card p-6 border border-emerald-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedVehicle(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft size={20} /></button>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Car className="text-emerald-400" /> Diário de Bordo</h2>
              <p className="text-emerald-400/80 font-mono mt-1 text-sm bg-emerald-500/10 inline-block px-2 py-0.5 rounded border border-emerald-500/20">
                {selectedVehicle.plate} - {selectedVehicle.model}
              </p>
            </div>
          </div>
          <div className="text-right">
             <div className="text-xs text-slate-500 font-bold uppercase">Status Atual</div>
             {activeRun ? (
               <div className="text-amber-400 font-bold flex items-center gap-1.5 mt-1 border border-amber-500/30 bg-amber-500/10 px-3 py-1 rounded-full text-sm">
                 <Gauge size={14} className="animate-pulse" /> Em Uso por {activeRun.personName}
               </div>
             ) : (
               <div className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 rounded-full text-sm">
                 <CheckCircle2 size={14} /> Disponível na Base
               </div>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-6">
            {!activeRun ? (
               <div className="glass-card border border-amber-500/30 p-5 bg-linear-to-br from-amber-500/5 to-transparent">
                 <h3 className="font-bold text-amber-300 flex items-center gap-2 mb-4"><MapPin size={16} /> Nova Saída (Check-out)</h3>
                 <div className="flex flex-col gap-3">
                   <div>
                     <label className="text-xs font-bold text-slate-400 mb-1 block">Quem vai dirigir? (Pessoa)</label>
                     <select value={personId} onChange={e => setPersonId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none">
                       <option value="">-- Selecione Motorista --</option>
                       {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-400 mb-1 block">KM de Saída</label>
                     <input type="number" value={kmOut} onChange={e => setKmOut(e.target.value)} placeholder="Ex: 125400" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none font-mono" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-400 mb-1 block">Observação (Avarias, Nível Comb.)</label>
                     <input value={obsOut} onChange={e => setObsOut(e.target.value)} placeholder="Meio tanque, risco na porta..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-amber-500 outline-none" />
                   </div>
                   <button onClick={handleCheckOut} disabled={loadingLog || !personId || !kmOut} className="w-full mt-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-lg">Registrar Saída</button>
                 </div>
               </div>
            ) : (
               <div className="glass-card border border-emerald-500/30 p-5 bg-linear-to-br from-emerald-500/5 to-transparent relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 animate-pulse" />
                 <h3 className="font-bold text-emerald-300 flex items-center gap-2 mb-4"><MapPin size={16} /> Retornar Veículo (Check-in)</h3>
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-white/5 mb-4">
                   <p className="text-xs text-slate-400">Saiu com: <span className="text-amber-400 font-mono font-bold">{activeRun.kmOut} KM</span></p>
                   {activeRun.obsOut && <p className="text-xs text-slate-500 mt-1 italic">"{activeRun.obsOut}"</p>}
                 </div>
                 <div className="flex flex-col gap-3">
                   <div>
                     <label className="text-xs font-bold text-slate-400 mb-1 block">KM de Retorno</label>
                     <input type="number" value={kmIn} onChange={e => setKmIn(e.target.value)} placeholder="Ex: 125450" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none font-mono" />
                   </div>
                   <div>
                     <label className="text-xs font-bold text-slate-400 mb-1 block">Observação de Retorno</label>
                     <input value={obsIn} onChange={e => setObsIn(e.target.value)} placeholder="Tudo ok, precisou abastecer..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:border-emerald-500 outline-none" />
                   </div>
                   <button onClick={() => handleCheckIn(activeRun.id)} disabled={!kmIn} className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]">Registrar Retorno</button>
                 </div>
               </div>
            )}
          </div>

          <div className="lg:col-span-2 glass-card border border-white/10 flex flex-col max-h-[600px]">
            <div className="p-4 border-b border-white/5 bg-slate-900/50 flex items-center justify-between">
              <h3 className="font-bold text-slate-300 m-0 text-sm flex items-center gap-2"><Clock size={16} /> Histórico de Viagens</h3>
              <span className="text-xs text-slate-500 font-bold">{vehicleLogs.length} registros</span>
            </div>
            <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3 content-start">
              {vehicleLogs.map(log => {
                const dateOut = log.timeOut?.seconds ? new Date(log.timeOut.seconds * 1000).toLocaleString('pt-BR').slice(0, 16) : '';
                const dateIn = log.timeIn?.seconds ? new Date(log.timeIn.seconds * 1000).toLocaleString('pt-BR').slice(0, 16) : '';
                const isRunning = log.status === 'running';
                
                return (
                  <div key={log.id} className={`border rounded-xl p-4 flex flex-col gap-3 ${isRunning ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-700/50 bg-slate-800/50'} relative`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-200">{log.personName}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{dateOut} {dateIn ? `→ ${dateIn}` : '→ (Em Andamento)'}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${isRunning ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'}`}>
                        {isRunning ? 'Em Rota' : 'Finalizado'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-2">
                       <div className="bg-slate-900 rounded p-2 border border-slate-700">
                         <p className="text-[10px] text-slate-500 font-bold uppercase">Saída</p>
                         <p className="font-mono text-sm text-slate-300">{log.kmOut} KM</p>
                         {log.obsOut && <p className="text-[10px] text-slate-400 italic mt-1">{log.obsOut}</p>}
                       </div>
                       {log.status === 'finished' && (
                         <div className="bg-slate-900 rounded p-2 border border-slate-700">
                           <p className="text-[10px] text-slate-500 font-bold uppercase">Retorno</p>
                           <p className="font-mono text-sm text-slate-300">{log.kmIn} KM {log.kmIn && log.kmOut && <span className="text-emerald-400 ml-1 text-xs">(+{log.kmIn - log.kmOut}km)</span>}</p>
                           {log.obsIn && <p className="text-[10px] text-slate-400 italic mt-1">{log.obsIn}</p>}
                         </div>
                       )}
                    </div>
                  </div>
                );
              })}
              {vehicleLogs.length === 0 && (
                <div className="text-center py-12 text-slate-500">Nenhum registro de saída para este veículo.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="glass-card p-6 flex justify-between items-center border border-emerald-500/20">
        <div>
          <h3 className="text-xl font-bold text-emerald-400 flex items-center gap-2"><Car size={24} /> Frota Cadastrada</h3>
          <p className="text-sm text-slate-400 mt-1">Gerencie veículos ativos e controle o diário de bordo digital.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">
          <Plus size={16} /> Adicionar Veículo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vehicles.map(v => {
          const vLogs = logs.filter(l => l.vehicleId === v.id);
          const isRunning = vLogs.some(l => l.status === 'running');
          
          return (
            <button key={v.id} onClick={() => setSelectedVehicle(v)} className="glass-card border border-white/5 hover:border-emerald-500/50 p-0 overflow-hidden group transition-all text-left flex flex-col justify-between h-48 relative shadow-lg">
              {isRunning && <div className="absolute top-0 left-0 w-full h-1 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-slate-200 rounded tracking-widest">{v.plate}</span>
                  {isRunning ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest"><Gauge size={10} /> Em Uso</span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest"><CheckCircle2 size={10} /> Na Base</span>
                  )}
                </div>
                <h4 className="font-black text-white text-xl uppercase mt-auto mb-1 truncate">{v.model}</h4>
                <p className="text-xs text-slate-400 capitalize flex items-center gap-2">
                  <Fuel size={12} className="text-amber-500" /> Cota Mensal: {v.fuel_quota}L
                </p>
              </div>
              <div className="bg-slate-900/50 p-4 border-t border-white/5 flex justify-between items-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                 <span className="text-sm font-bold text-slate-400 group-hover:text-white/90 truncate">
                   {isRunning ? `Motorista: ${vLogs.find(l => l.status === 'running')?.personName}` : `Abrir Diário de Bordo`}
                 </span>
                 <ArrowRightLeft size={16} className="text-slate-600 group-hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          );
        })}
        {vehicles.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-700 rounded-xl">
            Nenhum veículo registrado na campanha. Clique em "Adicionar Veículo".
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-emerald-500/20 flex justify-between items-center bg-emerald-950/20">
              <h3 className="text-lg font-bold text-emerald-400 uppercase tracking-tight">Cadastrar Veículo</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleCreateVehicle} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Placa</label>
                  <input required value={plate} onChange={e => setPlate(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50 uppercase font-mono" placeholder="ABC1234" maxLength={8} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Modelo</label>
                  <input required value={model} onChange={e => setModel(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50" placeholder="Ex: Celta" />
                </div>
              </div>

              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Pertence a qual Fornecedor? (Pessoa)</label>
                 <select required value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50">
                    <option value="">-- Vincular Fornecedor (Obrigatório) --</option>
                    {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Contrato</label>
                  <select value={contractType} onChange={e => setContractType(e.target.value as Vehicle['contract_type'])} className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50 text-sm [&>option]:bg-slate-900">
                    <option value="alugado">Veículo Alugado</option>
                    <option value="cedido">Comodato / Cedido</option>
                    <option value="proprio">Frota Própria</option>
                  </select>
                 </div>
                 <div>
                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Cota Combustível</label>
                  <input required type="number" value={fuelQuota} onChange={e => setFuelQuota(e.target.value)} className="w-full bg-black/50 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-emerald-500/50" placeholder="Ex: 50" />
                 </div>
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" disabled={creating} className="px-5 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-colors">Confirmar Matrícula</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
