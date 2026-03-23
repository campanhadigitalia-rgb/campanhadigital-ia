// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { db, campaignQuery } from './firebase';

export interface Leader {
  id: string;
  name: string;
  role: 'Vereador' | 'Prefeito' | 'Líder Comunitário' | 'Militante';
  city: string;
  estimatedVotes: number;
  loyalty: 'Fiel' | 'Balançando' | 'Afastado';
  digitalEngagement: number; // Ranking score 0-1000
  campaign_id: string;       // Tenant Isolation
}

export interface FinanceStats {
  campaign_id: string;
  month: string;
  monthlyGoal: number;
  raised: number;
}

export async function fetchMultipliers(campaignId: string): Promise<Leader[]> {
  /*
   * Privacidade Multi-Tenant Garantida:
   * Num ambiente real, as Rules do Firestore e a query abaixo barram dados cruciais:
   * const q = campaignQuery(collection(db, 'multipliers'), campaignId);
   * const snap = await getDocs(q);
   */

  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock Data isolado (fake data para a campaignId atual)
      resolve([
        { id: '1', name: 'Juliana Castro', role: 'Vereador', city: 'Porto Alegre', estimatedVotes: 8500, loyalty: 'Fiel', digitalEngagement: 950, campaign_id: campaignId },
        { id: '2', name: 'Carlos Silveira', role: 'Líder Comunitário', city: 'Canoas', estimatedVotes: 1200, loyalty: 'Balançando', digitalEngagement: 420, campaign_id: campaignId },
        { id: '3', name: 'Prefeito Roberto', role: 'Prefeito', city: 'Caxias do Sul', estimatedVotes: 35000, loyalty: 'Fiel', digitalEngagement: 880, campaign_id: campaignId },
        { id: '4', name: 'Tiago Vargas', role: 'Militante', city: 'Passo Fundo', estimatedVotes: 400, loyalty: 'Afastado', digitalEngagement: 110, campaign_id: campaignId },
        { id: '5', name: 'Marta Gomes', role: 'Líder Comunitário', city: 'Pelotas', estimatedVotes: 3000, loyalty: 'Fiel', digitalEngagement: 760, campaign_id: campaignId },
      ]);
    }, 400);
  });
}

export async function fetchFinanceStats(campaignId: string): Promise<FinanceStats> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        campaign_id: campaignId,
        month: 'Setembro/2026',
        monthlyGoal: 500000,
        raised: 320500,
      });
    }, 300);
  });
}
