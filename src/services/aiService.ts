import { GoogleGenerativeAI } from '@google/generative-ai';

export type Sentiment = 'positivo' | 'neutro' | 'negativo' | 'critico';

export interface Mention {
  id: string;
  region: string;
  topic: string;
  platform: 'Twitter' | 'Facebook' | 'Instagram';
  text: string;
  sentiment?: Sentiment;
  timestamp: string;
}

export interface AIReply {
  persona: 'Conciliador' | 'Técnico' | 'Firme';
  text: string;
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Invoca o LLM (Gemini 1.5 Flash) para inferir o sentimento da menção de forma real.
 */
export async function analyzeSentiment(text: string): Promise<Sentiment> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    // Fallback seguro caso a chave não tenha sido preenchida pelo usuário localmente
    const lower = text.toLowerCase();
    if (lower.includes('incompetente') || lower.includes('absurdo')) return 'critico';
    if (lower.includes('ruim') || lower.includes('difícil')) return 'negativo';
    if (lower.includes('boa') || lower.includes('bom')) return 'positivo';
    return 'neutro';
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Analise o seguinte texto: "${text}". 
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
 * Usa a persona do Governador e o modelo Gemini-1.5 para tecer respostas (RAG).
 * Gera 3 matizes diferentes de resposta retornando via JSON parse.
 */
export async function generateResponseOptions(mention: Mention): Promise<AIReply[]> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    return [
      { persona: 'Conciliador', text: 'Chave do Gemini ausente no arquivo .env. Configure VITE_GEMINI_API_KEY.' },
      { persona: 'Técnico', text: 'Chave do Gemini ausente no arquivo .env. Configure VITE_GEMINI_API_KEY.' },
      { persona: 'Firme', text: 'Chave do Gemini ausente no arquivo .env. Configure VITE_GEMINI_API_KEY.' }
    ];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Você é o time de inteligência de comunicação do Governador.
Cidadão da região "${mention.region}" relatou: "${mention.text}"
Tema: "${mention.topic}", Plataforma: "${mention.platform}"

Gere exatamente 3 opções de rascunho oficial de resposta. As abordagens são:
1. Conciliador (empático e acolhedor)
2. Técnico (focado em números, rubricas orçamentárias e metas institucionais)
3. Firme (postura de autoridade rebatendo críticos e fake news)

Responda ÚNICA E EXCLUSIVAMENTE retornando um array JSON válido (sem marcadores \`\`\`json). Exemplo:
[
  { "persona": "Conciliador", "text": "..." },
  { "persona": "Técnico", "text": "..." },
  { "persona": "Firme", "text": "..." }
]`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const parsedData = JSON.parse(text) as AIReply[];
    return parsedData;

  } catch (error) {
    console.error("AI Generate Error:", error);
    return [
      { persona: 'Conciliador', text: '🔥 Erro no Cloud Gemini (verifique os logs).' },
      { persona: 'Técnico', text: '🔥 Erro no Cloud Gemini (verifique os logs).' },
      { persona: 'Firme', text: '🔥 Erro no Cloud Gemini (verifique os logs).' }
    ];
  }
}
