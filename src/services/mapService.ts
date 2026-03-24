import { collection, where, getDocs } from 'firebase/firestore';
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
      return [];
    }
    
    return snap.docs.map(d => ({ ...d.data(), id: d.id } as MapPoint));
  } catch (error) {
    console.error("Error fetching map data:", error);
    return [];
  }
}
