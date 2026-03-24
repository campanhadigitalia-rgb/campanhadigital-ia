import { collection, query, where, getDocs, getAggregateFromServer, sum } from 'firebase/firestore';
import { db } from './firebase';

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
  try {
    const q = query(collection(db, 'multipliers'), where('campaign_id', '==', campaignId));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Leader));
  } catch (e) {
    console.error("Erro ao buscar multipliers: ", e);
    return [];
  }
}

export async function fetchFinanceStats(campaignId: string): Promise<FinanceStats> {
  try {
     const q = query(collection(db, 'finances'), where('campaign_id', '==', campaignId));
     const snap = await getAggregateFromServer(q, {
       raised: sum('amount')
     });
     return {
       campaign_id: campaignId,
       month: 'Atual',
       monthlyGoal: 500000,
       raised: snap.data().raised || 0
     };
  } catch (e) {
     return { campaign_id: campaignId, month: 'Atual', monthlyGoal: 500000, raised: 0 };
  }
}
