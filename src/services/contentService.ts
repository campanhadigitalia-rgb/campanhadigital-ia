export interface ContentPayload {
  instagram: string;
  tiktok: string;
  twitter: string;
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateCampaignScripts(fact: string): Promise<ContentPayload> {
  if (!API_KEY) return { instagram: 'Erro: Chave de API Ausente', tiktok: 'Erro: Chave de API Ausente', twitter: 'Erro: Chave de API Ausente' };
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Como um estrategista digital político sênior, crie scripts para 3 redes sociais sobre este fato: "${fact}".
    O tom deve ser inspirador, focado em entregas e autoridade.
    Redes: Instagram (legenda com hashtags), TikTok (roteiro de vídeo curto/hook), Twitter/X (institucional e direto).
    Responda APENAS com um JSON puro no formato:
    { "instagram": "...", "tiktok": "...", "twitter": "..." }`;
    
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();
    
    return JSON.parse(text) as ContentPayload;
  } catch (error) {
    console.error("Content Generation Error:", error);
    return { instagram: 'Fallback: Erro na geração IA', tiktok: 'Fallback: Erro na geração IA', twitter: 'Fallback: Erro na geração IA' };
  }
}

/**
 * Simula uma API de Diffusão (Estabilidade XL, DALL-E 3, Midjourney)
 * com filtro pré-definido.
 */
export async function generateBrandedImage(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Como não podemos chamar APIs reais sem custo, retornamos um placeholder estilento
      // da Unsplash, fingindo ser a geração baseada no Prompt
      const query = prompt.toLowerCase().includes('ponte') || prompt.toLowerCase().includes('estrada') 
        ? 'highway,bridge,sunset' 
        : 'crowd,event,sunlight';
      
      resolve(`https://images.unsplash.com/photo-1541888031307-e1792942afc8?q=80&w=600&auto=format&fit=crop&${query}`);
    }, 2000); 
  });
}

/**
 * Mock da "Biblioteca Local" do Storage do Firebase para a PWA Offline.
 */
export async function fetchCampaignAssets() {
  return [
    { id: 'logo-primaria', url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?q=80&w=200&auto=format&fit=crop', type: 'logo' },
    { id: 'candidato-oficial-1', url: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?q=80&w=200&auto=format&fit=crop', type: 'photo' },
    { id: 'bandeira-rs', url: 'https://images.unsplash.com/photo-1579273166152-d725a4e2b755?q=80&w=200&auto=format&fit=crop', type: 'asset' }
  ];
}
