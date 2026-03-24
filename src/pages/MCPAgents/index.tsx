import { Bot, LineChart, Scale, Zap } from 'lucide-react';

const AGENTS = [
  {
    id: 'responder',
    name: 'Agente de Resposta Rápida',
    description: 'Monitora menções e Whatsapp, sugerindo respostas automáticas e mantendo a voz do candidato alinhada com as diretrizes da campanha.',
    icon: MessageCircleIcon,
    status: 'Em Desenvolvimento',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/20'
  },
  {
    id: 'data',
    name: 'Agente de Análise de Dados',
    description: 'Cruza dados do CRM, enquetes e demografia do Oráculo para identificar tendências, sugerir rotas e otimizar investimentos da campanha.',
    icon: LineChart,
    status: 'Planejado',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20'
  },
  {
    id: 'legal',
    name: 'Agente Jurídico',
    description: 'Audita a geração de conteúdo, valida regras do TSE em tempo real e emite alertas sobre prazos eleitorais e conformidade de propagandas.',
    icon: Scale,
    status: 'Esqueleto',
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
  return (
    <div className="flex flex-col gap-6 h-full">
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

            <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Zap size={14} className={agent.color} />
                <span>Integração pendente</span>
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
