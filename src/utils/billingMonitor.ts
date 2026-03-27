// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Billing Monitor + Rate Limiter
//  Rastreia consumo de tokens/chamadas e aplica throttle
//  conforme o regime configurado pelo usuário.
// ──────────────────────────────────────────────────────────────

export type RateLimitMode = 'economico' | 'normal' | 'ilimitado';

/**
 * Preço por 1M tokens (input/output) em USD — estimativa para UI.
 */
const SERVICE_PRICING: Record<string, { inputPer1M: number; outputPer1M: number; dailyLimit?: number; unit: string }> = {
  gemini_pro:    { inputPer1M: 1.25,  outputPer1M: 3.75,  unit: 'tokens' },
  gemini_flash:  { inputPer1M: 0.075, outputPer1M: 0.30,  unit: 'tokens' },
  openai:        { inputPer1M: 0.15,  outputPer1M: 0.60,  unit: 'tokens' },
  perplexity:    { inputPer1M: 0.20,  outputPer1M: 0.20,  unit: 'tokens' },
  groq:          { inputPer1M: 0.0,   outputPer1M: 0.0,   dailyLimit: 14400, unit: 'req' },
  serper:        { inputPer1M: 0.0,   outputPer1M: 0.0,   dailyLimit: 2500,  unit: 'req' },  // free tier
  newsapi:       { inputPer1M: 0.0,   outputPer1M: 0.0,   dailyLimit: 100,   unit: 'req' },  // free devplan
  youtube:       { inputPer1M: 0.0,   outputPer1M: 0.0,   dailyLimit: 10000, unit: 'units' },
  anthropic:     { inputPer1M: 0.25,  outputPer1M: 1.25,  unit: 'tokens' },
  bluesky:       { inputPer1M: 0.0,   outputPer1M: 0.0,   unit: 'req' },
  nitter:        { inputPer1M: 0.0,   outputPer1M: 0.0,   unit: 'req' },
  telegram_pub:  { inputPer1M: 0.0,   outputPer1M: 0.0,   unit: 'req' },
  reddit:        { inputPer1M: 0.0,   outputPer1M: 0.0,   unit: 'req' },
};

const USD_TO_BRL = 5.85; // taxa aproximada para exibição
const CHARS_PER_TOKEN = 4;

// ── Persistência via localStorage ──────────────────────────────

interface ServiceUsage {
  service: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  costUSD: number;
  lastCall: number; // timestamp ms
  callsToday: number;
  dayKey: string;   // 'YYYY-MM-DD'
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStorage(): Record<string, ServiceUsage> {
  try {
    return JSON.parse(localStorage.getItem('cdia_billing') ?? '{}');
  } catch {
    return {};
  }
}

function saveStorage(data: Record<string, ServiceUsage>) {
  try {
    localStorage.setItem('cdia_billing', JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function ensureService(data: Record<string, ServiceUsage>, service: string): ServiceUsage {
  const day = todayKey();
  if (!data[service] || data[service].dayKey !== day) {
    data[service] = {
      service,
      inputTokens: 0,
      outputTokens: 0,
      calls: 0,
      costUSD: 0,
      lastCall: 0,
      callsToday: 0,
      dayKey: day,
    };
  }
  return data[service];
}

// ── Rate Limiter ───────────────────────────────────────────────

/**
 * Intervalos mínimos (ms) entre chamadas por regime.
 */
const MIN_INTERVAL_MS: Record<RateLimitMode, number> = {
  economico: 6 * 60 * 60 * 1000,  // 6h
  normal:    3 * 60 * 60 * 1000,  // 3h
  ilimitado: 0,
};

/**
 * Fração do limite diário usada por ciclo.
 */
const DAILY_FRACTION: Record<RateLimitMode, number> = {
  economico: 0.25, // 25% do limite por ciclo
  normal:    0.50, // 50% do limite por ciclo
  ilimitado: 1.00, // 100%
};

/**
 * Verifica se um serviço pode fazer uma chamada agora, dado o regime.
 * Retorna { allowed: boolean; reason?: string }
 */
export function canCallService(service: string, mode: RateLimitMode): { allowed: boolean; reason?: string } {
  if (mode === 'ilimitado') return { allowed: true };

  const data = getStorage();
  const entry = ensureService(data, service);
  const pricing = SERVICE_PRICING[service];

  // Verifica intervalo mínimo
  const minInterval = MIN_INTERVAL_MS[mode];
  if (minInterval > 0 && entry.lastCall > 0) {
    const elapsed = Date.now() - entry.lastCall;
    if (elapsed < minInterval) {
      const minutesLeft = Math.ceil((minInterval - elapsed) / 60000);
      return { allowed: false, reason: `Próxima chamada em ~${minutesLeft} min (regime ${mode})` };
    }
  }

  // Verifica quota diária
  if (pricing?.dailyLimit) {
    const maxPerCycle = Math.floor(pricing.dailyLimit * DAILY_FRACTION[mode]);
    if (entry.callsToday >= maxPerCycle) {
      return { allowed: false, reason: `Quota do regime atingida: ${entry.callsToday}/${maxPerCycle} chamadas hoje` };
    }
  }

  return { allowed: true };
}

/**
 * Registra uma chamada bem-sucedida.
 */
export function recordCall(service: string, inputText: string, outputText: string) {
  const data = getStorage();
  const entry = ensureService(data, service);
  const pricing = SERVICE_PRICING[service] ?? { inputPer1M: 0, outputPer1M: 0, unit: 'req' };

  const inTokens  = Math.ceil(inputText.length  / CHARS_PER_TOKEN);
  const outTokens = Math.ceil(outputText.length / CHARS_PER_TOKEN);
  const cost = (inTokens * pricing.inputPer1M + outTokens * pricing.outputPer1M) / 1_000_000;

  entry.inputTokens  += inTokens;
  entry.outputTokens += outTokens;
  entry.calls        += 1;
  entry.callsToday   += 1;
  entry.costUSD      += cost;
  entry.lastCall      = Date.now();

  saveStorage(data);

  console.log(
    `%c💰 [Billing] %c${service} %c+${inTokens + outTokens} tokens | $${cost.toFixed(6)}`,
    'color:#10b981;font-weight:bold',
    'color:#6366f1;font-weight:bold',
    'color:#f59e0b',
  );
}

// Compat alias (usado em aiService.ts)
export function trackApiCall(serviceName: string, promptText: string, completionText: string) {
  recordCall(serviceName, promptText, completionText);
}

export function estimateTokenCount(text: string): number {
  return Math.ceil((text?.length ?? 0) / CHARS_PER_TOKEN);
}

export function logBillingUsage(service: string, inputTokens: number, outputTokens: number) {
  const data = getStorage();
  const entry = ensureService(data, service);
  const pricing = SERVICE_PRICING[service] ?? { inputPer1M: 0, outputPer1M: 0, unit: 'req' };
  const cost = (inputTokens * pricing.inputPer1M + outputTokens * pricing.outputPer1M) / 1_000_000;

  entry.inputTokens  += inputTokens;
  entry.outputTokens += outputTokens;
  entry.calls        += 1;
  entry.callsToday   += 1;
  entry.costUSD      += cost;
  entry.lastCall      = Date.now();
  saveStorage(data);
}

// ── Usage Summary ──────────────────────────────────────────────

export interface UsageSummaryItem {
  service: string;
  label: string;
  calls: number;
  callsToday: number;
  dailyLimit?: number;
  tokens: number;
  costUSD: number;
  costBRL: number;
  isFree: boolean;
  unit: string;
  lastCall: number;
}

const SERVICE_LABELS: Record<string, string> = {
  gemini_pro:   'Gemini 1.5 Pro',
  gemini_flash: 'Gemini 2.0 Flash',
  openai:       'OpenAI GPT-4o',
  perplexity:   'Perplexity AI',
  groq:         'Groq (LLaMA 3)',
  serper:       'Serper.dev',
  newsapi:      'NewsAPI',
  youtube:      'YouTube Data API',
  anthropic:    'Anthropic Claude',
  bluesky:      'Bluesky',
  nitter:       'X/Twitter (Nitter)',
  telegram_pub: 'Telegram Público',
  reddit:       'Reddit',
  HealthCheck:        'Gemini HealthCheck',
  AnalyzeSentiment:   'Gemini Sentimento',
  GenerateResponse:   'Gemini Resposta',
  SuggestOpponents:   'Gemini Oponentes',
  AnalyzeLegacy:      'Gemini Legado',
  generateLegalDefense: 'Gemini Defesa',
  analyzeCompliance:  'Gemini Compliance',
  generateScenarioAnalysis: 'Gemini Cenário',
};

export function getUsageSummary(): UsageSummaryItem[] {
  const data = getStorage();
  return Object.values(data).map(entry => {
    const pricing = SERVICE_PRICING[entry.service] ?? { inputPer1M: 0, outputPer1M: 0, unit: 'req' };
    return {
      service:    entry.service,
      label:      SERVICE_LABELS[entry.service] ?? entry.service,
      calls:      entry.calls,
      callsToday: entry.callsToday,
      dailyLimit: pricing.dailyLimit,
      tokens:     entry.inputTokens + entry.outputTokens,
      costUSD:    entry.costUSD,
      costBRL:    entry.costUSD * USD_TO_BRL,
      isFree:     pricing.inputPer1M === 0 && pricing.outputPer1M === 0,
      unit:       pricing.unit,
      lastCall:   entry.lastCall,
    };
  }).sort((a, b) => b.costUSD - a.costUSD);
}

export function resetUsage() {
  localStorage.removeItem('cdia_billing');
}
