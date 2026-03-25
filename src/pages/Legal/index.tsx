import { useState } from 'react';
import { ShieldCheck, Scale } from 'lucide-react';
import { LegalOnboarding } from '../../components/ui/LegalOnboarding';
import { LegalGuardian } from '../../components/ui/LegalGuardian';

type Tab = 'deferimento' | 'guardiao';

export default function LegalPage() {
  const [tab, setTab] = useState<Tab>('deferimento');

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* Tab bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-0">
        {[
          { id: 'deferimento' as Tab, label: 'Deferimento Eleitoral', Icon: ShieldCheck, color: 'indigo' },
          { id: 'guardiao'   as Tab, label: 'Guardião Jurídico',     Icon: Scale,       color: 'red'   },
        ].map(({ id, label, Icon, color }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${
              tab === id
                ? color === 'indigo'
                  ? 'border-indigo-500 text-indigo-400'
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
    </div>
  );
}
