// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Hook: useCampaignQuery
//  Wrapper seguro para queries Firestore com campaign_id
// ──────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  onSnapshot,
  orderBy,
  type DocumentData,
  type CollectionReference,
} from 'firebase/firestore';
import { campaignQuery } from '../services/firebase';
import { useCampaign } from '../context/CampaignContext';

/**
 * Hook que realtime-escuta uma coleção filtrada pelo campaign_id ativo.
 * Garante o isolamento multi-tenant em todos os módulos.
 */
export function useCampaignQuery<T extends { id: string }>(
  colRef: CollectionReference<DocumentData>,
  orderByField = 'createdAt',
): { data: T[]; loading: boolean; error: string | null } {
  const { campaignId } = useCampaign();
  const [data, setData]       = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = campaignQuery(colRef, campaignId, orderBy(orderByField, 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as T));
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [campaignId, colRef, orderByField]);

  return { data, loading, error };
}
