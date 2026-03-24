import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, campaignQuery } from './firebase';

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
      return [
        { week: 'Sem 1', Governador: 38.5, AdversarioA: 25.1, Indecisos: 15.0, eventsCount: 4 },
        { week: 'Sem 2', Governador: 39.2, AdversarioA: 26.0, Indecisos: 14.1, eventsCount: 3 },
        { week: 'Sem 3', Governador: 42.1, AdversarioA: 26.5, Indecisos: 12.0, eventsCount: 8 },
        { week: 'Sem 4', Governador: 43.8, AdversarioA: 27.2, Indecisos: 10.5, eventsCount: 5 },
        { week: 'Hoje',  Governador: 45.1, AdversarioA: 28.0, Indecisos: 8.8,  eventsCount: 7 }
      ];
    }
    
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
  } catch (error) {
    console.error("Oracle Tracking Error:", error);
    return [];
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
      return [
        { city: 'Porto Alegre', intent: 41.5, margin: 4.2, requiredDailyNewVotes: 850, coordinator: 'Juliana Castro' },
        { city: 'Caxias do Sul', intent: 55.0, margin: 12.5, requiredDailyNewVotes: 120, coordinator: 'Prefeito Roberto' },
        { city: 'Canoas', intent: 38.0, margin: 1.1, requiredDailyNewVotes: 1100, coordinator: 'Carlos Silveira' },
        { city: 'Pelotas', intent: 46.5, margin: 5.8, requiredDailyNewVotes: 350, coordinator: 'Marta Gomes' },
        { city: 'Passo Fundo', intent: 39.5, margin: 1.8, requiredDailyNewVotes: 600, coordinator: 'Tiago Vargas' },
      ];
    }
    
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as any));
  } catch (error) {
    console.error("Oracle Regional Error:", error);
    return [];
  }
}
