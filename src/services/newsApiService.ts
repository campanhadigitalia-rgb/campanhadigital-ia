// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — NewsAPI & Serper Service
//  NewsAPI.org: 100 req/dia grátis, 70k fontes mundiais
//  Serper.dev:  2.500 buscas grátis/mês (Google Search real)
// ──────────────────────────────────────────────────────────────
import { logger } from '../utils/logger';
import type { MonitoringItem, Campaign } from '../types';
import { canCallService, recordCall, type RateLimitMode } from '../utils/billingMonitor';

const CORS_PROXY = 'https://api.allorigins.win/get?url=';

// ── NewsAPI ────────────────────────────────────────────────────

interface NewsAPIArticle {
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
  source: { name: string };
}

/**
 * Busca notícias via NewsAPI.org (100 req/dia grátis, 70k fontes).
 * Limite em plano dev: apenas últimas 24h.
 */
export async function searchNewsAPI(
  keyword: string,
  campaign: Campaign,
  apiKey: string,
  rateLimitMode: RateLimitMode = 'normal',
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!apiKey) return [];

  const check = canCallService('newsapi', rateLimitMode);
  if (!check.allowed) {
    logger.info(`[NewsAPI] Throttled: ${check.reason}`);
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: keyword,
      language: 'pt',
      sortBy: 'publishedAt',
      pageSize: String(maxItems),
      apiKey,
    });

    const targetUrl = `https://newsapi.org/v2/everything?${params}`;
    // NewsAPI não aceita CORS direto no browser — usa proxy
    const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const wrapper = await res.json() as { contents?: string };
    const data    = JSON.parse(wrapper.contents ?? '{}') as { articles?: NewsAPIArticle[]; status?: string };

    if (data.status !== 'ok') throw new Error('NewsAPI retornou erro');

    recordCall('newsapi', keyword, `${(data.articles ?? []).length} articles`);

    return (data.articles ?? []).slice(0, maxItems).map(article => ({
      campaign_id: campaign.id,
      type: 'news' as const,
      platform: 'rss_custom' as const,
      subject: 'candidate' as const,
      title: article.title,
      summary: article.description ?? article.title,
      url: article.url,
      fetchedAt: new Date(article.publishedAt),
      processed: false,
    }));
  } catch (err) {
    logger.error('[NewsAPI] Search error:', err);
    return [];
  }
}

// ── Serper.dev (Google Search real) ───────────────────────────

interface SerperResult {
  title: string;
  snippet: string;
  link: string;
  date?: string;
}

/**
 * Busca resultados reais do Google via Serper.dev (2.500 grátis/mês).
 * Retorna resultados orgânicos + notícias com fontes reais.
 */
export async function searchSerper(
  keyword: string,
  campaign: Campaign,
  apiKey: string,
  rateLimitMode: RateLimitMode = 'normal',
  type: 'search' | 'news' = 'news',
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!apiKey) return [];

  const check = canCallService('serper', rateLimitMode);
  if (!check.allowed) {
    logger.info(`[Serper] Throttled: ${check.reason}`);
    return [];
  }

  try {
    const res = await fetch(`https://google.serper.dev/${type}`, {
      method: 'POST',
      headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: keyword, gl: 'br', hl: 'pt-br', num: maxItems }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json() as { news?: SerperResult[]; organic?: SerperResult[] };
    const items = (type === 'news' ? data.news : data.organic) ?? [];

    recordCall('serper', keyword, `${items.length} results`);

    return items.slice(0, maxItems).map(item => ({
      campaign_id: campaign.id,
      type: 'news' as const,
      platform: 'google_news' as const,
      subject: 'candidate' as const,
      title: item.title,
      summary: item.snippet,
      url: item.link,
      fetchedAt: item.date ? new Date(item.date) : new Date(),
      processed: false,
    }));
  } catch (err) {
    logger.error('[Serper] Search error:', err);
    return [];
  }
}
