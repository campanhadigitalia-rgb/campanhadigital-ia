/**
 * Utilidades para estimar o consumo de tokens da API do Gemini.
 * O objetivo é manter controle sobre os créditos do Google Cloud (US$ 300).
 */

const TOKEN_COST_PRO_INPUT = 1.25 / 1000000;  // $1.25 per 1M context bytes (approx)
const TOKEN_COST_PRO_OUTPUT = 3.75 / 1000000; // $3.75 per 1M context bytes (approx) 
// Reference values for estimate only.

const CHARS_PER_TOKEN = 4; // Average chars per token roughly
let sessionTotalTokens = 0;
let sessionTotalCost = 0;

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function logBillingUsage(serviceName: string, promptTokens: number, completionTokens: number) {
  const totalTokens = promptTokens + completionTokens;
  const cost = (promptTokens * TOKEN_COST_PRO_INPUT) + (completionTokens * TOKEN_COST_PRO_OUTPUT);
  
  sessionTotalTokens += totalTokens;
  sessionTotalCost += cost;

  console.log(
    `%c💰 [Billing Monitor] %c[${serviceName}] %c${totalTokens} tokens consumidos. ` + 
    `%cCusto est.: $${cost.toFixed(6)} | Total Sessão: $${sessionTotalCost.toFixed(6)}`,
    'color: #10b981; font-weight: bold', // green
    'color: #6366f1; font-weight: bold', // indigo
    'color: #f59e0b', // amber
    'color: #94a3b8' // slate
  );
}

/**
 * Wrapper for logging API calls dynamically if total character count is passed
 */
export function trackApiCall(serviceName: string, promptText: string, completionText: string) {
  const inTokens = estimateTokenCount(promptText);
  const outTokens = estimateTokenCount(completionText);
  logBillingUsage(serviceName, inTokens, outTokens);
}
