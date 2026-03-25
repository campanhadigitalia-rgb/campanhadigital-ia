import { useState } from 'react';
import { FundraisingConfig } from '../../components/ui/FundraisingConfig';
import { FundraisingStats } from '../../components/ui/FundraisingStats';
import { CashFlowTable } from '../../components/ui/CashFlowTable';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'kpi' | 'caixa'>('kpi');

  return (
    <div className="flex flex-col gap-6 w-full h-full animate-in fade-in duration-300">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setActiveTab('kpi')}
          className={`px-4 py-2 font-bold text-sm rounded-lg transition-all ${activeTab === 'kpi' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          Setup & Metas Financeiras
        </button>
        <button 
          onClick={() => setActiveTab('caixa')}
          className={`px-4 py-2 font-bold text-sm rounded-lg transition-all ${activeTab === 'caixa' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
        >
          Livro Caixa (Lançamentos)
        </button>
      </div>

      {activeTab === 'kpi' ? (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FundraisingConfig />
          </div>
          <div className="lg:col-span-2">
            <FundraisingStats />
          </div>
        </section>
      ) : (
        <section className="flex-1 animate-in fade-in flex">
           <CashFlowTable />
        </section>
      )}
    </div>
  );
}
