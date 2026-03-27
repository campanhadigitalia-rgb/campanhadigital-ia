import { FundraisingConfig } from '../../components/ui/FundraisingConfig';
import { FundraisingStats } from '../../components/ui/FundraisingStats';
import { CashFlowTable } from '../../components/ui/CashFlowTable';
import { SuppliersPage } from '../../components/ui/SuppliersPage';
import { VaquinhaPage } from '../../components/ui/VaquinhaPage';
import { DepartmentRequests } from '../../components/ui/DepartmentRequests';

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
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <FundraisingConfig />
        </div>
        <div className="lg:col-span-2">
          <FundraisingStats />
        </div>
      </section>
      
      <section className="w-full">
         <DepartmentRequests currentDepartment="Financeiro" />
      </section>
    </div>
  );
}
