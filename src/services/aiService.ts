export type Sentiment = 'positivo' | 'neutro' | 'negativo' | 'critico';

export interface Mention {
  id: string;
  region: string;
  topic: string;
  platform: 'Twitter' | 'Facebook' | 'Instagram';
  text: string;
  sentiment?: Sentiment;
  timestamp: string;
}

export interface AIReply {
  persona: 'Conciliador' | 'Técnico' | 'Firme';
  text: string;
}

/**
 * Simula a chamada para um LLM (Meta Llama 3 via Replicate/Groq ou Manus AI) 
 * para inferir o sentimento da menção baseada na PLN local.
 */
export async function analyzeSentiment(text: string): Promise<Sentiment> {
  return new Promise(resolve => {
    setTimeout(() => {
      const lower = text.toLowerCase();
      if (lower.includes('😡') || lower.includes('incompetente') || lower.includes('urgentes') || lower.includes('absurdo')) return resolve('critico');
      if (lower.includes('ruim') || lower.includes('difícil') || lower.includes('sofrendo')) return resolve('negativo');
      if (lower.includes('boa') || lower.includes('parabéns') || lower.includes('seguro') || lower.includes('bom')) return resolve('positivo');
      resolve('neutro');
    }, 400); // Simulando delay de rede da IA API
  });
}

/**
 * Usa a persona do Governador para tecer rascunhos de resposta (RAG Prompt Template).
 * Gera 3 matizes diferentes de resposta para o gabinete aprovar.
 */
export async function generateResponseOptions(mention: Mention): Promise<AIReply[]> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { 
          persona: 'Conciliador', 
          text: `Compreendemos profundamente a sua frustração em ${mention.region} sobre o tema de ${mention.topic.toLowerCase()}. O gabinete está de portas abertas e equipes já foram designadas para buscar uma solução conjunta com a comunidade local.` 
        },
        { 
          persona: 'Técnico', 
          text: `A temática de ${mention.topic.toLowerCase()} integra o atual plano de metas. O repasse da rubrica orçamentária para ${mention.region} já foi empenhado e a execução técnica ocorrerá em 3 fases, com início previsto para este quadrimestre.` 
        },
        { 
          persona: 'Firme', 
          text: `Os gargalos históricos de ${mention.topic.toLowerCase()} no estado são complexos. Diferente de gestões passadas que fizeram promessas vazias em ${mention.region}, nosso governo não foge da responsabilidade institucional e resolverá isso com rigor orçamentário e transparência.` 
        }
      ]);
    }, 1200); // Demora mais para gerar o texto simulando LLM Decode
  });
}
