import { useState, useEffect } from 'react';
import { 
  Zap, 
  CheckCircle, 
  RefreshCcw, 
  Globe, 
  ShieldCheck, 
  Share2, 
  MessageSquare,
  Search,
  ExternalLink,
  Loader2
} from 'lucide-react';
import type { TREResult } from '../../services/treService';
import { checkCandidacyStatus } from '../../services/treService';
import type { SocialAccount } from '../../services/socialAuthService';
import { connectSocialAccount } from '../../services/socialAuthService';

export default function IntegrationDashboard() {
  const [loading, setLoading] = useState(true);
  const [treData, setTreData] = useState<TREResult | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  
  useEffect(() => {
    // Carregamento inicial simulado
    const init = async () => {
      const tre = await checkCandidacyStatus('Candidato Admin');
      setTreData(tre);
      setLoading(false);
    };
    init();
  }, []);

  const handleConnectSocial = async (platform: 'instagram' | 'facebook') => {
    const acc = await connectSocialAccount(platform);
    setSocialAccounts(prev => [...prev.filter(a => a.platform !== platform), acc]);
  };

  const integrations = [
    { 
      id: 'whatsapp', 
      name: 'WhatsApp Business API', 
      status: 'ON', 
      icon: <MessageSquare size={20} className="text-emerald-400" />,
      description: 'Envio de disparos e gestão de grupos via CRM.',
      provider: 'Twilio / Meta'
    },
    { 
      id: 'manus', 
      name: 'Manus AI (Web Agent)', 
      status: 'ON', 
      icon: <Search size={20} className="text-indigo-400" />,
      description: 'Busca profunda e monitoramento de oponentes em tempo real.',
      provider: 'Manus.ai'
    },
    { 
      id: 'tre', 
      name: 'Crawler Jurídico TRE', 
      status: treData?.regularity ? 'ON' : 'OFF', 
      icon: <ShieldCheck size={20} className="text-amber-400" />,
      description: 'Verificação de regularidade e novos processos (TSE/TRE).',
      provider: 'Gov.br Scraper'
    },
    { 
      id: 'meta', 
      name: 'Social Sentinel (Meta)', 
      status: socialAccounts.length > 0 ? 'ON' : 'OFF', 
      icon: <Globe size={20} className="text-sky-400" />,
      description: 'Conexão direta para análise de sentimentos em comentários.',
      provider: 'Meta Developers'
    }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 size={40} className="text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Tentáculos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
             <Zap className="text-amber-400 fill-amber-400/20" size={24} />
             PAINEL DE INTEGRAÇÕES
          </h2>
          <p className="text-slate-400 text-sm mt-1">Status de conectividade dos serviços externos da plataforma.</p>
        </div>
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-bold border border-white/5 flex items-center gap-2 transition-all">
          <RefreshCcw size={14} /> Atualizar Tudo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {integrations.map(integ => (
           <div key={integ.id} className="glass-card p-5 border-white/5 hover:border-white/10 transition-all flex flex-col gap-4 relative overflow-hidden group">
             {/* Status Badge */}
             <div className="absolute top-5 right-5 flex items-center gap-1.5">
               <span className={`text-[10px] font-black uppercase tracking-widest ${integ.status === 'ON' ? 'text-emerald-500' : 'text-slate-500'}`}>
                 {integ.status}
               </span>
               <div className={`w-2 h-2 rounded-full ${integ.status === 'ON' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
             </div>

             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/5 flex items-center justify-center">
                 {integ.icon}
               </div>
               <div>
                 <h3 className="font-bold text-slate-200">{integ.name}</h3>
                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Provider: {integ.provider}</p>
               </div>
             </div>

             <p className="text-xs text-slate-400 leading-relaxed">
               {integ.description}
             </p>

             <div className="pt-2 flex items-center gap-2 mt-auto">
               {integ.id === 'meta' ? (
                 <div className="flex gap-2 w-full">
                    <button 
                      onClick={() => handleConnectSocial('instagram')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${socialAccounts.some((a: any) => a.platform === 'instagram') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}
                    >
                      <Share2 size={14} /> {socialAccounts.some((a: any) => a.platform === 'instagram') ? 'Conectado' : 'Link Instagram'}
                    </button>
                    <button 
                      onClick={() => handleConnectSocial('facebook')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all ${socialAccounts.some((a: any) => a.platform === 'facebook') ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-400 hover:bg-indigo-600 hover:text-white'}`}
                    >
                      <Globe size={14} /> {socialAccounts.some((a: any) => a.platform === 'facebook') ? 'Conectado' : 'Link Facebook'}
                    </button>
                 </div>
               ) : (
                 <button className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-500 hover:text-slate-200 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-2">
                   Configurar <ExternalLink size={12} />
                 </button>
               )}
             </div>
           </div>
         ))}
      </div>

      {treData && (
        <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5 mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-amber-500 flex items-center gap-2 m-0 text-sm italic">
              <ShieldCheck size={18} /> RELATÓRIO DE INTEGRIDADE TRE
            </h3>
            <span className="text-[10px] text-amber-500/50 font-bold uppercase">Last Sync: {treData.lastUpdate.toLocaleTimeString()}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status Candidatura</span>
              <span className="text-xl font-black text-slate-200">{treData.status}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Processos Ativos</span>
              <span className={`text-xl font-black ${treData.lawsuits > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {treData.lawsuits} encontrados
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Certidão Quitação</span>
              <span className="text-xl font-black text-emerald-500 flex items-center gap-2">
                EMITIDA <CheckCircle size={20} />
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
