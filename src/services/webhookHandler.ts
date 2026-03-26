/**
 * Handler de Webhooks para Integração com Meta (Instagram/Facebook).
 * Implementa o fluxo de verificação 'hub.verify_token'.
 */
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { logger } from '../utils/logger';

/**
 * Validação de Webhook da Meta (GET).
 * O Token deve ser configurado no Dashboard de Desenvolvedor da Meta.
 */
export function verifyMetaWebhook(params: {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}, expectedToken: string): string | null {
  const mode = params['hub.mode'];
  const token = params['hub.verify_token'];
  const challenge = params['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === expectedToken) {
      logger.info('Webhook Meta verificado com sucesso.');
      return challenge || 'OK';
    } else {
      logger.warn('Falha na verificação do Webhook Meta: Token incorreto.');
    }
  }
  return null;
}

/** Estrutura genérica de payload recebido da Meta (Instagram/Facebook). */
export interface MetaWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      value?: Record<string, unknown>;
      field?: string;
    }>;
  }>;
  [key: string]: unknown;
}

/**
 * Processamento de Notificações Recebidas (POST).
 */
export async function handleMetaMessage(payload: MetaWebhookPayload, campaignId: string) {
  try {
    logger.debug('Novo payload de Webhook recebido.', payload);
    
    // Persistência na coleção social_mentions para análise posterior pela AI
    const mentionsRef = collection(db, 'social_mentions');
    await addDoc(mentionsRef, {
      campaign_id: campaignId,
      platform: 'Meta',
      raw_payload: payload,
      processed: false,
      receivedAt: serverTimestamp(),
    });

    logger.info('Menção social salva via Webhook.');
  } catch (error) {
    logger.error('Erro ao processar Webhook Meta:', error);
  }
}
