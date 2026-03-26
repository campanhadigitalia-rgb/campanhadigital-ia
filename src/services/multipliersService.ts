import { collection, query, where, getDocs } from 'firebase/firestore';
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
  breakdown: {
    fundoPartidario: number;
    doacaoFisica: number;
    vaquinha: number;
    eventos: number;
    outros: number;
  };
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
  const emptyStats: FinanceStats = {
    campaign_id: campaignId,
    month: 'Atual',
    monthlyGoal: 0,
    raised: 0,
    breakdown: {
      fundoPartidario: 0,
      doacaoFisica: 0,
      vaquinha: 0,
      eventos: 0,
      outros: 0
    }
  };

  try {
     const stats = { ...emptyStats };
     
     // 1. Transações manuais (Livro Caixa)
     const qTransactions = query(collection(db, 'finance_transactions'), where('campaign_id', '==', campaignId));
     const snapT = await getDocs(qTransactions);
     
     snapT.docs.forEach(d => {
       const data = d.data();
       if (data.type === 'income') {
         const amount = Number(data.amount) || 0;
         stats.raised += amount;
         const cat = data.category as keyof typeof stats.breakdown;
         if (stats.breakdown[cat] !== undefined) {
           stats.breakdown[cat] += amount;
         } else {
           stats.breakdown.outros += amount;
         }
       }
     });

     // 2. Vaquinhas e Eventos (Fundraising Campaigns)
     const qFund = query(collection(db, `campaigns/${campaignId}/fundraisingCampaigns`));
     const snapF = await getDocs(qFund);
     
     snapF.docs.forEach(d => {
       const data = d.data();
       const raised = Number(data.raised) || 0;
       const type = data.type as 'vaquinha' | 'evento';
       
       stats.raised += raised;
       if (type === 'vaquinha') stats.breakdown.vaquinha += raised;
       else if (type === 'evento') stats.breakdown.eventos += raised;
     });

     return stats;
  } catch (error) {
     console.error("Erro fetchFinanceStats:", error);
     return emptyStats;
  }
}
