import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import type { Contact, Campaign } from '../types';

/**
 * Service to handle data inheritance from previous campaigns.
 */

/**
 * Clones multipliers/leaders from a legacy campaign to the current one.
 */
export async function cloneCampaignContacts(legacyId: string, targetId: string, userId: string): Promise<number> {
  const q = query(
    collection(db, COLLECTIONS.CONTACTS), 
    where('campaign_id', '==', legacyId),
    where('tags', 'array-contains', 'Multiplicador')
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  const batch = writeBatch(db);
  let count = 0;

  snap.docs.forEach(d => {
    const data = d.data() as Contact;
    const newRef = doc(collection(db, COLLECTIONS.CONTACTS));
    
    // Create a copy for the new campaign
    batch.set(newRef, {
      ...data,
      id: newRef.id,
      campaign_id: targetId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      cloned_from: legacyId // For tracking
    });
    count++;
  });

  await batch.commit();
  return count;
}

/**
 * Simulated service to fetch historical results for a campaign.
 * In a real scenario, this would poll a TSE-like database or a specific 'historical_results' collection.
 */
export async function getHistoricalResults(campaignId: string): Promise<Campaign['historical_results']> {
  console.log('Fetching historical results for campaign:', campaignId);
  // Simulating fetching real performance of a legacy campaign
  // This could be hardcoded for the demo or fetched from a 'results' collection
  return [
    { city: 'Porto Alegre', real_votes: 350000, real_percentage: 42.5, opponent_percentage: 38.0 },
    { city: 'Caxias do Sul', real_votes: 115000, real_percentage: 51.2, opponent_percentage: 42.5 },
    { city: 'Canoas', real_votes: 82000, real_percentage: 45.1, opponent_percentage: 46.2 },
    { city: 'Pelotas', real_votes: 78000, real_percentage: 48.5, opponent_percentage: 44.0 },
    { city: 'Passo Fundo', real_votes: 45000, real_percentage: 43.8, opponent_percentage: 47.1 },
  ];
}
