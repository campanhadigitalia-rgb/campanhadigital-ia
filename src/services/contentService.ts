export interface ContentPayload {
  instagram: string;
  tiktok: string;
  twitter: string;
}

import { GoogleGenerativeAI } from '@google/generative-ai';
import { sanitizeForPrompt } from '../utils/inputSanitizer';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateCampaignScripts(fact: string): Promise<ContentPayload> {
  if (!API_KEY) throw new Error('Chave de API do Gemini não configurada. Acesse as Configurações do sistema.');
  
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  const safeFact = sanitizeForPrompt(fact);
  const prompt = `Como um estrategista digital político sênior, crie scripts para 3 redes sociais sobre este fato: "${safeFact}".
    O tom deve ser inspirador, focado em entregas e autoridade.
    Redes: Instagram (legenda com hashtags), TikTok (roteiro de vídeo curto/hook), Twitter/X (institucional e direto).
    Responda APENAS com um JSON puro no formato:
    { "instagram": "...", "tiktok": "...", "twitter": "..." }`;
  
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
  if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();
  
  return JSON.parse(text) as ContentPayload;
}
