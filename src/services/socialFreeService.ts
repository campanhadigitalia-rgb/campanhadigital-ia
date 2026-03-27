// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Social Free Service
//  Fontes 100% gratuitas de redes sociais:
//  Bluesky, Nitter (X/Twitter público), Telegram público, Reddit
// ──────────────────────────────────────────────────────────────
import { logger } from '../utils/logger';
import type { MonitoringItem, Campaign } from '../types';
import { recordCall } from '../utils/billingMonitor';
import { fetchWithProxy } from '../utils/proxyHelper';

// Nitter instances (mirrors públicos sem autenticação)
const NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.privacydev.net',
  'https://nitter.1d4.us',
];

// ── Bluesky AT Protocol (público, sem API key) ─────────────────

/**
 * Busca posts públicos no Bluesky por keyword usando a API pública.
 */
export async function searchBluesky(
  keyword: string,
  campaign: Campaign,
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  try {
    const url = `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(keyword)}&limit=${maxItems}&lang=pt`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { posts?: Array<{ uri: string; record?: { text?: string; createdAt?: string }; author?: { handle: string } }> };
    recordCall('bluesky', keyword, JSON.stringify(data).slice(0, 500));

    return (data.posts ?? []).map(post => ({
      campaign_id: campaign.id,
      type: 'social' as const,
      platform: 'bluesky' as const,
      subject: 'candidate' as const,
      title: `@${post.author?.handle ?? 'bluesky'}: ${(post.record?.text ?? '').slice(0, 80)}`,
      summary: post.record?.text ?? '',
      url: post.uri ? `https://bsky.app/profile/${post.author?.handle}/post/${post.uri.split('/').pop()}` : undefined,
      fetchedAt: new Date(post.record?.createdAt ?? Date.now()),
      processed: false,
    }));
  } catch (err) {
    logger.warn('[SocialFree] Bluesky search error:', err);
    return [];
  }
}

// ── Nitter / X Twitter (RSS público, sem key) ──────────────────

/**
 * Busca posts públicos do X/Twitter via Nitter RSS (workaround gratuito).
 * Não requer API key. Usa instâncias públicas do Nitter.
 */
export async function searchNitter(
  keyword: string,
  campaign: Campaign,
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const feedUrl = `${instance}/search/rss?q=${encodeURIComponent(keyword)}&f=tweets`;
      const rawText = await fetchWithProxy(feedUrl);
      
      const parser = new DOMParser();
      const xml = parser.parseFromString(rawText, 'text/xml');
      const items = Array.from(xml.querySelectorAll('item')).slice(0, maxItems);

      if (items.length === 0) continue;

      recordCall('nitter', keyword, `${items.length} results`);

      return items.map(item => {
        const title = item.querySelector('title')?.textContent?.trim() ?? '';
        const link  = item.querySelector('link')?.textContent?.trim() ?? '';
        const desc  = (item.querySelector('description')?.textContent ?? '').replace(/<[^>]+>/g, '').substring(0, 280);
        const pub   = item.querySelector('pubDate')?.textContent?.trim() ?? new Date().toISOString();
        return {
          campaign_id: campaign.id,
          type: 'social' as const,
          platform: 'nitter' as const,
          subject: 'candidate' as const,
          title: title.slice(0, 100),
          summary: desc,
          url: link || undefined,
          fetchedAt: new Date(pub),
          processed: false,
        };
      });
    } catch (err) {
      logger.warn(`[SocialFree] Nitter ${instance} falhou:`, err);
    }
  }
  return [];
}

// ── Telegram (canais públicos via RSS proxy) ───────────────────

/**
 * Busca mensagens recentes de canais públicos do Telegram.
 * Usa t.me/s/{channel} (versão web pública) + AllOrigins como proxy.
 */
export async function fetchTelegramChannel(
  channelUsername: string,
  campaign: Campaign,
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  try {
    const targetUrl = `https://t.me/s/${channelUsername.replace('@', '')}`;
    const rawText = await fetchWithProxy(targetUrl);

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawText, 'text/html');
    const messages = Array.from(doc.querySelectorAll('.tgme_widget_message_text')).slice(0, maxItems);

    recordCall('telegram_pub', channelUsername, `${messages.length} msgs`);

    return messages.map((el, i) => ({
      campaign_id: campaign.id,
      type: 'social' as const,
      platform: 'telegram_public' as const,
      subject: 'campaign' as const,
      title: `@${channelUsername}: ${(el.textContent ?? '').slice(0, 80)}`,
      summary: (el.textContent ?? '').slice(0, 300),
      url: targetUrl,
      fetchedAt: new Date(Date.now() - i * 60000),
      processed: false,
    }));
  } catch (err) {
    logger.warn(`[SocialFree] Telegram @${channelUsername} error:`, err);
    return [];
  }
}

// ── Reddit (API pública, sem key) ──────────────────────────────

/**
 * Busca posts no Reddit por keyword (via /search.json público).
 */
export async function searchReddit(
  keyword: string,
  campaign: Campaign,
  maxItems = 10,
  subreddit = 'brasil+politica+brasilivre',
): Promise<Omit<MonitoringItem, 'id'>[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(keyword)}&restrict_sr=1&sort=new&limit=${maxItems}&t=week`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CampanhaDigitalIA/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { data?: { children?: Array<{ data: { title: string; selftext: string; url: string; created_utc: number; subreddit: string } }> } };
    recordCall('reddit', keyword, `${(data.data?.children ?? []).length} results`);

    return (data.data?.children ?? []).map(({ data: post }) => ({
      campaign_id: campaign.id,
      type: 'social' as const,
      platform: 'reddit' as const,
      subject: 'candidate' as const,
      title: post.title.slice(0, 120),
      summary: post.selftext.slice(0, 280) || post.title,
      url: `https://reddit.com${post.url}`,
      fetchedAt: new Date(post.created_utc * 1000),
      processed: false,
    }));
  } catch (err) {
    logger.warn('[SocialFree] Reddit search error:', err);
    return [];
  }
}

// ── Orquestrador de redes sociais gratuitas ────────────────────

/**
 * Roda todas as fontes gratuitas de redes sociais para a campanha.
 * Respeita as configurações de canais Telegram e engines ativos.
 */
export async function runSocialFreeMonitoring(
  campaign: Campaign,
  telegramChannels: string[] = [],
  activeEngines: string[] = ['bluesky', 'nitter', 'telegram_pub', 'reddit'],
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!campaign.identity?.name) return [];

  const keyword = `${campaign.identity.name} ${campaign.year}`;
  const results: Omit<MonitoringItem, 'id'>[] = [];

  await Promise.allSettled([
    activeEngines.includes('bluesky') &&
      searchBluesky(keyword, campaign).then(items => results.push(...items)),

    activeEngines.includes('nitter') &&
      searchNitter(keyword, campaign).then(items => results.push(...items)),

    activeEngines.includes('reddit') &&
      searchReddit(keyword, campaign).then(items => results.push(...items)),

    ...telegramChannels
      .filter(() => activeEngines.includes('telegram_pub'))
      .map(ch => fetchTelegramChannel(ch, campaign).then(items => results.push(...items))),
  ]);

  logger.info(`[SocialFree] ${results.length} itens de redes sociais gratuitas coletados.`);
  return results;
}
