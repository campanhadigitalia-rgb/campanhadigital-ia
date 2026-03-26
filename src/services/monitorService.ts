// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Monitor Service (Orquestrador Central)
//  Coordena todos os ciclos de monitoramento e expõe uma interface
//  única para a UI disparar atualizações manuais ou configurar
//  monitoramento automático via polling.
// ──────────────────────────────────────────────────────────────
import { logger } from '../utils/logger';
import type { Campaign } from '../types';

import {
  fetchCandidateNews,
  fetchCompetitorNews,
  fetchAllNewsFeeds,
  saveMonitoringItems,
} from './newsMonitorService';

import { runSocialMonitoringCycle } from './socialMonitorService';
import { runLegalMonitoringCycle }  from './tseIntegrationService';

export type MonitoringModule = 'news' | 'social' | 'legal' | 'all';

export interface MonitoringRunResult {
  module: MonitoringModule;
  itemsSaved: number;
  duration: number;
  errors: string[];
}

// ── Ciclo Principal ────────────────────────────────────────────

/**
 * Executa um ciclo completo de monitoramento para a campanha dada.
 * @param campaign  Campanha ativa
 * @param modules   Quais módulos rodar (default: todos)
 */
export async function runMonitoringCycle(
  campaign: Campaign,
  modules: MonitoringModule[] = ['all'],
): Promise<MonitoringRunResult[]> {
  const runAll = modules.includes('all');
  const results: MonitoringRunResult[] = [];
  const start = Date.now();

  logger.info(`[MonitorService] Iniciando ciclo de monitoramento para campanha "${campaign.name}"...`);

  // ── Notícias ──
  if (runAll || modules.includes('news')) {
    const t0     = Date.now();
    const errors: string[] = [];
    let   saved  = 0;
    try {
      const [candidateNews, competitorNews, feedNews] = await Promise.all([
        fetchCandidateNews(campaign),
        fetchCompetitorNews(campaign),
        fetchAllNewsFeeds(campaign),
      ]);

      const allNews = [...candidateNews, ...competitorNews, ...feedNews];
      saved = await saveMonitoringItems(allNews);

      logger.info(`[MonitorService] Notícias: ${saved} itens salvos.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      logger.error('[MonitorService] Erro no módulo Notícias:', err);
    }
    results.push({ module: 'news', itemsSaved: saved, duration: Date.now() - t0, errors });
  }

  // ── Social ──
  if (runAll || modules.includes('social')) {
    const t0     = Date.now();
    const errors: string[] = [];
    let   saved  = 0;
    try {
      await runSocialMonitoringCycle(campaign);
      saved = 1; // social items são salvos internamente pelo serviço
      logger.info('[MonitorService] Ciclo social concluído.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      logger.error('[MonitorService] Erro no módulo Social:', err);
    }
    results.push({ module: 'social', itemsSaved: saved, duration: Date.now() - t0, errors });
  }

  // ── Legal / Oficial ──
  if (runAll || modules.includes('legal')) {
    const t0     = Date.now();
    const errors: string[] = [];
    let   saved  = 0;
    try {
      await runLegalMonitoringCycle(campaign);
      saved = 1;
      logger.info('[MonitorService] Ciclo legal concluído.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      logger.error('[MonitorService] Erro no módulo Legal/Oficial:', err);
    }
    results.push({ module: 'legal', itemsSaved: saved, duration: Date.now() - t0, errors });
  }

  const totalMs = Date.now() - start;
  logger.info(`[MonitorService] Ciclo completo em ${totalMs}ms.`);
  return results;
}

// ── Auto-polling ───────────────────────────────────────────────

let _pollingTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Inicia o polling automático de monitoramento.
 * @param campaign      Campanha ativa
 * @param intervalMs    Intervalo em ms (default: 30 minutos)
 * @param modules       Módulos a monitorar
 */
export function startAutoMonitoring(
  campaign: Campaign,
  intervalMs = 30 * 60 * 1000,
  modules: MonitoringModule[] = ['all'],
): void {
  stopAutoMonitoring();
  logger.info(`[MonitorService] Auto-monitoring iniciado. Intervalo: ${intervalMs / 60000} min.`);

  const tick = async () => {
    await runMonitoringCycle(campaign, modules).catch(err =>
      logger.error('[MonitorService] Erro no ciclo automático:', err),
    );
    _pollingTimer = setTimeout(tick, intervalMs);
  };

  // Roda imediatamente na primeira vez, depois agenda
  tick();
}

/**
 * Para o polling automático.
 */
export function stopAutoMonitoring(): void {
  if (_pollingTimer) {
    clearTimeout(_pollingTimer);
    _pollingTimer = null;
    logger.info('[MonitorService] Auto-monitoring parado.');
  }
}
