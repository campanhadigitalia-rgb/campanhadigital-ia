import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Script de Injeção de Dados Base Iniciais.
 * Gera as 5 principais mesorregiões do Rio Grande do Sul zeradas no Firestore
 * para iniciar a operação do mapa de calor.
 */
export async function seedRSRegions(campaignId: string) {
  if (!campaignId) throw new Error("ID de Campanha inválido. Autentique-se primeiro.");
  
  const regions = [
    { name: 'Metropolitana de Porto Alegre', positive: 0, negative: 0, critical: 0, neutral: 0 },
    { name: 'Serra Gaúcha', positive: 0, negative: 0, critical: 0, neutral: 0 },
    { name: 'Sul (Pelotas e Rio Grande)', positive: 0, negative: 0, critical: 0, neutral: 0 },
    { name: 'Fronteira Oeste', positive: 0, negative: 0, critical: 0, neutral: 0 },
    { name: 'Noroeste (Passo Fundo)', positive: 0, negative: 0, critical: 0, neutral: 0 }
  ];

  const batch = writeBatch(db);

  regions.forEach((region, index) => {
    // Usamos um identificador padronizado anexado ao campaignId
    const regionId = `rs-meso-${index + 1}`;
    const ref = doc(db, 'heatmap_data', regionId);
    
    batch.set(ref, {
       ...region,
       campaign_id: campaignId,
       updatedAt: new Date()
    }, { merge: true }); // Merge protege dados caso exista
  });

  await batch.commit();
}
