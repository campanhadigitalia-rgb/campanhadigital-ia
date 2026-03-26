import { useState } from 'react';
import { ShieldCheck, Scale, ClipboardCheck } from 'lucide-react';
import { LegalOnboarding } from '../../components/ui/LegalOnboarding';
import { LegalGuardian } from '../../components/ui/LegalGuardian';
import { LegalApprovals } from '../../components/ui/LegalApprovals';
import { LegalCaseManager } from '../../components/ui/LegalCaseManager';
import { LegalSuppliers } from '../../components/ui/LegalSuppliers';

type Tab = 'deferimento' | 'guardiao' | 'contratos' | 'aprovação' | 'processos';

export default function LegalDocsPage() {
  const [tab, setTab] = useState<Tab>('deferimento');

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-0 overflow-x-auto scrollbar-hide">
        {[
          { id: 'deferimento' as Tab, label: 'Deferimento Eleitoral', Icon: ShieldCheck, color: 'indigo' },
          { id: 'guardiao'    as Tab, label: 'Guardião Jurídico',    Icon: Scale,       color: 'red'    },
          { id: 'contratos'   as Tab, label: 'Compliance Contratos', Icon: ClipboardCheck, color: 'indigo' },
          { id: 'aprovação'   as Tab, label: 'Aprovação (ERP)',      Icon: ShieldCheck, color: 'emerald' },
          { id: 'processos'    as Tab, label: 'Processos (PJe)',      Icon: Scale,       color: 'red'    },
        ].map(({ id, label, Icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap -mb-px ${
              tab === id
                ? color === 'indigo' ? 'border-indigo-500 text-indigo-400'
                  : color === 'emerald' ? 'border-emerald-500 text-emerald-400'
                  : 'border-red-500 text-red-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'deferimento' && <LegalOnboarding />}
      {tab === 'guardiao'    && <LegalGuardian />}
      {tab === 'contratos'   && <LegalSuppliers />}
      {tab === 'aprovação'   && <LegalApprovals />}
      {tab === 'processos'    && <LegalCaseManager />}
    </div>
  );
}
