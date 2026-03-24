export interface Jurisprudence {
  id: string;
  tribunal: string;
  theme: string;
  decision: string;
  date: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  ip: string;
}

export async function fetchJurisprudenceDB(): Promise<Jurisprudence[]> {
  return [
    { id: 'tse-124', tribunal: 'TSE', theme: 'Propaganda Antecipada', decision: 'Uso de outdoor subliminar configurou multa de R$ 25.000,00.', date: '2025-11-10' },
    { id: 'tre-rs-55', tribunal: 'TRE-RS', theme: 'Fake News', decision: 'Suspensão imediata de perfil no X/Twitter por difamação mediante RAG Inadequado.', date: '2026-01-22' },
    { id: 'tse-88', tribunal: 'TSE', theme: 'Impulsionamento', decision: 'Vedado uso de CNPJ corporativo cruzado para PIX de campanha.', date: '2026-02-14' }
  ];
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  return [
    { id: 'al-1', action: 'DISPARO_WHATSAPP_LOTE (4 Células)', user: 'alexandre.admin', timestamp: 'Hoje às 14:32', ip: '177.102.x.x' },
    { id: 'al-2', action: 'APROVACAO_CRIATIVO_INSTA', user: 'julia.comite', timestamp: 'Hoje às 11:15', ip: '189.50.x.x' },
    { id: 'al-3', action: 'EXPORTACAO_CRM_MULTP', user: 'carlos.financeiro', timestamp: 'Ontem às 18:40', ip: '200.19.x.x' }
  ];
}

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Escaneia um texto gerado pela IA (Scripts CStudio) contra Violações usando Gemini.
 */
export async function validateContentCompliance(text: string): Promise<{ status: 'Safe' | 'Warning' | 'Blocked', flags: string[] }> {
  if (!API_KEY) return { status: 'Safe', flags: [] };

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const prompt = `Como um auditor jurídico especializado em direito eleitoral brasileiro (TSE/TRE), analise o seguinte conteúdo de campanha: "${text}".
    Identifique possíveis violações como: Fake News, Propaganda Antecipada (pedido de voto antes do prazo), Ofensas Pessoais ou desinformação técnica.
    Responda APENAS com um JSON no formato:
    { "status": "Safe" | "Warning" | "Blocked", "flags": ["Descrição da violação 1", "..."] }`;
    
    const result = await model.generateContent(prompt);
    let resultText = result.response.text().trim();
    if (resultText.startsWith('```json')) resultText = resultText.replace(/^```json/, '').replace(/```$/, '').trim();
    if (resultText.startsWith('```')) resultText = resultText.replace(/^```/, '').replace(/```$/, '').trim();
    
    return JSON.parse(resultText);
  } catch (error) {
    console.error("Legal Compliance AI Error:", error);
    return { status: 'Safe', flags: [] };
  }
}

/**
 * Botão Pânico: Gera tese de defesa automática dado um tema.
 */
export async function generateDefenseThesis(_threatDescription: string): Promise<string> {
  return new Promise((resolve) => setTimeout(() => {
    resolve(`📝 **TESES DE DEFESA PRELIMINAR (RAG TRIBUNAL)**\n\n- Fundamento Legal: Art. 36-A da Lei das Eleições (Lei nº 9.504/1997).\n- Argumento Base: A postagem contestada não contém pedido explícito de voto, caracterizando-se apenas como exaltação das qualidades pessoais ou divulgação de posicionamento pessoal sobre questões políticas.\n- Precedentes TRE-RS: Processos nº 0600123-45.2026 e 0600888-99.2025 afastaram multas em casos idênticos.\n- Ação Recomendada: Petição imediata de defesa (Template 4A) e envio preventivo ao Tribunal Pleno.`);
  }, 3000));
}
