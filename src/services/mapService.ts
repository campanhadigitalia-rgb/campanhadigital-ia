// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { db, campaignQuery } from './firebase';

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

export async function fetchMapData(_campaignId: string, period: MapPeriod): Promise<MapPoint[]> {
  // Simulação de busca no Firestore para o protótipo inicial (Fake Data 2022/2024 vs 2026)
  // Futuramente, habilitar quando o Cloud Firestore estiver com os dados inseridos: 
  /*
  const q = campaignQuery(collection(db, 'map_data'), campaignId, where('period', '==', period));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as MapPoint));
  */

  return new Promise((resolve) => {
    setTimeout(() => {
      if (period === 'history') {
        resolve([
          // Fake data 2022/2024 - maior volume
          { id: 'h1', lat: -30.0346, lng: -51.2177, weight: 1.0, type: 'engagement', city: 'Porto Alegre' },
          { id: 'h2', lat: -29.1683, lng: -51.1794, weight: 0.8, type: 'engagement', city: 'Caxias do Sul' },
          { id: 'h3', lat: -31.7654, lng: -52.3376, weight: 0.5, type: 'engagement', city: 'Pelotas' },
          { id: 'h4', lat: -29.6842, lng: -53.8069, weight: 0.7, type: 'engagement', city: 'Santa Maria' },
          { id: 'h5', lat: -28.2612, lng: -52.4083, weight: 0.6, type: 'engagement', city: 'Passo Fundo' },
          { id: 'h6', lat: -29.7549, lng: -51.1503, weight: 0.9, type: 'engagement', city: 'São Leopoldo' },
          // Líderes históricos
          { id: 'l1', lat: -30.0346, lng: -51.2177, type: 'leader', city: 'Porto Alegre', name: 'João Silva (Coord Histórico)' },
          { id: 'l2', lat: -29.1683, lng: -51.1794, type: 'leader', city: 'Caxias do Sul', name: 'Maria Souza' },
        ]);
      } else {
        // Cenário Atual 2026
        resolve([
          { id: 'c1', lat: -30.0346, lng: -51.2177, weight: 0.9, type: 'engagement', city: 'Porto Alegre' },
          { id: 'c2', lat: -29.9178, lng: -51.1834, weight: 0.6, type: 'engagement', city: 'Canoas' },
          { id: 'c3', lat: -29.6842, lng: -53.8069, weight: 0.4, type: 'engagement', city: 'Santa Maria' },
          { id: 'l3', lat: -30.0346, lng: -51.2177, type: 'leader', city: 'Porto Alegre', name: 'Marcos (Coord Digital)' },
          { id: 'l4', lat: -29.9178, lng: -51.1834, type: 'leader', city: 'Canoas', name: 'Fernanda (Regional)' },
        ]);
      }
    }, 600);
  });
}
