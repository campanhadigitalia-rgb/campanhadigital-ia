import { useState } from 'react';
import { Bot, LineChart, Scale, Zap, Loader2, Send } from 'lucide-react';
import { generateResponseOptions } from '../../services/aiService';
import { useCampaign } from '../../context/CampaignContext';
import type { AIReply } from '../../types';

const AGENTS = [
  {
    id: 'responder',
    name: 'Agente de Resposta Rápida',
    description: 'Gera rascunhos oficiais de resposta a comentários e situações de campanha, utilizando a voz e diretrizes configuradas do candidato (Gemini 1.5 Pro).',
    icon: MessageCircleIcon,
    status: 'Operacional',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/50'
  },
  {
    id: 'data',
    name: 'Agente de Análise de Dados',
    description: 'Cruzará dados do CRM, enquetes e demografia do Oráculo para identificar tendências, sugerir rotas e otimizar investimentos da campanha.',
    icon: LineChart,
    status: 'Em Desenvolvimento',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  {
    id: 'legal',
    name: 'Agente Jurídico',
    description: 'Auditará a geração de conteúdo, validará regras do TSE em tempo real e emitirá alertas sobre prazos eleitorais e conformidade de propagandas.',
    icon: Scale,
    status: 'Aguardando Integração',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20'
  }
];


function MessageCircleIcon({ size, className }: { size: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/>
    </svg>
  );
}

export default function MCPAgents() {
  const { activeCampaign } = useCampaign();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [replies, setReplies] = useState<AIReply[]>([]);

  const handleAgentAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    
    setLoading(true);
    setReplies([]);
    try {
      const options = await generateResponseOptions({
        id: 'sim-1',
        region: 'Capital',
        topic,
        platform: 'Twitter',
        text: topic,
        timestamp: new Date().toISOString()
      }, activeCampaign?.identity);
      setReplies(options);
    } finally {
      setLoading(false);
      setTopic('');
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Bot className="text-indigo-400" />
          Agentes Autônomos MCP
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Painel de controle dos agentes de inteligência artificial alocados para otimizar as operações da sua campanha.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {AGENTS.map(agent => (
          <div key={agent.id} className={`glass-card p-6 flex flex-col gap-4 border ${agent.border}`}>
            <div className="flex items-start justify-between">
              <div className={`p-3 rounded-xl ${agent.bg}`}>
                <agent.icon size={28} className={agent.color} />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${agent.bg} ${agent.color}`}>
                {agent.status}
              </span>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-slate-200 mb-2">{agent.name}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {agent.description}
              </p>
            </div>

            {/* Simulação Interativa para o Agente de Resposta Rápida */}
            {agent.id === 'responder' && (
               <div className="flex flex-col gap-3 mt-2 bg-black/20 p-4 rounded-lg border border-white/5">
                 <p className="text-xs uppercase text-slate-400 font-bold tracking-wider">Simulador de Resposta</p>
                 <form onSubmit={handleAgentAction} className="flex flex-col gap-2">
                   <textarea
                     value={topic}
                     onChange={e => setTopic(e.target.value)}
                     disabled={loading}
                     placeholder="Ex: Reclamação sobre buracos na via..."
                     className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none h-16"
                   />
                   <button 
                     type="submit" 
                     disabled={!topic.trim() || loading}
                     className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm py-2 rounded-md transition-colors flex justify-center items-center gap-2"
                   >
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                     Gerar Rascunhos OFICIAIS
                   </button>
                 </form>

                 {replies.length > 0 && (
                   <div className="mt-4 flex flex-col gap-3">
                     {replies.map((reply, idx) => (
                       <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-md p-3 text-sm">
                         <span className="text-[10px] uppercase text-indigo-400 font-bold block mb-1">
                           Persona: {reply.persona}
                         </span>
                         <p className="text-slate-300 italic">"{reply.text}"</p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            )}

            <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Zap size={14} className={agent.color} />
                <span>{agent.id === 'responder' ? 'Motor AI Ativo' : 'Integração pendente'}</span>
              </div>
              <button className="text-sm font-medium text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded">
                Configurar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
