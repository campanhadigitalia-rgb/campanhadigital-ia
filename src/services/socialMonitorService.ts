// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Social Monitor Service
//  Monitoramento de redes sociais via MCP (Manus) e X via RSS proxy.
//  Meta (Instagram/Facebook): delegado ao Manus AI via MCP queue.
//  X (Twitter): busca via proxy Nitter RSS (fallback: Manus).
// ──────────────────────────────────────────────────────────────
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { sendMCPMessage } from './mcp';
import { logger } from '../utils/logger';
import type { MonitoringItem, Campaign } from '../types';

const CORS_PROXY   = 'https://api.allorigins.win/get?url=';
// Instâncias públicas Nitter (X RSS sem login)
const NITTER_INSTANCES = [
  'https://nitter.privacydev.net',
  'https://nitter.poast.org',
];

// ── X / Twitter ───────────────────────────────────────────────

/**
 * Tenta buscar menções no X via Nitter RSS (sem API key).
 * Testa cada instância pública até encontrar uma que responda.
 */
export async function fetchXMentions(
  keyword: string,
  campaign: Campaign,
  maxItems = 10,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  for (const instance of NITTER_INSTANCES) {
    try {
      const searchUrl = `${instance}/search/rss?q=${encodeURIComponent(keyword)}&f=tweets`;
      const proxyUrl  = `${CORS_PROXY}${encodeURIComponent(searchUrl)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = await res.json() as { contents: string };
      const parser = new DOMParser();
      const xml    = parser.parseFromString(data.contents, 'text/xml');
      const items  = Array.from(xml.querySelectorAll('item')).slice(0, maxItems);

      if (items.length === 0) continue;

      return items.map((item) => ({
        campaign_id:   campaign.id,
        type:          'social',
        platform:      'x_rss',
        subject:       'candidate',
        title:         item.querySelector('title')?.textContent?.trim()       ?? '',
        summary:       (item.querySelector('description')?.textContent ?? '').replace(/<[^>]+>/g, '').substring(0, 280),
        url:           item.querySelector('link')?.textContent?.trim()        ?? undefined,
        relatedPerson: keyword,
        fetchedAt:     new Date(),
        processed:     false,
      }));
    } catch {
      logger.warn(`[SocialMonitor] Nitter instance ${instance} falhou. Tentando próxima...`);
    }
  }

  logger.warn('[SocialMonitor] Todos os Nitter falharam. Delegando ao Manus via MCP.');
  return [];
}

// ── Meta (Instagram / Facebook) via Manus MCP ────────────────

/**
 * Enfileira uma busca de menções no Instagram/Facebook via Manus AI (MCP).
 * O Manus processará a tarefa e retornará os resultados atualizando
 * o documento em mcp_queue com status='done'.
 */
export async function queueMetaMentionsSearch(
  keyword: string,
  campaign: Campaign,
  platforms: ('instagram' | 'facebook')[] = ['instagram', 'facebook'],
): Promise<string> {
  const msgId = await sendMCPMessage(
    campaign.id,
    'manus_social_search',
    {
      keyword,
      platforms,
      max_results: 20,
      callback_collection: COLLECTIONS.MONITORING_ITEMS,
      item_template: {
        campaign_id: campaign.id,
        type:        'social',
        subject:     'candidate',
        relatedPerson: keyword,
      },
    },
    'monitor-service',
  );
  logger.info(`[SocialMonitor] Busca Meta enfileirada via MCP. ID: ${msgId}`);
  return msgId;
}

/**
 * Enfileira uma busca de menções no X via Manus AI (fallback quando Nitter não está disponível).
 */
export async function queueXMentionsSearch(
  keyword: string,
  campaign: Campaign,
): Promise<string> {
  return sendMCPMessage(
    campaign.id,
    'manus_social_search',
    {
      keyword,
      platforms: ['x_twitter'],
      max_results: 20,
      callback_collection: COLLECTIONS.MONITORING_ITEMS,
    },
    'monitor-service',
  );
}

// ── Orquestrador Social ───────────────────────────────────────

/**
 * Roda o ciclo completo de monitoramento social para a campanha:
 * 1. Busca menções no X via Nitter (fallback: Manus)
 * 2. Enfileira busca Meta (Instagram/Facebook) no Manus
 * 3. Salva resultados do X diretamente no Firestore
 */
export async function runSocialMonitoringCycle(campaign: Campaign): Promise<void> {
  if (!campaign.identity?.name) {
    logger.warn('[SocialMonitor] Campanha sem identidade definida. Pulando ciclo social.');
    return;
  }

  const candidateName = campaign.identity.name;
  const competitors   = campaign.competitors ?? [];

  // 1. Busca X (Nitter RSS) para o candidato
  const xItems = await fetchXMentions(candidateName, campaign);
  if (xItems.length > 0) {
    await Promise.allSettled(
      xItems.map(item =>
        addDoc(collection(db, COLLECTIONS.MONITORING_ITEMS), {
          ...item,
          fetchedAt: serverTimestamp(),
        }),
      ),
    );
    logger.info(`[SocialMonitor] ${xItems.length} menções X salvas para ${candidateName}.`);
  }

  // 2. Busca X para concorrentes
  for (const comp of competitors) {
    const compItems = await fetchXMentions(comp.name, campaign, 5);
    if (compItems.length > 0) {
      await Promise.allSettled(
        compItems.map(item =>
          addDoc(collection(db, COLLECTIONS.MONITORING_ITEMS), {
            ...item,
            subject: 'competitor',
            relatedPerson: comp.name,
            fetchedAt: serverTimestamp(),
          }),
        ),
      );
    }
  }

  // 3. Enfileira pesquisa Meta via Manus (assíncrono, não bloqueia)
  await queueMetaMentionsSearch(candidateName, campaign).catch(err =>
    logger.warn('[SocialMonitor] Falha ao enfileirar busca Meta:', err),
  );

  logger.info('[SocialMonitor] Ciclo de monitoramento social concluído.');
}
