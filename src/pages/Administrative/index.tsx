import { useState } from 'react';
import { Package, Truck, LayoutDashboard } from 'lucide-react';
import { VehicleLogistics } from '../../components/ui/VehicleLogistics';
import { MaterialInventory } from '../../components/ui/MaterialInventory';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'materials'>('overview');

  return (
    <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-4 border-b border-white/5 pb-4 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-lg transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          <LayoutDashboard size={16} /> Visão Geral
        </button>
        <button 
          onClick={() => setActiveTab('logistics')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-lg transition-all whitespace-nowrap ${activeTab === 'logistics' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          <Truck size={16} /> Frota & Logística
        </button>
        <button 
          onClick={() => setActiveTab('materials')}
          className={`flex items-center gap-2 px-4 py-2 font-bold text-sm rounded-lg transition-all whitespace-nowrap ${activeTab === 'materials' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          <Package size={16} /> Estoque Físico
        </button>
      </div>

      <section className="flex-1 flex flex-col">
        {activeTab === 'overview' && (
          <div className="flex-1 glass-card border border-amber-500/20 p-6 flex flex-col items-center justify-center text-center gap-4">
             <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
               <Package size={32} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-slate-200">Painel Administrativo da Campanha</h2>
               <p className="text-sm text-slate-400 mt-2 max-w-md">Gerencie a estrutura física do comitê. Abastecimento de veículos, rota de panfletagem, e requisições de material impresso pelas lideranças.</p>
             </div>
          </div>
        )}
        {activeTab === 'logistics' && <VehicleLogistics />}
        {activeTab === 'materials' && <MaterialInventory />}
      </section>
    </div>
  );
}
