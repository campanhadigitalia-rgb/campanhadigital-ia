import { useState } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { useAuth } from '../../context/AuthContext';
import { Save, AlertCircle, DatabaseZap, Loader2, Settings2, ShieldCheck, Zap, Search } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { seedRSRegions } from '../../utils/seedRS';
import IdentitySettings from './IdentitySettings';
import IntegrationDashboard from '../../components/ui/IntegrationDashboard';
import SearchEnginesSettings from './SearchEnginesSettings';

export default function Settings() {
  const { activeCampaign } = useCampaign();
  const { profile } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'identity' | 'integrations' | 'search'>('general');
  
  // Basic states for campaign profile management
  const [name, setName] = useState(activeCampaign?.name || '');
  const [year, setYear] = useState(activeCampaign?.year || new Date().getFullYear());
  const [status, setStatus] = useState((activeCampaign as any)?.status || 'active');
  const [baseCity, setBaseCity] = useState(activeCampaign?.base_city || '');

  const [adminEmail, setAdminEmail] = useState(activeCampaign?.admin_email || '');
  const [isSavingAccess, setIsSavingAccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    try {
      const ref = doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id);
      await updateDoc(ref, { name, year, status, base_city: baseCity });
      alert('Configurações gerais salvas com sucesso!');
    } catch(err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
  };

  const handleSaveAccess = async () => {
    if (!activeCampaign || profile?.role !== 'Proprietor') return;
    setIsSavingAccess(true);
    try {
      const ref = doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id);
      await updateDoc(ref, { admin_email: adminEmail });
      alert('Administrador atualizado com sucesso!');
    } catch (e: any) {
      alert('Erro ao atualizar: ' + e.message);
    } finally {
      setIsSavingAccess(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          Configurações da Campanha
        </h1>
        <p className="text-sm text-slate-400">Personalize a identidade, oponentes e metadados da sua campanha.</p>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap gap-2 md:gap-4 border-b border-white/5 pb-1">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'general' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2">
            <Settings2 size={16} /> Gerais
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('identity')}
          className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'identity' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} /> Identidade & IA
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'integrations' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2 text-amber-500">
            <Zap size={16} /> Integrações
          </div>
        </button>
        <button 
          onClick={() => setActiveTab('search')}
          className={`px-4 py-2 text-sm font-bold transition-all border-b-2 ${activeTab === 'search' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          <div className="flex items-center gap-2">
            <Search size={16} /> Mecanismos de Busca
          </div>
        </button>
      </div>

      <div className="mt-2">
        {activeTab === 'general' ? (
          <div className="flex flex-col gap-8">
            <div className="glass-card p-6 max-w-2xl">
              <form onSubmit={handleSave} className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-300">Nome da Campanha</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="px-4 py-2 rounded-md bg-black/40 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Ex: Prefeito 2024"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-semibold text-slate-300">Ano Eleitoral</label>
                    <input 
                      type="number" 
                      value={year}
                      onChange={e => setYear(Number(e.target.value))}
                      className="px-4 py-2 rounded-md bg-black/40 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-2 flex-1">
                    <label className="text-sm font-semibold text-slate-300">Status</label>
                    <select 
                      value={status}
                      onChange={e => setStatus(e.target.value as any)}
                      className="px-4 py-2 rounded-md bg-black/40 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="active">Ativa</option>
                      <option value="archived">Arquivada</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-300">Cidade Sede (Início de Rotas)</label>
                  <input 
                    type="text" 
                    value={baseCity}
                    onChange={e => setBaseCity(e.target.value)}
                    className="px-4 py-2 rounded-md bg-black/40 border border-slate-700 text-white focus:border-indigo-500 focus:outline-none"
                    placeholder="Ex: Porto Alegre"
                  />
                  <p className="text-[10px] text-slate-500">Esta cidade será usada como ponto de partida matinal no cálculo de tempo de viagem da Agenda.</p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-md flex gap-3 mt-2">
                  <AlertCircle className="text-blue-400 shrink-0" size={20} />
                  <p className="text-sm text-blue-200">
                    As alterações feitas aqui afetarão todos os usuários que têm acesso a esta campanha. A sincronização com o banco de dados principal ocorrerá na próxima versão.
                  </p>
                </div>

                <div className="flex justify-end mt-4">
                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                  >
                    <Save size={18} />
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>

            {profile?.role === 'Admin' && (
              <div className="glass-card p-6 max-w-2xl border-indigo-500/20">
                 <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
                   <DatabaseZap size={20} className="text-indigo-400" />
                   Ações de Administrador (DB)
                 </h2>
                 <p className="text-sm text-slate-400 mb-6">
                   Como administrador logado, você pode disparar scripts da aplicação direto no Firestore. A base gerará os documentos do Rio Grande do Sul no tenant {activeCampaign?.id}.
                 </p>
                 
                 <button 
                   onClick={async () => {
                      if (!activeCampaign) return;
                      setSeeding(true);
                      try {
                        await seedRSRegions(activeCampaign.id);
                        alert('Carga Inicial Geográfica Injetada com Sucesso no banco de dados!');
                      } catch (e: any) {
                        alert('Erro ao injetar payload: ' + e.message);
                      } finally {
                        setSeeding(false);
                      }
                   }}
                   disabled={seeding}
                   className="bg-indigo-600/20 hover:bg-indigo-500/40 border border-indigo-500/50 text-indigo-300 w-full px-4 py-3 rounded-md font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                 >
                   {seeding ? <Loader2 size={18} className="animate-spin" /> : <DatabaseZap size={18} />}
                   Forçar Seed de Zonas Geo (Heatmap RS)
                 </button>
              </div>
            )}

            {(profile?.role === 'Proprietor' || profile?.role === 'Admin') && (
              <div className="glass-card p-6 max-w-2xl border-emerald-500/20">
                 <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
                   <ShieldCheck size={20} className="text-emerald-400" />
                   Gestão de Acessos
                 </h2>
                 <p className="text-sm text-slate-400 mb-4">
                   Controle o e-mail responsável por acessar e gerir os dados desta Campanha.
                 </p>
                 <div className="flex flex-col gap-2">
                   <label className="text-sm font-semibold text-slate-300">E-mail do Administrador Principal</label>
                   <input 
                     type="email" 
                     value={adminEmail}
                     onChange={e => setAdminEmail(e.target.value)}
                     disabled={profile?.role !== 'Proprietor'} 
                     className="px-4 py-2 rounded-md bg-black/40 border border-slate-700 text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                   />
                 </div>
                 {profile?.role === 'Proprietor' && (
                   <button 
                     onClick={handleSaveAccess}
                     disabled={isSavingAccess}
                     className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-md font-medium transition-colors w-max flex items-center gap-2 disabled:opacity-50"
                   >
                     {isSavingAccess ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                     Transferir Acesso
                   </button>
                 )}
              </div>
            )}
          </div>
        ) : activeTab === 'identity' ? (
          <IdentitySettings />
        ) : activeTab === 'search' ? (
          <SearchEnginesSettings />
        ) : (
          <IntegrationDashboard />
        )}
      </div>
    </div>
  );
}
