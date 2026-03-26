// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — useMonitorFeed Hook
//  Consome monitoring_items do Firestore em tempo real via onSnapshot.
// ──────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../services/firebase';
import type { MonitoringItem, MonitoringType, MonitoringSubject, MonitoringPlatform } from '../types';

interface UseMonitorFeedOptions {
  campaignId: string;
  type?:      MonitoringType;
  subject?:   MonitoringSubject;
  platform?:  MonitoringPlatform;
  limitCount?: number;
  enabled?:   boolean;
}

interface UseMonitorFeedResult {
  items:   MonitoringItem[];
  loading: boolean;
  error:   string | null;
  /** Total de itens não processados (badge de novidades) */
  unreadCount: number;
}

/**
 * Hook React para consumir o feed de monitoramento em tempo real.
 * Filtra por tipo, assunto e plataforma opcionalmente.
 *
 * @example
 * const { items, loading } = useMonitorFeed({
 *   campaignId: campaign.id,
 *   type: 'news',
 *   limitCount: 20,
 * });
 */
export function useMonitorFeed({
  campaignId,
  type,
  subject,
  platform,
  limitCount = 50,
  enabled    = true,
}: UseMonitorFeedOptions): UseMonitorFeedResult {
  const [items,   setItems]   = useState<MonitoringItem[]>([]);
  const [loading, setLoading] = useState(() => !!(enabled && campaignId));
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !campaignId) {
      return;
    }

    setLoading(true);
    setError(null);

    const constraints: QueryConstraint[] = [
      where('campaign_id', '==', campaignId),
      orderBy('fetchedAt', 'desc'),
      limit(limitCount),
    ];

    if (type)     constraints.push(where('type',     '==', type));
    if (subject)  constraints.push(where('subject',  '==', subject));
    if (platform) constraints.push(where('platform', '==', platform));

    const q = query(
      collection(db, COLLECTIONS.MONITORING_ITEMS),
      ...constraints,
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MonitoringItem, 'id'>),
          // Converte Firestore Timestamp → Date
          fetchedAt: d.data().fetchedAt?.toDate?.() ?? new Date(),
        }));
        setItems(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsub;
  }, [campaignId, type, subject, platform, limitCount, enabled]);

  const unreadCount = useMemo(
    () => items.filter((i) => !i.processed).length,
    [items],
  );

  return { items, loading, error, unreadCount };
}

// ── Convenience hooks ─────────────────────────────────────────

export const useNewsItems = (campaignId: string, n = 30) =>
  useMonitorFeed({ campaignId, type: 'news', limitCount: n });

export const useSocialItems = (campaignId: string, n = 30) =>
  useMonitorFeed({ campaignId, type: 'social', limitCount: n });

export const useLegalItems = (campaignId: string, n = 20) =>
  useMonitorFeed({ campaignId, type: 'legal', limitCount: n });

export const useOfficialItems = (campaignId: string, n = 20) =>
  useMonitorFeed({ campaignId, type: 'official', limitCount: n });

export const useCompetitorItems = (campaignId: string, n = 30) =>
  useMonitorFeed({ campaignId, type: 'competitor', limitCount: n });
