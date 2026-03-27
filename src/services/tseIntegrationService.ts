// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — TSE Integration Service
//  Cobre: TSE (DivulgaCand), Diário Oficial (Federal + RS),
//  e TRE via Gemini com Google Search grounding.
// ──────────────────────────────────────────────────────────────
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from './firebase';
import { logger } from '../utils/logger';
import { sanitizeForPrompt } from '../utils/inputSanitizer';
import type { MonitoringItem, Campaign, CandidacyInfo } from '../types';
import { fetchWithProxy } from '../utils/proxyHelper';

const API_KEY    = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI      = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

// ── Diário Oficial ─────────────────────────────────────────────

const DOU_FEEDS: Record<string, string> = {
  'DOU Extra':   'https://www.in.gov.br/servicos/rss-do-dou/extra',
  'DOU S1':      'https://www.in.gov.br/servicos/rss-do-dou/secao1',
  'DOU S3':      'https://www.in.gov.br/servicos/rss-do-dou/secao3',
  'DOE-RS':      'https://diariooficial.rs.gov.br/rss/',
};

/**
 * Busca publicações no Diário Oficial que mencionem keywords da campanha.
 */
export async function fetchOfficialGazetteMentions(
  campaign: Campaign,
  maxItemsPerFeed = 20,
): Promise<Omit<MonitoringItem, 'id'>[]> {
  if (!campaign.identity?.name) return [];

  const keywords = [
    campaign.identity.name.toLowerCase(),
    campaign.identity.party?.toLowerCase() ?? '',
  ].filter(Boolean);

  const results: Omit<MonitoringItem, 'id'>[] = [];

  await Promise.allSettled(
    Object.entries(DOU_FEEDS).map(async ([feedName, feedUrl]) => {
      try {
        const rawText = await fetchWithProxy(feedUrl);
        const parser = new DOMParser();
        const xml    = parser.parseFromString(rawText, 'text/xml');
        const items  = Array.from(xml.querySelectorAll('item')).slice(0, maxItemsPerFeed);

        for (const item of items) {
          const title   = item.querySelector('title')?.textContent?.toLowerCase() ?? '';
          const desc    = item.querySelector('description')?.textContent?.toLowerCase() ?? '';
          const content = title + ' ' + desc;

          // Filtra apenas publicações relevantes para a campanha
          if (!keywords.some(kw => kw && content.includes(kw))) continue;

          results.push({
            campaign_id: campaign.id,
            type:        'official',
            platform:    feedName.includes('RS') ? 'dou_rs' : 'dou',
            subject:     'candidate',
            title:       item.querySelector('title')?.textContent?.trim() ?? 'Publicação Oficial',
            summary:     (item.querySelector('description')?.textContent ?? '').replace(/<[^>]+>/g, '').substring(0, 300),
            url:         item.querySelector('link')?.textContent?.trim() ?? undefined,
            fetchedAt:   new Date(),
            processed:   false,
          });
        }
      } catch (err) {
        logger.warn(`[TSEService] Falha no DOU feed "${feedName}":`, err);
      }
    }),
  );

  return results;
}

// ── TSE — DivulgaCandContas ────────────────────────────────────

export interface TSECandidateResult {
  found: boolean;
  candidacyInfo?: CandidacyInfo;
  accountsSummary?: {
    totalIncome: number;
    totalExpense: number;
    hasPendencies: boolean;
  };
  rawData?: Record<string, unknown>;
}

/**
 * Busca candidato pelo CNPJ da campanha na API pública do TSE.
 */
export async function fetchTSEByCnpj(
  cnpj: string,
  year: number,
  campaign: Campaign,
): Promise<TSECandidateResult> {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return { found: false };

  try {
    const target  = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/cnpj/${digits}`;
    const rawText = await fetchWithProxy(target);
    const data    = JSON.parse(rawText) as Record<string, unknown>;
    const cand    = (data?.candidatura ?? data) as Record<string, unknown>;

    if (!cand?.nomeUrna && !cand?.nome) return { found: false };

    const seqCand = String(cand.sequencialCandidato ?? '');
    const ufCand  = String(cand.sgUE ?? cand.sgUf ?? '');
    const anoCand = Number(cand.anoEleicao ?? year);

    const candidacyInfo: CandidacyInfo = {
      nomeUrna: String(cand.nomeUrna ?? cand.nome ?? ''),
      cargo:    String(cand.descricaoCargo ?? ''),
      partido:  String(cand.siglaPartido ?? cand.nomePartido ?? ''),
      situacao: String(cand.descricaoSituacaoTotalizacao ?? cand.descricaoSituacao ?? ''),
      numero:   String(cand.numeroEleitoral ?? cand.numero ?? ''),
      uf:       ufCand,
      ano:      anoCand,
      link:     seqCand
        ? `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${anoCand}/${ufCand}/${seqCand}`
        : 'https://divulgacandcontas.tse.jus.br/divulga/#/',
    };

    // Salva no Firestore como item de monitoramento legal
    await addDoc(collection(db, COLLECTIONS.MONITORING_ITEMS), {
      campaign_id: campaign.id,
      type:        'legal',
      platform:    'tse',
      subject:     'candidate',
      title:       `TSE: Situação de Candidatura — ${candidacyInfo.nomeUrna}`,
      summary:     `${candidacyInfo.cargo} | ${candidacyInfo.partido} | Status: ${candidacyInfo.situacao}`,
      url:         candidacyInfo.link,
      rawData:     data,
      fetchedAt:   serverTimestamp(),
      processed:   true,
    });

    return { found: true, candidacyInfo, rawData: data };
  } catch (err) {
    logger.error('[TSEService] Erro ao buscar candidato no TSE:', err);
    return { found: false };
  }
}

/**
 * Busca lista de eleições disponíveis no TSE (health check + metadata).
 */
export async function fetchTSEElections(): Promise<Array<{ id: number; nome: string; ano: number }>> {
  try {
    const res = await fetch(
      'https://divulgacandcontas.tse.jus.br/divulga/rest/v1/eleicao/eleicoes',
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const data = await res.json() as { eleicoes?: Array<{ id: number; nome: string; dataEleicao: string }> };
    return (data.eleicoes ?? []).map(e => ({
      id:   e.id,
      nome: e.nome,
      ano:  new Date(e.dataEleicao).getFullYear(),
    }));
  } catch {
    return [];
  }
}

// ── TRE via Gemini com Google Search Grounding ────────────────

export interface TRESearchResult {
  isAI: boolean;
  isRateLimited: boolean;
  summary: string;
  items: Array<{ title: string; snippet: string; url?: string }>;
}

/**
 * Usa Gemini com Google Search grounding para buscar processos no TRE.
 * Mais robusto que CORS proxy pois o TRE não tem API pública.
 */
export async function searchTREByName(
  candidateName: string,
  year: number,
  uf = 'RS',
): Promise<TRESearchResult> {
  const empty = { isAI: false, isRateLimited: false, summary: '', items: [] };
  if (!genAI) return empty;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      // @ts-expect-error — googleSearch é experimental mas funcional no SDK
      tools: [{ googleSearch: {} }],
    });

    const safeName = sanitizeForPrompt(candidateName);

    const prompt = `Como um analista jurídico eleitoral sênior, pesquise no Google por processos eleitorais, notificações, decisões do TRE-${uf} e notícias de jurisprudência envolvendo o candidato "${safeName}" especificamente relacionadas à eleição de ${year}.
Retorne um JSON com o seguinte formato:
{
  "summary": "resumo técnico de 2-3 frases do que foi encontrado",
  "items": [
    { "title": "título do processo ou notícia", "snippet": "trecho relevante com data", "url": "url se disponível" }
  ]
}
Se não encontrar nada relevante para o ano ${year}, mencione no resumo.
Responda APENAS com JSON válido.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```'))     text = text.replace(/^```/, '').replace(/```$/, '').trim();

    const parsed = JSON.parse(text) as { summary: string; items: Array<{ title: string; snippet: string; url?: string }> };
    return { isAI: true, isRateLimited: false, ...parsed };
  } catch (err) {
    const isRate = String(err).includes('429') || String(err).toLowerCase().includes('quota');
    logger.warn('[TSEService] Gemini TRE Search error:', err);
    return { ...empty, isRateLimited: isRate };
  }
}

// ── Orquestrador Legal ────────────────────────────────────────

/**
 * Roda o ciclo completo de monitoramento legal/oficial para a campanha.
 */
export async function runLegalMonitoringCycle(campaign: Campaign): Promise<void> {
  logger.info('[TSEService] Iniciando ciclo de monitoramento legal...');

  // 1. Diário Oficial
  const douItems = await fetchOfficialGazetteMentions(campaign);
  if (douItems.length > 0) {
    await Promise.allSettled(
      douItems.map(item =>
        addDoc(collection(db, COLLECTIONS.MONITORING_ITEMS), {
          ...item,
          fetchedAt: serverTimestamp(),
        }),
      ),
    );
    logger.info(`[TSEService] ${douItems.length} publicações do DOU salvas.`);
  }

  // 2. TRE via Gemini (se identidade configurada)
  if (campaign.identity?.name) {
    const treResult = await searchTREByName(campaign.identity.name, campaign.year, campaign.identity.state || 'RS');
    if (treResult.isAI && treResult.items.length > 0) {
      for (const item of treResult.items) {
        await addDoc(collection(db, COLLECTIONS.MONITORING_ITEMS), {
          campaign_id: campaign.id,
          type:        'legal',
          platform:    'tre',
          subject:     'candidate',
          title:       item.title,
          summary:     item.snippet,
          url:         item.url,
          relatedPerson: campaign.identity.name,
          fetchedAt:   serverTimestamp(),
          processed:   true,
        }).catch(() => null);
      }
      logger.info(`[TSEService] ${treResult.items.length} resultados TRE processados via Gemini.`);
    }
  }

  logger.info('[TSEService] Ciclo de monitoramento legal concluído.');
}
