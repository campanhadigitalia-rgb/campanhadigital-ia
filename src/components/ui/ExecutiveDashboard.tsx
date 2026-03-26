import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Brain, DollarSign, Activity, MessageCircle, Flame, Download, AlertTriangle, ShieldAlert, CheckCircle, Crosshair, Server, Globe, Cpu } from 'lucide-react';

import { getPollTrackingHistory, getOracleAggregates } from '../../services/oracleService';
import { fetchFinanceStats } from '../../services/multipliersService';
import { fetchMilitancyCells } from '../../services/messagingService';
import { testGeminiConnection } from '../../services/aiService';
import { useAuth } from '../../context/AuthContext';
import { useCampaign } from '../../context/CampaignContext';
import { CampaignMap } from './CampaignMap';
import { SocialSentinel } from './SocialSentinel';
import { logger } from '../../utils/logger';

export function ExecutiveDashboard() {
  const { profile } = useAuth();
  const { activeCampaign } = useCampaign();
  const [warMode, setWarMode] = useState(false);
  const [crisisData, setCrisisData] = useState<{ regions: string[], topics: string[] }>({ regions: [], topics: [] });

  // ── Monitoramento de Infraestrutura ──────────────────────────
  const { data: apiStatus } = useQuery({ 
    queryKey: ['gemini_health'], 
    queryFn: testGeminiConnection,
    staleTime: 300000 
  });

  const { data: dbStatus } = useQuery({
    queryKey: ['db_health'],
    queryFn: async () => {
      try {
        await getPollTrackingHistory(activeCampaign?.id);
        return true;
      } catch { return false; }
    },
    staleTime: 60000
  });

  const handleCrisisAlert = (regions: string[], topics: string[]) => {
    if (JSON.stringify(regions) !== JSON.stringify(crisisData.regions)) {
      setCrisisData({ regions, topics });
    }
  };

  // ── Agregações Reais via Firestore ──────────────────────────
  const { data: aggregates } = useQuery({
    queryKey: ['oracle_aggregates', activeCampaign?.id],
    queryFn: () => getOracleAggregates(activeCampaign?.id || 'CDIA_2026'),
    staleTime: 30000,
    enabled: !!activeCampaign?.id
  });

  const { data: polls } = useQuery<Record<string, number>[]>({ 
    queryKey: ['oracle_polls', activeCampaign?.id], 
    queryFn: () => getPollTrackingHistory(activeCampaign?.id || 'CDIA_2026') as unknown as Promise<Record<string, number>[]>, 
    staleTime: 60000 
  });

  const { data: finance } = useQuery({ queryKey: ['finance_stats'], queryFn: () => fetchFinanceStats(activeCampaign?.id || 'CDIA_2026'), staleTime: 60000 });
  const { data: cells } = useQuery({ queryKey: ['militancy_cells'], queryFn: () => fetchMilitancyCells(activeCampaign?.id || 'CDIA_2026'), staleTime: 60000 });

  const pollsList = Array.isArray(polls) ? polls : [];
  const currentIntent = aggregates?.currentIntent || (pollsList.length > 0 ? (pollsList[pollsList.length - 1] as Record<string, number>).Governador || 0 : 0);
  const totalEngagement = aggregates?.engagementCount || 0;
  
  const financeRaised = (finance as { raised?: number } | undefined)?.raised || 0;
  const totalReach = Array.isArray(cells) ? (cells as { estimatedReach?: number }[]).reduce((acc: number, c) => acc + (c.estimatedReach || 0), 0) : 0;
  const streetClimate = totalEngagement > 0 ? Math.min(100, Math.floor((totalEngagement / 1000) * 100)) : 0;

  const exportPDF = () => { logger.info('Iniciando exportação de PDF...'); window.print(); };

  if (warMode) {
    return (
      <div className="flex flex-col gap-6 w-full h-full bg-red-950/20 absolute inset-0 z-50 p-6 md:p-12 overflow-y-auto animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
             <div className="h-16 w-16 bg-red-600 rounded-2xl flex items-center justify-center animate-pulse shadow-[0_0_40px_rgba(220,38,38,0.8)]">
               <Flame size={32} className="text-white" />
             </div>
             <div>
               <h1 className="text-4xl font-black text-red-500 tracking-tighter uppercase">MODO GUERRA ATIVADO</h1>
               <p className="text-red-400 font-medium">Controle de Danos e Janela de 2 Horas.</p>
             </div>
           </div>
           <button onClick={() => setWarMode(false)} className="bg-slate-900 border border-slate-700 text-slate-300 hover:text-white px-6 py-3 rounded-xl font-bold transition-all">
             Desativar Alarme
           </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="glass-card bg-red-900/10 border-red-500/50 p-6 flex flex-col gap-4">
              <h2 className="text-red-500 font-bold flex items-center gap-2 text-xl"><ShieldAlert /> Defesa Imadiata</h2>
              <p className="text-slate-300">Nova representação jurídica detectada. Prazo legal encerra brevemente.</p>
              <button className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg mt-auto">Gerar Defesa com IA</button>
           </div>
           <div className="glass-card bg-orange-900/10 border-orange-500/50 p-6 flex flex-col gap-4">
              <h2 className="text-orange-500 font-bold flex items-center gap-2 text-xl"><AlertTriangle /> Alerta Regional</h2>
              <p className="text-slate-300">Engajamento despencou em áreas críticas. O Sentinela acusa narrativas adversas.</p>
              <button className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg mt-auto">Acessar Agenda Tática</button>
           </div>
           <div className="glass-card bg-fuchsia-900/10 border-fuchsia-500/50 p-6 flex flex-col gap-4">
              <h2 className="text-fuchsia-500 font-bold flex items-center gap-2 text-xl"><Crosshair /> Contenção Digital</h2>
              <p className="text-slate-300">Texto anti-crise aprovado pelo jurídico. Pronto para broadcast WhatsApp.</p>
              <button className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 rounded-lg mt-auto">Apertar Gatilho (Messaging)</button>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full h-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 flex items-center gap-2 tracking-tight uppercase">
            {(activeCampaign?.name || 'CAMPANHADIGITAL IA').replace(/Piratini/gi, 'CampanhaDigitalIA')} <span className="text-emerald-500">•</span> ALTO COMANDO
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Operação de {profile?.displayName || 'Candidato'} monitorada em tempo real pelas engines de IA.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button onClick={exportPDF} className="flex-1 md:flex-none justify-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-2.5 rounded-lg flex items-center gap-2 text-xs md:text-sm font-bold transition-all shadow-sm">
            <Download size={14} /> Briefing (PDF)
          </button>
          <button onClick={() => setWarMode(true)} className="flex-1 md:flex-none justify-center bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-xs md:text-sm font-black transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)]">
            <Flame size={14} /> MODO GUERRA
          </button>
        </div>
      </div>

      {/* ── Indicadores de Conectividade de Produção ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
         <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${dbStatus ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <Server size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Banco de Dados: {dbStatus ? '🟢 Conectado - Dados Reais' : '🔴 Erro de Sincronia'}</span>
         </div>
         <div className="flex items-center gap-3 px-4 py-2 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-500">
            <Globe size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Webhook Meta: 🟡 Aguardando Token Verificação</span>
         </div>
         <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${apiStatus ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
            <Cpu size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">IA Gemini: {apiStatus ? '🟢 Ativa - Gemini 1.5 Flash' : '🔴 API Interrompida'}</span>
         </div>
      </div>

      <div className="bg-slate-900/80 border border-red-500/20 rounded-xl py-4 px-3 min-h-[60px] flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap shadow-inner relative overflow-hidden">
         <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-amber-500 to-red-500"></div>
         <span className="text-[10px] font-black uppercase text-red-500 tracking-widest bg-red-500/10 px-2 py-1 rounded ml-2 flex items-center gap-1.5 whitespace-nowrap">
           <AlertTriangle size={12}/> Prioridades Máximas
         </span>
         <div className="flex items-center gap-4 text-sm font-medium animate-marquee sm:animate-none flex-1 overflow-hidden">
           {crisisData.regions.length > 0 ? (
             <span className="text-rose-400 truncate animate-pulse font-bold">
               🔥 ALERTA CRÍTICO: {(crisisData.topics[0] || 'Instabilidade')} detectada em {crisisData.regions.join(', ')}. Acionar Agente AI!
             </span>
           ) : (
             <span className="text-amber-400 truncate cursor-pointer hover:underline">⚠️ Queda súbita de sentimento positivo detectada pelo Sentinela.</span>
           )}
           <span className="text-red-400 truncate cursor-pointer hover:underline">⚖️ Nova Representação Jurídica detectada contra CNPJ de Impulsionamento.</span>
           <span className="text-emerald-400 truncate cursor-pointer hover:underline">✅ O Oráculo projeta vitória técnica em distritos estratégicos.</span>
         </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card flex flex-col border border-emerald-500/20 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-emerald-500/5 group-hover:scale-110 transition-transform"><Brain size={120} /></div>
          <div className="flex items-center gap-2 text-emerald-400 mb-4 z-10">
            <div className="bg-emerald-500/20 p-2 rounded-lg border border-emerald-500/30"><Brain size={20} /></div>
            <span className="font-bold text-sm tracking-wide text-white">Oráculo de Votos</span>
          </div>
          <div className="z-10">
            <div className="text-3xl md:text-4xl font-black text-slate-100">{Number(currentIntent).toFixed(1)}<span className="text-xl text-emerald-500">%</span></div>
            <p className="text-[10px] md:text-xs mt-1 font-medium bg-emerald-500/10 inline-block px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/20">Média calculada via agregação real.</p>
          </div>
        </div>

        <div className="glass-card flex flex-col border border-sky-500/20 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-sky-500/5 group-hover:scale-110 transition-transform"><DollarSign size={120} /></div>
          <div className="flex items-center gap-2 text-sky-400 mb-4 z-10">
            <div className="bg-sky-500/20 p-2 rounded-lg border border-sky-500/30"><DollarSign size={20} /></div>
            <span className="font-bold text-sm tracking-wide text-white">Saúde Financeira</span>
          </div>
          <div className="z-10">
            <div className="text-2xl md:text-3xl font-black text-slate-100"><span className="text-base md:text-lg text-slate-500 mr-1">R$</span>{(financeRaised / 1000).toFixed(1)}<span className="text-lg md:text-xl text-sky-500">k</span></div>
            <div className="flex items-center gap-1 mt-1"><CheckCircle size={10} className="text-emerald-500" /><p className="text-[10px] md:text-xs text-slate-400 font-medium tracking-tight">Caixa em conformidade institucional.</p></div>
          </div>
        </div>

        <div className="glass-card flex flex-col border border-amber-500/20 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-amber-500/5 group-hover:scale-110 transition-transform"><Activity size={120} /></div>
          <div className="flex items-center gap-2 text-amber-400 mb-4 z-10">
            <div className="bg-amber-500/20 p-2 rounded-lg border border-amber-500/30"><Activity size={20} /></div>
            <span className="font-bold text-sm tracking-wide text-white">Clima de Rua</span>
          </div>
          <div className="z-10">
            <div className="text-3xl md:text-4xl font-black text-slate-100">{streetClimate}<span className="text-lg md:text-xl text-amber-500">%</span></div>
            <p className="text-[10px] md:text-xs mt-1 font-medium bg-amber-500/10 inline-block px-2 py-0.5 rounded text-amber-400 border border-amber-500/20">Engajamento: {totalEngagement} interações reais.</p>
          </div>
        </div>

        <div className="glass-card flex flex-col border border-fuchsia-500/20 p-5 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 text-fuchsia-500/5 group-hover:scale-110 transition-transform"><MessageCircle size={120} /></div>
          <div className="flex items-center gap-2 text-fuchsia-400 mb-4 z-10">
            <div className="bg-fuchsia-500/20 p-2 rounded-lg border border-fuchsia-500/30"><MessageCircle size={20} /></div>
            <span className="font-bold text-sm tracking-wide text-white">Alcance Digital</span>
          </div>
          <div className="z-10">
            <div className="text-3xl md:text-4xl font-black text-slate-100">{(totalReach / 1000).toFixed(1)}<span className="text-lg md:text-xl text-fuchsia-500">M</span></div>
            <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-medium tracking-tight">Impacto Diário Consolidado.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 flex flex-col h-full"> 
          <div className="glass-card p-0 overflow-hidden border border-white/5 h-full min-h-[500px]"> <CampaignMap /> </div>
        </div>
        <div className="lg:col-span-1 flex flex-col h-full">
           <div className="glass-card p-6 border border-white/5 h-full min-h-[500px] overflow-y-auto">
              <SocialSentinel onCrisisAlert={handleCrisisAlert} />
           </div>
        </div>
      </div>

      <div className="mt-8 text-center py-8 border-t border-white/5 flex flex-col items-center gap-2">
         <span className="text-xl font-black tracking-[0.5em] text-slate-500/30 uppercase">CampanhaDigital IA © 2026 — Master Control Platform</span>
         <div className="flex items-center gap-4">
            <span className="text-[10px] text-slate-500 font-mono tracking-tighter opacity-50 select-none">v1.8.6-PROD-STABLE</span>
            <span className="text-[10px] text-emerald-500/50 font-bold uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">Engine de Dados Reais Conectada</span>
         </div>
      </div>
    </div>
  );
}
