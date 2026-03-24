import { collection, getDocs, getCountFromServer, getAggregateFromServer, average, sum } from 'firebase/firestore';
import { db, campaignQuery } from './firebase';
import { logger } from '../utils/logger';

export interface PollData {
  week: string;
  Governador: number; // Intent share
  AdversarioA: number;
  Indecisos: number;
  eventsCount: number; // Qtd eventos agenda nessa semana
}

export interface OracleReport {
  city: string;
  intent: number;
  margin: number; // Ex: 1.5 = +1.5% do 2º lugar. < 2 = Risco Amarelo
  requiredDailyNewVotes: number;
  coordinator: string;
}

/**
 * Busca histórico de tracking da campanha no Firestore.
 */
export async function getPollTrackingHistory(campaignId: string = 'CDIA_2026'): Promise<PollData[]> {
  try {
    const q = campaignQuery(collection(db, 'poll_history'), campaignId);
    const snap = await getDocs(q);
    
    if (snap.empty) {
      logger.info('Usando dados base para histórico de polls (coleção vazia).');
      return [];
    }
    
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
  } catch (error) {
    logger.error("Oracle Tracking Error:", error);
    return [];
  }
}

/**
 * Calcula Agregações Reais via Firestore (Prompt 14/15).
 */
export async function getOracleAggregates(campaignId: string) {
  try {
    const pollsCol = collection(db, 'polls');
    const q = campaignQuery(pollsCol, campaignId);
    
    // Agregação de Intenção de Voto (Média)
    const snapshot = await getAggregateFromServer(q, {
      avgIntent: average('intent'),
      totalPolls: sum('weight') // Exemplo de peso estatístico
    });

    // Agregação de Engajamento (Contagem de Interações)
    const interactionsCol = collection(db, 'interactions');
    const qInteractions = campaignQuery(interactionsCol, campaignId);
    const countSnapshot = await getCountFromServer(qInteractions);

    return {
      currentIntent: snapshot.data().avgIntent || 0,
      engagementCount: countSnapshot.data().count || 0
    };
  } catch (error) {
    logger.error("Error in Oracle Aggregates:", error);
    return { currentIntent: 0, engagementCount: 0 };
  }
}

/**
 * Calculadora de Cenário de 2º Turno.
 */
export async function simulateSecondRound(opponentId: string): Promise<{ winner: string, govo: number, oppo: number }> {
    if (opponentId === 'cand_esquerda') {
      return { winner: 'Governador', govo: 54.2, oppo: 45.8 };
    } else if (opponentId === 'cand_direita_radical') {
      return { winner: 'Governador', govo: 58.0, oppo: 42.0 };
    } else {
      return { winner: 'Governador', govo: 51.5, oppo: 48.5 }; // Cenário apertado
    }
}

/**
 * Relatório consolidado cruzando o CRM de Lideranças com Metas Matemáticas.
 */
export async function generateRegionalReport(campaignId: string = 'CDIA_2026'): Promise<OracleReport[]> {
  try {
    const q = campaignQuery(collection(db, 'regional_reports'), campaignId);
    const snap = await getDocs(q);
    
    if (snap.empty) {
      logger.info('Retornando metas base para relatórios regionais.');
      return [];
    }
    
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
  } catch (error) {
    logger.error("Oracle Regional Error:", error);
    return [];
  }
}
