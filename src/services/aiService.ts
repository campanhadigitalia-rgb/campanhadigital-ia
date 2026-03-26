import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Mention, AIReply, CampaignIdentity, Competitor, Sentiment } from '../types';
import { sanitizeForPrompt } from '../utils/inputSanitizer';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Verifica se a chave do Gemini está operando corretamente.
 */
export async function testGeminiConnection(): Promise<boolean> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return false;
  try {
    console.log('[CDIA-AI] Health Check for gemini-flash-latest...');
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    await model.generateContent("Ping");
    return true;
  } catch (error) {
    console.error("Gemini Health Check Failed:", error);
    return false;
  }
}

/**
 * Invoca o LLM (Gemini 1.5 Flash) para inferir o sentimento da menção de forma real.
 */
export async function analyzeSentiment(text: string): Promise<Sentiment> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    const lower = text.toLowerCase();
    if (lower.includes('incompetente') || lower.includes('absurdo')) return 'critico';
    if (lower.includes('ruim') || lower.includes('difícil')) return 'negativo';
    if (lower.includes('boa') || lower.includes('bom')) return 'positivo';
    return 'neutro';
  }
  
  const safeText = sanitizeForPrompt(text);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Analise o seguinte texto: "${safeText}". 
Responda APENAS com uma destas quatro palavras exatas em minúsculo: positivo, neutro, negativo, critico.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const sentiment = responseText.toLowerCase().replace(/[^a-z]/g, '') as Sentiment;
    
    if (['positivo', 'neutro', 'negativo', 'critico'].includes(sentiment)) {
      return sentiment;
    }
  } catch (error) {
    console.error("AI Sentiment Error:", error);
  }
  return 'neutro';
}

/**
 * Gera opções de resposta usando a identidade da campanha (Voz do Candidato).
 */
export async function generateResponseOptions(
  mention: Mention, 
  identity?: CampaignIdentity
): Promise<AIReply[]> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return [
      { persona: 'Conciliador', text: 'Chave do Gemini ausente.' },
      { persona: 'Técnico', text: 'Chave do Gemini ausente.' },
      { persona: 'Firme', text: 'Chave do Gemini ausente.' }
    ];
  }

  const identityContext = identity 
    ? `Você está representando o candidato "${identity.name}", que concorre ao cargo de "${identity.position}" em "${identity.location}" pelo partido "${identity.party}".
       Biografia/Base de Voz: "${identity.bio_base}". 
       Toda resposta deve seguir rigorosamente este tom de voz e contexto político.`
    : `Você é o time de inteligência de comunicação de um candidato político.`;

  const safeText = sanitizeForPrompt(mention.text);
  const safeRegion = sanitizeForPrompt(mention.region);
  const safeTopic = sanitizeForPrompt(mention.topic);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    const prompt = `${identityContext}
Cidadão da região "${safeRegion}" relatou: "${safeText}"
Tema: "${safeTopic}", Plataforma: "${mention.platform}"

Gere exatamente 3 opções de rascunho oficial de resposta. As abordagens são:
1. Conciliador (empático e acolhedor)
2. Técnico (focado em números, propostas e histórico de entregas)
3. Firme (postura de autoridade protegendo a reputação e combatendo desinformação)

Responda ÚNICA E EXCLUSIVAMENTE retornando um array JSON válido. Exemplo:
[
  { "persona": "Conciliador", "text": "..." },
  { "persona": "Técnico", "text": "..." },
  { "persona": "Firme", "text": "..." }
]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();

    return JSON.parse(text) as AIReply[];

  } catch (error) {
    console.error("AI Generate Error:", error);
    return [
      { persona: 'Conciliador', text: 'Erro ao gerar resposta.' },
      { persona: 'Técnico', text: 'Erro ao gerar resposta.' },
      { persona: 'Firme', text: 'Erro ao gerar resposta.' }
    ];
  }
}

/**
 * Sugere oponentes com base no cargo e localização.
 */
export async function suggestOpponents(position: string, location: string): Promise<Partial<Competitor>[]> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return [];

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Com base no cargo político "${position}" em "${location}", cite 3 oponentes prováveis ou figuras políticas rivais de destaque nessa região.
                   Retorne APENAS um JSON no formato: [{"name": "Nome", "socials": {"instagram": "@user"}}].`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Opponent Suggestion Error:", error);
    return [];
  }
}

/**
 * Analisa o contexto de uma campanha passada para sugerir melhorias no discurso atual.
 */
export async function analyzeLegacyContext(
  legacySentimentSummary: string, 
  currentStrategy: string
): Promise<string> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return "Memória IA: Analisando dados legados... (Chave ausente)";

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Como estrategista político sênior, analise estes dados da campanha anterior:
    "${legacySentimentSummary}"
    
    A estratégia atual é: "${currentStrategy}"
    
    Sugira 3 pontos de melhoria no discurso para evitar erros do passado ou capitalizar em sentimentos positivos não explorados. 
    Responda em um parágrafo curto e direto.`;
    
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("AI Legacy Context Error:", error);
    return "Erro ao processar memória IA do legado.";
  }
}
