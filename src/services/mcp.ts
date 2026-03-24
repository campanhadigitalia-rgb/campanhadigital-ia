// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — MCP (Model Context Protocol) Service
//  Interface para comunicação com agentes autônomos da Meta / Manus AI
// ──────────────────────────────────────────────────────────────
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import type { MCPMessage } from '../types';

/**
 * Envia uma mensagem para a fila MCP do Firestore.
 * O agente autônomo (Manus AI / Meta) observará esta coleção
 * e responderá atualizando o documento com status='done' e response.
 */
export async function sendMCPMessage(
  campaignId: string,
  action: string,
  payload: Record<string, unknown>,
  source = 'user',
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTIONS.MCP_QUEUE), {
    campaign_id: campaignId,
    source,
    action,
    payload,
    status: 'pending',
    timestamp: serverTimestamp(),
    response: null,
  });
  return ref.id;
}

/**
 * Assina em tempo real as mensagens MCP de uma campanha.
 * Retorna a função de unsubscribe.
 */
export function subscribeMCPMessages(
  campaignId: string,
  callback: (msgs: MCPMessage[]) => void,
): () => void {
  const q = query(
    collection(db, COLLECTIONS.MCP_QUEUE),
    where('campaign_id', '==', campaignId),
    orderBy('timestamp', 'desc'),
  );

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<MCPMessage, 'id'>),
    }));
    callback(msgs);
  });
}

/**
 * Registro de ações MCP disponíveis.
 * Exposto via HTTP endpoint ou diretamente consumido por agentes.
 */
export const MCP_ACTIONS = {
  SYNC_CONTACTS:    'sync_contacts',
  GENERATE_REPORT:  'generate_report',
  IMPORT_CSV:       'import_csv',
  SEND_WHATSAPP:    'send_whatsapp',
  ANALYZE_NETWORK:  'analyze_network',
  SCHEDULE_VISIT:   'schedule_visit',
  MANUS_SEARCH:     'manus_deep_search', // Para busca de oponentes/notícias
  TRE_CANDIDACY:    'tre_status_check',  // Para crawler do TRE
} as const;

export type MCPAction = typeof MCP_ACTIONS[keyof typeof MCP_ACTIONS];
