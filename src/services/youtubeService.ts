// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — YouTube Service
//  Busca vídeos por keyword (candidato, oponentes, temas).
//  Monitora canais de TV brasileira.
//  API Key gratuita: 10.000 units/dia via Google Cloud Console.
// ──────────────────────────────────────────────────────────────
import { logger } from '../utils/logger';
import type { MonitoringItem, Campaign } from '../types';
import { canCallService, recordCall } from '../utils/billingMonitor';

// Canais de TV brasileira pré-definidos
export const TV_CHANNELS: Record<string, string> = {
  'Globo News':    'UCKv-UzAVMhZnJBx4aTdDHmg',
  'Band News':     'UCI81iq4E0cHgJpUf6D1kW-Q',
  'Record News':   'UCrEjq_ImPhB9W-5nGmRGVMg',
  'SBT News':      'UC_UbfpPv0_ugYMtwRjlfhHg',
  'CNN Brasil':    'UC6mHtOgBYFNKCq7sZjFqJrg',
  'GloboNews 2':   'UCq1GAbBRG1CGxmMtVCExP0g',
};

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

interface YTSearchItem {
  id: { videoId: string };
  snippet: { title: string; description: string; publishedAt: string; channelTitle: string };
}

/**
 * Busca vídeos no YouTube por keyword.
 * Precisa de VITE_YOUTUBE_API_KEY (mesma Google Cloud / AI Studio).
 */
export async function searchYouTube(
  keyword: string,
  campaign: Campaign,
  apiKey: string,
  rateLimitMode: import('../utils/billingMonitor').RateLimitMode = 'normal',
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!apiKey) {
    logger.warn('[YouTube] API Key não configurada.');
    return [];
  }

  const check = canCallService('youtube', rateLimitMode);
  if (!check.allowed) {
    logger.info(`[YouTube] Throttled: ${check.reason}`);
    return [];
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: keyword,
      type: 'video',
      order: 'date',
      relevanceLanguage: 'pt',
      regionCode: 'BR',
      maxResults: String(maxItems),
      key: apiKey,
    });

    const res = await fetch(`${BASE_URL}/search?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { items?: YTSearchItem[] };
    recordCall('youtube', keyword, `${(data.items ?? []).length} videos`);

    return (data.items ?? []).map(item => ({
      campaign_id: campaign.id,
      type: 'news' as const,
      platform: 'youtube' as const,
      subject: 'candidate' as const,
      title: item.snippet.title,
      summary: `${item.snippet.channelTitle}: ${item.snippet.description.slice(0, 200)}`,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      fetchedAt: new Date(item.snippet.publishedAt),
      processed: false,
    }));
  } catch (err) {
    logger.error('[YouTube] Search error:', err);
    return [];
  }
}

/**
 * Busca vídeos recentes de canais de TV brasileira.
 */
export async function fetchTVChannels(
  campaign: Campaign,
  apiKey: string,
  channelIds: string[] = Object.values(TV_CHANNELS),
  rateLimitMode: import('../utils/billingMonitor').RateLimitMode = 'normal',
  maxPerChannel = 3,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!apiKey || channelIds.length === 0) return [];

  const check = canCallService('youtube', rateLimitMode);
  if (!check.allowed) {
    logger.info(`[YouTube] TV fetch throttled: ${check.reason}`);
    return [];
  }

  const results: Omit<MonitoringItem, 'id'>[] = [];

  await Promise.allSettled(
    channelIds.slice(0, 5).map(async channelId => {
      try {
        const params = new URLSearchParams({
          part: 'snippet',
          channelId,
          type: 'video',
          order: 'date',
          maxResults: String(maxPerChannel),
          key: apiKey,
        });
        const res = await fetch(`${BASE_URL}/search?${params}`, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return;

        const data = await res.json() as { items?: YTSearchItem[] };
        recordCall('youtube', `channel:${channelId}`, `${(data.items ?? []).length} videos`);

        for (const item of (data.items ?? [])) {
          // Filtra por candidato se possível
          const relevantText = (item.snippet.title + item.snippet.description).toLowerCase();
          const name = campaign.identity?.name?.toLowerCase() ?? '';
          if (name && !relevantText.includes(name.split(' ')[0].toLowerCase())) continue;

          results.push({
            campaign_id: campaign.id,
            type: 'news' as const,
            platform: 'youtube' as const,
            subject: 'candidate' as const,
            title: `📺 ${item.snippet.channelTitle}: ${item.snippet.title}`,
            summary: item.snippet.description.slice(0, 250),
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            fetchedAt: new Date(item.snippet.publishedAt),
            processed: false,
          });
        }
      } catch (err) {
        logger.warn(`[YouTube] Canal ${channelId} error:`, err);
      }
    }),
  );

  return results;
}
