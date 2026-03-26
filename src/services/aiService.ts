import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Mention, AIReply, CampaignIdentity, Competitor, Sentiment } from '../types';
import { sanitizeForPrompt } from '../utils/inputSanitizer';
import { trackApiCall } from '../utils/billingMonitor';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Mudança para o modelo PRO para raciocínio complexo conforme solicitado
const MODEL_NAME = "gemini-1.5-pro";

export async function testGeminiConnection(): Promise<boolean> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return false;
  try {
    console.log(`[CDIA-AI] Health Check for ${MODEL_NAME}...`);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = "Ping";
    const result = await model.generateContent(prompt);
    trackApiCall("HealthCheck", prompt, result.response.text());
    return true;
  } catch (error) {
    console.error("Gemini Health Check Failed:", error);
    return false;
  }
}

export async function analyzeSentiment(text: string): Promise<Sentiment> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return 'neutro';
  }
  
  const safeText = sanitizeForPrompt(text);
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Analise o seguinte texto sob a ótica da neurociência política e comportamento do eleitor: "${safeText}". 
Avalie se o sentimento embute um risco institucional (crítico), se é uma rejeição orgânica (negativo), se é engajamento positivo ou puramente informativo (neutro).
Responda APENAS com uma destas quatro palavras exatas em minúsculo: positivo, neutro, negativo, critico.`;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    trackApiCall("AnalyzeSentiment", prompt, responseText);

    const sentiment = responseText.toLowerCase().replace(/[^a-z]/g, '') as Sentiment;
    
    if (['positivo', 'neutro', 'negativo', 'critico'].includes(sentiment)) {
      return sentiment;
    }
  } catch (error) {
    console.error("AI Sentiment Error:", error);
  }
  return 'neutro';
}

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
    ? `Identidade do Candidato:
Nome: "${identity.name}"
Cargo pleiteado: "${identity.position}" em "${identity.location}" pelo partido "${identity.party}".
Posicionamento Central: "${identity.bio_base}". 
Diretriz Curadora: Toda resposta deve projetar autoridade magnética e aderência absoluta a este personagem político.`
    : `Diretriz Curadora: Você é a inteligência estratégica de controle de crise (War Room) de um candidato majoritário.`;

  const safeText = sanitizeForPrompt(mention.text);
  const safeRegion = sanitizeForPrompt(mention.region);
  const safeTopic = sanitizeForPrompt(mention.topic);

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    const prompt = `${identityContext}
Uma ocorrência foi detectada na macrorregião "${safeRegion}".
Tema central em disputa: "${safeTopic}" 
Plataforma de propagação: "${mention.platform}"
Texto bruto orgânico/crítico: "${safeText}"

Instrução de War Room: Com base em teoria dos jogos aplicada a campanhas de alta polarização e gestão de crise reputacional, formule 3 opções precisas de manifestação (PR) para o candidato. 
Objetivo: neutralizar danos e reter a dianteira narrativa.

As opções devem seguir os seguintes perfis táticos:
1. Conciliador: Redução de temperatura, empatia construtiva, focada na unificação.
2. Técnico: Retórica blindada em dados estatísticos, retrospecto de governo e evidências irrefutáveis. Remove paixão do debate.
3. Firme: Demarcação agressiva de fronteiras éticas. Desconstrução imediata do oponente ou da desinformação, projetando força de liderança.

Retorne ÚNICA E EXCLUSIVAMENTE um array JSON válido sem markdown ou outras marcações:
[
  { "persona": "Conciliador", "text": "sua resposta aqui" },
  { "persona": "Técnico", "text": "sua resposta aqui" },
  { "persona": "Firme", "text": "sua resposta aqui" }
]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    trackApiCall("GenerateResponse", prompt, text);

    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();

    return JSON.parse(text) as AIReply[];

  } catch (error) {
    console.error("AI Generate Error:", error);
    return [
      { persona: 'Conciliador', text: 'Falha ao comunicar com Oráculo IA (Verifique console)' }
    ];
  }
}

export async function suggestOpponents(position: string, location: string): Promise<Partial<Competitor>[]> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return [];

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Atue como um analista de inteligência eleitoral (Data Intel).
Para o cargo político de "${position}" na circunscrição de "${location}", cruze históricos e contexto político atual para identificar os 3 oponentes eleitorais ou grupos políticos de oposição mais prováveis.
Retorne APENAS um JSON no formato: [{"name": "Nome", "socials": {"instagram": "@user"}}]. Sem markdown.`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    trackApiCall("SuggestOpponents", prompt, text);

    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Opponent Suggestion Error:", error);
    return [];
  }
}

export async function analyzeLegacyContext(
  legacySentimentSummary: string, 
  currentStrategy: string
): Promise<string> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return "Memória IA Inativa.";

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Você é o Arquiteto-Chefe da campanha (Mastermind Estratégico).
Input Analítico (Campanha Histórica): "${legacySentimentSummary}"
Vetor Estratégico Atual (Guideline): "${currentStrategy}"

Missão: Realize uma engenharia reversa das fraquezas passadas. Crie uma triangulação discursiva em um único parágrafo letal e assertivo. 
Alerte sobre armadilhas recorrentes (blind spot) e identifique um capital eleitoral silencioso que a estratégia atual está negligenciando.`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    trackApiCall("AnalyzeLegacy", prompt, text);
    
    return text;
  } catch (error) {
    console.error("AI Legacy Context Error:", error);
    return "Erro ao processar memória IA.";
  }
}
