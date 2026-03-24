import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface MilitancyCell {
  id: string;
  name: string;
  region: string;
  memberCount: number;
  estimatedReach: number;
  status: 'Online' | 'Aquecendo' | 'Offline';
  webhookId: string;
  campaign_id?: string;
}

export interface FAQItem {
  id: string;
  trigger: string;
  text: string;
}

export async function fetchMilitancyCells(campaignId: string): Promise<MilitancyCell[]> {
  try {
    const q = query(collection(db, 'militancy_cells'), where('campaign_id', '==', campaignId));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MilitancyCell));
  } catch(e) {
    return [];
  }
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
