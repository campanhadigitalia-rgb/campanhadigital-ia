export interface MilitancyCell {
  id: string;
  name: string;
  region: string;
  memberCount: number;
  estimatedReach: number;
  status: 'Online' | 'Aquecendo' | 'Offline';
  webhookId: string;
}

export interface FAQItem {
  id: string;
  trigger: string;
  text: string;
}

export async function fetchMilitancyCells(_campaignId: string): Promise<MilitancyCell[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'c1', name: 'Ativistas Serra', region: 'Serra Gaúcha', memberCount: 2450, estimatedReach: 36750, status: 'Online', webhookId: 'wh_serra_992' },
        { id: 'c2', name: 'Aliança Fronteira', region: 'Fronteira Oeste', memberCount: 1800, estimatedReach: 15300, status: 'Online', webhookId: 'wh_front_811' },
        { id: 'c3', name: 'Base POA Central', region: 'Porto Alegre', memberCount: 5200, estimatedReach: 93600, status: 'Online', webhookId: 'wh_poa_555' },
        { id: 'c4', name: 'Multiplicadores Sul', region: 'Pelotas/Rio Grande', memberCount: 890, estimatedReach: 6200, status: 'Aquecendo', webhookId: 'wh_sul_012' }
      ]);
    }, 400);
  });
}

export async function fetchQuickReplies(): Promise<FAQItem[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 'faq1', trigger: 'O que fizemos pela saúde?', text: '🏥 *Saúde em Primeiro Lugar!*\n\nO Governo quitou 100% dos atrasos da saúde deixados pelas gestões antigas. Já investimos mais de R$ 300 milhões no Programa Assistir, garantindo leitos e cirurgias pelo interior afora. \n\nSem mágica, com gestão! 🚀👇\n[Link pro vídeo]' },
        { id: 'faq2', trigger: 'Por que o pedágio subiu?', text: '🛣️ *Sobre as Rodovias:*\n\nNão subimos impostos! O reajuste do pedágio é contratual da inflação (IPCA), mas em troca garantimos duplicações que estavam paradas há 20 anos (como a RSC-287). \n\nPreferimos obra feita do que promessa vazia! ✔️🚜' }
      ]);
    }, 200);
  });
}

/**
 * Simula a conexão com a API Official do WhatsApp Business Cloud ou Twilio
 */
export async function dispatchPlatformBroadcast(_cellIds: string[], _contentPayload: any): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 2500); // 2.5s network delay
  });
}
