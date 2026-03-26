/**
 * Sanitizador de entrada de usuário para prompts de IA.
 * Previne prompt injection e remove padrões que poderiam manipular o LLM.
 */

/**
 * Sanitiza texto de entrada do usuário antes de interpolá-lo em prompts de IA.
 * Remove tentativas de injeção como "Ignore previous instructions".
 */
export function sanitizeForPrompt(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    // Remove comprimento excessivo (evita ataques de context flooding)
    .slice(0, 4000)
    // Remove padrões clássicos de prompt injection
    .replace(/ignore\s+(all\s+)?(previous|prior)\s+instructions?/gi, '[removido]')
    .replace(/system\s*:\s*/gi, '[sistema]:')
    .replace(/assistant\s*:\s*/gi, '[assistente]:')
    .replace(/\[INST\]|\[\/INST\]|<s>|<\/s>/g, '')
    // Escapa aspas triplas que poderiam quebrar o prompt
    .replace(/"""/g, '"\'\'\'')
    // Remove caracteres de controle (exceto newline e tab)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}
