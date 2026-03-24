import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';

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
  campaign_id: string;
  createdAt?: any;
}

export async function fetchEvents(campaignId: string): Promise<CampaignEvent[]> {
  try {
    const q = query(
      collection(db, COLLECTIONS.EVENTS || 'events'), 
      where('campaign_id', '==', campaignId),
      orderBy('date', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CampaignEvent));
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}

export async function addCampaignEvent(event: Omit<CampaignEvent, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.EVENTS || 'events'), {
    ...event,
    createdAt: serverTimestamp()
  });
  return docRef.id;
}

export async function updateCampaignEvent(id: string, updates: Partial<CampaignEvent>): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EVENTS || 'events', id);
  await updateDoc(docRef, updates);
}

export async function deleteCampaignEvent(id: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.EVENTS || 'events', id);
  await deleteDoc(docRef);
}

// Otimizador simulado via heurística de API de Mapas
export function simulateTravelTime(origin: string, dest: string): { distance: string, time: string } {
  const hash = (origin + dest).length;
  const dist = 50 + (hash * 15);
  const hrs = Math.floor(dist / 80);
  const mins = Math.round(((dist / 80) - hrs) * 60);
  return {
    distance: `${dist} km`,
    time: `${hrs}h ${mins}m`
  };
}

// Cruzamento de Inteligência Artificial: Busca o epicentro de crise social e sugere agenda
export async function suggestStrategicStop(campaignId: string): Promise<CampaignEvent> {
  try {
    // 1. Busca os temas quentes do real SocialSentinel/sentiment_metrics se existir
    // Para simplificar agora, mantemos a lógica de mock baseada em trends, mas com campaign_id
    const res = await fetch('/mockTrends.json');
    const trends: any[] = await res.json();
    
    const critical = trends.filter(t => t.sentiment === 'negativo' || t.sentiment === 'critico');
    const target = critical.find(t => t.sentiment === 'critico') || critical[0];

    return {
      id: `ai-temp-${Date.now()}`,
      title: 'Operação de Contenção (Sugestão IA)',
      type: 'Visita Técnica',
      city: target ? target.region : 'Porto Alegre',
      date: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'Estratégico',
      campaign_id: campaignId,
      stats: {
        votes2022: 'Histórico Volátil',
        localLeader: 'Coordenadoria Regional',
        mainComplaint: target ? target.topic : 'Não Mapeado'
      }
    };
  } catch {
    return {
      id: 'ai-fallback',
      title: 'Visita Estratégica Regional',
      type: 'Visita Técnica',
      city: 'Centro Regional',
      date: new Date().toISOString(),
      status: 'Estratégico',
      campaign_id: campaignId,
      stats: { votes2022: 'N/A', localLeader: 'Regional', mainComplaint: 'Mapeamento Geral' }
    };
  }
}

