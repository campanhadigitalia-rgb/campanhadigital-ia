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
  } catch {
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

export interface BroadcastPayload {
  phones?: string[];
  text?: string;
  [key: string]: unknown;
}

/**
 * Integração Real com a API Cloud do WhatsApp Business (Meta).
 * Envia uma mensagem de template (ou texto livre) para os contatos associados às células.
 */
export async function dispatchPlatformBroadcast(cellIds: string[], contentPayload: BroadcastPayload): Promise<boolean> {
  const token = import.meta.env.VITE_META_ACCESS_TOKEN || '';
  const phoneNumberId = import.meta.env.VITE_WHATSAPP_PHONE_ID || '';
  
  if (!token || !phoneNumberId) {
    console.warn('[WhatsApp] Token ou Phone ID ausentes. Broadcast bloqueado pelas credenciais.');
    return false;
  }

  // Em um cenário real, o sistema buscaria os números reais de telefone associados aos cellIds no Firestore.
  console.log(`[WhatsApp] Resolvendo contatos das células informadas: ${cellIds.join(', ')}`);
  
  const targetPhones = contentPayload.phones || [];
  if (targetPhones.length === 0) {
    console.warn('[WhatsApp] Nenhum telefone alvo fornecido. Broadcast cancelado.');
    return false;
  }

  const messageText = contentPayload.text || 'Mensagem da Campanha';

  try {
    const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
    
    // Dispara em paralelo para todos os fones da célula
    const requests = targetPhones.map((phone: string) => {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: messageText }
        })
      });
    });

    const responses = await Promise.all(requests);
    const success = responses.every(res => res.ok);
    
    if (success) {
      console.log(`[WhatsApp] Broadcast enviado com sucesso para ${targetPhones.length} contatos.`);
    } else {
      console.error('[WhatsApp] Falha parcial/total no envio do Broadcast via Meta API.');
    }
    
    return success;
  } catch (error) {
    console.error('[WhatsApp] Erro de rede ao conectar à API da Meta:', error);
    return false;
  }
}
