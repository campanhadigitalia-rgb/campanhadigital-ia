// import { collection, query, where, getDocs } from 'firebase/firestore';
// import { db, campaignQuery } from './firebase';

export interface CampaignEvent {
  id: string;
  title: string;
  type: 'Comício' | 'Reunião' | 'Jantar' | 'Visita Técnica' | 'Live/Digital';
  city: string;
  date: string;
  status: 'Confirmado' | 'Pendente' | 'Estratégico';
  stats: {
    votes2022: string;
    localLeader: string;
    mainComplaint: string;
  };
}

export async function fetchEvents(_campaignId: string): Promise<CampaignEvent[]> {
  // Simulação de busca no Cloud Firestore (`events` collection)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'evt-1',
          title: 'Encontro de Lideranças Empresariais',
          type: 'Reunião',
          city: 'Caxias do Sul',
          date: new Date(Date.now() + 86400000).toISOString(), // amanhã
          status: 'Confirmado',
          stats: {
            votes2022: '142.503 (1º Turno)',
            localLeader: 'Prefeito Adiló',
            mainComplaint: 'Logística / Pedágios na Serra'
          }
        },
        {
          id: 'evt-2',
          title: 'Jantar de Arrecadação Regional',
          type: 'Jantar',
          city: 'Passo Fundo',
          date: new Date(Date.now() + 86400000 * 3).toISOString(),
          status: 'Confirmado',
          stats: {
            votes2022: '65.210 (1º Turno)',
            localLeader: 'Deputado Base',
            mainComplaint: 'Agronegócio / Seca'
          }
        },
      ]);
    }, 500);
  });
}

// Otimizador simulado via heurística de API de Mapas
export function simulateTravelTime(origin: string, dest: string): { distance: string, time: string } {
  const hash = (origin + dest).length;
  // Simples heurística baseada no nome da cidade para mockar
  const dist = 50 + (hash * 15);
  const hrs = Math.floor(dist / 80);
  const mins = Math.round(((dist / 80) - hrs) * 60);
  return {
    distance: `${dist} km`,
    time: `${hrs}h ${mins}m`
  };
}

// Cruzamento de Inteligência Artificial: Busca o epicentro de crise social e sugere agenda
export async function suggestStrategicStop(): Promise<CampaignEvent> {
  return new Promise(async (resolve) => {
    try {
      // 1. Busca os temas quentes do SocialSentinel
      const res = await fetch('/mockTrends.json');
      const trends: any[] = await res.json();
      
      // 2. Filtra negativo/crítico
      const critical = trends.filter(t => t.sentiment === 'negativo' || t.sentiment === 'critico');
      
      // 3. Pega o tema de maior urgência (ex: primeiro da lista crítico)
      const target = critical.find(t => t.sentiment === 'critico') || critical[0];

      // 4. Monta o evento estratégico de neutralização
      setTimeout(() => {
        resolve({
          id: `ai-sug-${Date.now()}`,
          title: 'Operação de Contenção e Diálogo',
          type: 'Visita Técnica',
          city: target ? target.region : 'Porto Alegre',
          date: new Date(Date.now() + 86400000 * 2).toISOString(), // daqui a 2 dias
          status: 'Estratégico',
          stats: {
            votes2022: 'Histórico Volátil (Atenção)',
            localLeader: 'Coordenadoria (Avisar urgência)',
            mainComplaint: target ? target.topic : 'Não Mapeado'
          }
        });
      }, 1500); // Simulando AI think time
    } catch {
      // Fallback
      resolve({
        id: 'ai-sug-fallback',
        title: 'Visita Técnica de Resgate',
        type: 'Visita Técnica',
        city: 'Fronteira Sul',
        date: new Date().toISOString(),
        status: 'Estratégico',
        stats: { votes2022: 'N/A', localLeader: 'Regional', mainComplaint: 'Infraestrutura' }
      });
    }
  });
}
