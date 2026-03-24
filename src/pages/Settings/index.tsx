import { useState } from 'react';
import { useCampaign } from '../../context/CampaignContext';
import { Save, AlertCircle } from 'lucide-react';

export default function Settings() {
  const { activeCampaign } = useCampaign();
  
  // Basic states for campaign profile management
  const [name, setName] = useState(activeCampaign?.name || '');
  const [year, setYear] = useState(activeCampaign?.year || new Date().getFullYear());
  const [status, setStatus] = useState((activeCampaign as any)?.status || 'active');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to Firebase campaign update service when ready
    alert('Configurações salvas (Simulação)');
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          Configurações da Campanha
        </h1>
        <p className="text-sm text-slate-400">Gerencie o perfil e os ajustes gerais da campanha atual.</p>
      </div>

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

          <div className="flex gap-4">
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
    </div>
  );
}
