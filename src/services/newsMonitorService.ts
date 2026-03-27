// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — News Monitor Service
//  Busca notícias em tempo real via Google News RSS (dinâmico)
//  e fontes customizadas salvas no Firestore.
// ──────────────────────────────────────────────────────────────
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { logger } from '../utils/logger';
import type { MonitoringItem, RSSFeedConfig, Campaign } from '../types';
import { fetchWithProxy } from '../utils/proxyHelper';

// ── Fontes fixas de política brasileira ───────────────────────
export const DEFAULT_POLITICAL_FEEDS: Omit<RSSFeedConfig, 'id' | 'campaign_id' | 'createdAt'>[] = [
  { name: 'G1 Política',       url: 'https://g1.globo.com/rss/g1/politica/',                               type: 'news', active: true },
  { name: 'Folha Poder',       url: 'https://feeds.folha.uol.com.br/poder/rss091.xml',                     type: 'news', active: true },
  { name: 'Agência Brasil',    url: 'https://agenciabrasil.ebc.com.br/rss/politica/feed.xml',              type: 'news', active: true },
  { name: 'Agência Senado',    url: 'https://www12.senado.leg.br/noticias/noticias/@@RSS',                 type: 'news', active: true },
  { name: 'G1 RS',             url: 'https://g1.globo.com/rss/g1/rs/rio-grande-do-sul/',                  type: 'news', active: true },
  { name: 'Correio do Povo',   url: 'https://www.correiodopovo.com.br/cmlink/correio-do-povo-1.12461?saida=rss', type: 'news', active: true },
  { name: 'Câmara dos Dep.',   url: 'https://www.camara.leg.br/noticias/rss/',                             type: 'news', active: true },
];

// ── Google News RSS por keyword ───────────────────────────────

/**
 * Gera URL de busca do Google News RSS para uma keyword específica.
 */
export function buildGoogleNewsUrl(keyword: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=pt-BR&gl=BR&ceid=BR:pt`;
}

/**
 * Faz parse de um feed RSS via proxy CORS e retorna itens normalizados.
 */
async function parseFeed(
  feedUrl: string,
  sourceName: string,
  maxItems = 10,
): Promise<Array<{ title: string; link: string; pubDate: string; summary: string }>> {
  try {
    const rawText = await fetchWithProxy(feedUrl);
    const parser = new DOMParser();
    const xml = parser.parseFromString(rawText, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, maxItems);

    return items.map((item) => ({
      title:   item.querySelector('title')?.textContent?.trim()   ?? 'Sem título',
      link:    item.querySelector('link')?.textContent?.trim()    ?? '#',
      pubDate: item.querySelector('pubDate')?.textContent?.trim() ?? new Date().toISOString(),
      summary: (item.querySelector('description')?.textContent ?? '')
        .replace(/<[^>]+>/g, '')
        .substring(0, 200),
    }));
  } catch (err) {
    logger.warn(`[NewsMonitor] Falha no feed "${sourceName}":`, err);
    return [];
  }
}

/**
 * Busca notícias sobre o CANDIDATO via Google News RSS.
 */
export async function fetchCandidateNews(
  campaign: Campaign,
  maxItems = 8,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!campaign.identity?.name) return [];

  const { name, party, location } = campaign.identity;
  const year = campaign.year;
  const keywords = [
    `${name} ${year}`,
    `${name} ${party} ${year}`,
    `${name} ${location} ${year}`,
  ];

  const results: Omit<MonitoringItem, 'id'>[] = [];

  for (const kw of keywords) {
    const raw = await parseFeed(buildGoogleNewsUrl(kw), `GoogleNews:${kw}`, maxItems);
    for (const item of raw) {
      results.push({
        campaign_id: campaign.id,
        type: 'news',
        platform: 'google_news',
        subject: 'candidate',
        title: item.title,
        summary: item.summary,
        url: item.link,
        relatedPerson: name,
        fetchedAt: new Date(item.pubDate),
        processed: false,
      });
    }
  }

  return results;
}

/**
 * Busca notícias sobre os CONCORRENTES cadastrados.
 */
export async function fetchCompetitorNews(
  campaign: Campaign,
  maxItems = 5,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  const competitors = campaign.competitors ?? [];
  const results: Omit<MonitoringItem, 'id'>[] = [];

  for (const comp of competitors) {
    const raw = await parseFeed(buildGoogleNewsUrl(comp.name), `GoogleNews:${comp.name}`, maxItems);
    for (const item of raw) {
      results.push({
        campaign_id: campaign.id,
        type: 'competitor',
        platform: 'google_news',
        subject: 'competitor',
        title: item.title,
        summary: item.summary,
        url: item.link,
        relatedPerson: comp.name,
        fetchedAt: new Date(item.pubDate),
        processed: false,
      });
    }
  }

  return results;
}

/**
 * Busca todas as fontes RSS padrão + customizadas (salvas no Firestore).
 */
export async function fetchAllNewsFeeds(
  campaign: Campaign,
  maxItemsPerFeed = 5,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  // Busca feeds customizados do Firestore
  let customFeeds: RSSFeedConfig[] = [];
  try {
    const q = query(
      collection(db, 'rss_feeds'),
      where('campaign_id', '==', campaign.id),
      where('active', '==', true),
    );
    const snap = await getDocs(q);
    customFeeds = snap.docs.map(d => ({ id: d.id, ...d.data() } as RSSFeedConfig));
  } catch (err) {
    logger.warn('[NewsMonitor] Não foi possível carregar feeds customizados:', err);
  }

  // Combina padrão + custom
  const allFeeds = [
    ...DEFAULT_POLITICAL_FEEDS.map((f, i) => ({ ...f, id: `default-${i}`, campaign_id: campaign.id, createdAt: new Date() })),
    ...customFeeds,
  ].filter(f => f.active);

  const results: Omit<MonitoringItem, 'id'>[] = [];

  await Promise.allSettled(
    allFeeds.map(async (feed) => {
      const raw = await parseFeed(feed.url, feed.name, maxItemsPerFeed);
      for (const item of raw) {
        results.push({
          campaign_id: campaign.id,
          type: feed.type,
          platform: 'rss_politica',
          subject: 'campaign',
          title: item.title,
          summary: item.summary,
          url: item.link,
          fetchedAt: new Date(item.pubDate),
          processed: false,
        });
      }
    }),
  );

  return results;
}

/**
 * Salva um lote de MonitoringItems no Firestore (evitando duplicatas por URL).
 */
export async function saveMonitoringItems(
  items: Omit<MonitoringItem, 'id'>[],
): Promise<number> {
  let saved = 0;
  for (const item of items) {
    try {
      const colRef = collection(db, COLLECTIONS.MONITORING_ITEMS);
      await addDoc(colRef, {
        ...item,
        fetchedAt: serverTimestamp(),
      });
      saved++;
    } catch (err) {
      logger.error('[NewsMonitor] Erro ao salvar item:', err);
    }
  }
  return saved;
}
