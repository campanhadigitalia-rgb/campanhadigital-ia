import { FundraisingConfig } from '../../components/ui/FundraisingConfig';
import { FundraisingStats } from '../../components/ui/FundraisingStats';
import { CashFlowTable } from '../../components/ui/CashFlowTable';
import { SuppliersPage } from '../../components/ui/SuppliersPage';
import { VaquinhaPage } from '../../components/ui/VaquinhaPage';

type FinanceTab = 'dashboard' | 'caixa' | 'suppliers' | 'vaquinha';

interface Props {
  activeTab?: FinanceTab;
}

export default function FinancePage({ activeTab = 'dashboard' }: Props) {
  if (activeTab === 'caixa') {
    return (
      <div className="flex flex-col w-full h-full animate-in fade-in duration-300">
        <CashFlowTable />
      </div>
    );
  }

  if (activeTab === 'suppliers') {
    return <SuppliersPage />;
  }

  if (activeTab === 'vaquinha') {
    return <VaquinhaPage />;
  }

  // dashboard (default)
  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full animate-in fade-in duration-300">
      <div className="lg:col-span-1">
        <FundraisingConfig />
      </div>
      <div className="lg:col-span-2">
        <FundraisingStats />
      </div>
    </section>
  );
}
