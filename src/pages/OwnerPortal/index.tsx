import { useState } from 'react';
import { Building2, Database, ShieldCheck, TrendingUp, Zap } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  admins: number;
  campaigns: number;
  tokens: number;
}

export default function OwnerPortal() {
  const [organizations] = useState<Organization[]>([
    { id: 'org1', name: 'Partido da Liberdade', admins: 3, campaigns: 5, tokens: 125000 },
    { id: 'org2', name: 'Agência Digital RGB', admins: 2, campaigns: 2, tokens: 45000 },
  ]);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight flex items-center gap-3">
             <ShieldCheck className="text-indigo-500" size={32} />
             PORTAL DO PROPRIETÁRIO
          </h1>
          <p className="text-slate-400 mt-1">Gestão Global da Plataforma CampanhaDigitalIA</p>
        </div>
        <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-lg flex items-center gap-3">
           <Zap className="text-indigo-400" size={20} />
           <div className="text-right">
             <p className="text-[10px] text-slate-500 font-bold uppercase">Consumo Global Gemini</p>
             <p className="text-lg font-black text-slate-100">US$ 42.50 <span className="text-xs text-slate-500">/ $300</span></p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-indigo-500/20">
           <div className="flex items-center gap-3 text-indigo-400 mb-4">
             <Building2 size={24} />
             <span className="font-bold uppercase tracking-wider text-sm">Organizações</span>
           </div>
           <div className="text-4xl font-black text-slate-100">12</div>
           <p className="text-xs text-slate-500 mt-2">Ativas em 4 estados</p>
        </div>
        <div className="glass-card p-6 border-emerald-500/20">
           <div className="flex items-center gap-3 text-emerald-400 mb-4">
             <Database size={24} />
             <span className="font-bold uppercase tracking-wider text-sm">Token Pool</span>
           </div>
           <div className="text-4xl font-black text-slate-100">2.4M</div>
           <p className="text-xs text-slate-500 mt-2">Volume Total de Análises</p>
        </div>
        <div className="glass-card p-6 border-amber-500/20">
           <div className="flex items-center gap-3 text-amber-400 mb-4">
             <TrendingUp size={24} />
             <span className="font-bold uppercase tracking-wider text-sm">Uptime IA</span>
           </div>
           <div className="text-4xl font-black text-slate-100">99.9%</div>
           <p className="text-xs text-slate-500 mt-2">MS em tempo real</p>
        </div>
      </div>

      <section className="flex flex-col gap-4 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-200">Organizações de Campanha</h2>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg">
            + Nova Organização
          </button>
        </div>

        <div className="glass-card overflow-hidden border-white/5">
          <table className="w-full text-left">
            <thead className="bg-slate-900/50 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Organização</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Admins</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Campanhas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Consumo (Tokens)</th>
                <th className="px-3 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {organizations.map((org: Organization) => (
                <tr key={org.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-200">{org.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase">ID: {org.id}</div>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-300 font-medium">{org.admins}</td>
                  <td className="px-6 py-4 text-center text-slate-300 font-medium">{org.campaigns}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-slate-800 text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-500/20">
                      {org.tokens.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-slate-500 hover:text-white text-xs font-bold">Ver Detalhes</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        <div className="glass-card p-6 border-white/5">
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-400" />
            Global API Configuration
          </h3>
          <div className="flex flex-col gap-4">
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Manus AI Master Key</label>
               <input 
                 type="password" 
                 defaultValue="sk-master-key-01"
                 className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all font-mono" 
               />
             </div>
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Gemini Pro API (Global Fallback)</label>
               <input 
                 type="password" 
                 defaultValue="google-ai-master-key-xyz"
                 className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2.5 text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all font-mono" 
               />
             </div>
             <button className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl font-black text-xs uppercase tracking-widest border border-white/5 mt-2 transition-all">
               Salvar Chaves Mestras
             </button>
          </div>
        </div>

        <div className="glass-card p-6 border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-400" />
            Relatório de Crescimento
          </h3>
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-white/5 rounded-xl text-slate-600 font-bold uppercase tracking-widest text-xs">
            Gráfico de Escalonamento em Desenvolvimento
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            Monitoramento automático de margem por organização. O sistema alerta automaticamente quando o consumo atinge 80% do teto configurado.
          </p>
        </div>
      </section>
    </div>
  );
}
