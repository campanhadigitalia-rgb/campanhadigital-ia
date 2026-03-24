import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, campaignQuery } from './firebase';

export type MapPeriod = 'current' | 'history';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  weight?: number;       // Para o Heatmap (0 a 1)
  type: 'engagement' | 'leader';
  city: string;
  name?: string;         // Nome do líder
}

/**
 * Busca dados geográficos do Firestore (coleção map_stats).
 * Em caso de falha ou banco vazio, retorna fallback mínimo para evitar tela preta.
 */
export async function fetchMapData(campaignId: string, period: MapPeriod): Promise<MapPoint[]> {
  try {
    const q = campaignQuery(collection(db, 'map_stats'), campaignId, where('period', '==', period));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      if (period === 'current') {
        return [
          { id: 'c1', lat: -30.0346, lng: -51.2177, weight: 0.9, type: 'engagement', city: 'Porto Alegre' }
        ];
      } else {
        return [
          { id: 'h1', lat: -30.0346, lng: -51.2177, weight: 1.0, type: 'engagement', city: 'Porto Alegre' },
          { id: 'l1', lat: -30.0346, lng: -51.2177, type: 'leader', city: 'Porto Alegre', name: 'Coordenação Histórica (RS)' }
        ];
      }
    }
    
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as MapPoint));
  } catch (error) {
    console.error("Error fetching map data:", error);
    return [];
  }
}
