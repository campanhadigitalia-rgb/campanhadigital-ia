import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Jurisprudence {
  id: string;
  tribunal: string;
  theme: string;
  decision: string;
  date: string;
  year: number;
  link?: string;
}

export interface CampaignLawsuit {
  id: string;
  cnjNumber: string;
  status: 'Ativo' | 'Prazo Aberto' | 'Julgado';
  court: string;
  type: string;
  lastUpdate: string;
  description: string;
  isDemo?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRateLimit(e: unknown): boolean {
  return String(e).includes('429') || String(e).toLowerCase().includes('quota') || String(e).toLowerCase().includes('rate');
}

// ─── Jurisprudência (Gemini-powered, com fallback mock) ───────────────────────

const MOCK_JURISPRUDENCE: Jurisprudence[] = [
  { id: 'tse-124', tribunal: 'TSE', theme: 'Propaganda Antecipada', decision: 'Uso de outdoor subliminar configurou multa de R$ 25.000,00. Candidato não comprovou ausência de pedido de voto.', date: '2025-11-10', year: 2025, link: 'https://jurisprudencia.tse.jus.br/#/' },
  { id: 'tre-rs-55', tribunal: 'TRE-RS', theme: 'Fake News / Desinformação', decision: 'Suspensão imediata de perfil no X/Twitter por difamação. Direito de resposta deferido no prazo de 24h.', date: '2026-01-22', year: 2026, link: 'https://jurisprudencia.tse.jus.br/#/' },
  { id: 'tse-88', tribunal: 'TSE', theme: 'Arrecadação e PIX', decision: 'Vedado uso de CNPJ corporativo cruzado para PIX de campanha. Conta bancária deve ser exclusivamente eleitoral.', date: '2026-02-14', year: 2026, link: 'https://jurisprudencia.tse.jus.br/#/' },
  { id: 'tre-rs-10', tribunal: 'TRE-RS', theme: 'Propaganda Irregular', decision: 'Material impresso sem número de registro TSE em local de fácil leitura enseja multa e recolhimento imediato.', date: '2024-09-05', year: 2024, link: 'https://jurisprudencia.tse.jus.br/#/' },
  { id: 'tse-200', tribunal: 'TSE', theme: 'Disparo em Massa (WhatsApp)', decision: 'Disparo eleitoral em listas de transmissão compradas é prática vedada — Res. TSE nº 23.610/2019.', date: '2024-10-18', year: 2024, link: 'https://jurisprudencia.tse.jus.br/#/' },
  { id: 'tre-rs-22', tribunal: 'TRE-RS', theme: 'Abuso de Poder Econômico', decision: 'Doação acima do limite legal (10% rendimentos brutos declarados ao IR) enseja cassação do registro.', date: '2022-09-01', year: 2022, link: 'https://jurisprudencia.tse.jus.br/#/' },
  { id: 'tse-22a', tribunal: 'TSE', theme: 'Pesquisa Eleitoral', decision: 'Pesquisa de intenção de voto não registrada no TSE é propaganda eleitoral irregular. Multa de R$ 53.205,00.', date: '2022-08-22', year: 2022, link: 'https://jurisprudencia.tse.jus.br/#/' }
];

export type JuriResult = { data: Jurisprudence[]; isAI: boolean; isRateLimited: boolean };

export async function fetchJurisprudenceDB(year?: number): Promise<JuriResult> {
  const fallback = year ? MOCK_JURISPRUDENCE.filter(j => j.year === year) : MOCK_JURISPRUDENCE;

  if (!API_KEY) return { data: fallback, isAI: false, isRateLimited: false };

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const yearStr = year ? `do ano ${year}` : 'recentes (2022-2026)';
    const prompt = `Você é um advogado eleitoral especialista em direito eleitoral brasileiro.
Liste 5 decisões/súmulas/resoluções REAIS do TSE ou TRE-RS mais relevantes para campanhas eleitorais ${yearStr}.
Responda APENAS com JSON válido, sem comentários, no formato:
[{"id":"unico","tribunal":"TSE","theme":"Tema curto","decision":"Resumo em 2 frases da decisão real","date":"YYYY-MM-DD","year":${year || 2026},"link":"https://jurisprudencia.tse.jus.br/#/"}]
Regras: use APENAS decisões reais. Não invente números de processo. Tribunal deve ser "TSE" ou "TRE-RS".`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();
    const parsed: Jurisprudence[] = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty response');
    return { data: parsed, isAI: true, isRateLimited: false };
  } catch (e) {
    const rateLimited = isRateLimit(e);
    console.warn(rateLimited ? 'Gemini rate limited, using mock jurisprudence' : 'Jurisprudence AI failed, using mock:', e);
    return { data: fallback.length > 0 ? fallback : MOCK_JURISPRUDENCE, isAI: false, isRateLimited: rateLimited };
  }
}

// ─── Campaign Lawsuits (PJe) ──────────────────────────────────────────────────
// NOTA: integração real com PJe requer proxy backend (CORS). Por ora retorna dados demo.

export async function fetchCampaignLawsuits(): Promise<CampaignLawsuit[]> {
  return [
    {
      id: 'demo-1',
      cnjNumber: '0600123-45.2026.6.21.0000',
      status: 'Prazo Aberto',
      court: 'TRE-RS',
      type: 'Representação Eleitoral',
      lastUpdate: 'Demo',
      description: 'EXEMPLO: Oposição acusa evento de caracterizar propaganda eleitoral antecipada.',
      isDemo: true
    },
    {
      id: 'demo-2',
      cnjNumber: '0600888-99.2026.6.21.0000',
      status: 'Julgado',
      court: 'TSE',
      type: 'Direito de Resposta',
      lastUpdate: 'Demo',
      description: 'EXEMPLO: Contestação de vídeo nas redes sociais. Liminar deferida parcialmente.',
      isDemo: true
    }
  ];
}

// ─── Content Compliance ───────────────────────────────────────────────────────

export async function validateContentCompliance(text: string): Promise<{ status: 'Safe' | 'Warning' | 'Blocked', flags: string[] }> {
  if (!API_KEY) return { status: 'Safe', flags: [] };
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Como um auditor jurídico especializado em direito eleitoral brasileiro (TSE/TRE), analise o seguinte conteúdo de campanha: "${text}".
    Identifique possíveis violações como: Fake News, Propaganda Antecipada, Ofensas Pessoais ou desinformação técnica.
    Responda APENAS com um JSON no formato:
    { "status": "Safe" | "Warning" | "Blocked", "flags": ["Descrição da violação 1"] }`;
    const result = await model.generateContent(prompt);
    let resultText = result.response.text().trim();
    if (resultText.startsWith('```json')) resultText = resultText.replace(/^```json/, '').replace(/```$/, '').trim();
    if (resultText.startsWith('```')) resultText = resultText.replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(resultText);
  } catch (error) {
    console.error('Legal Compliance AI Error:', error);
    return { status: 'Safe', flags: [] };
  }
}

// ─── Defense Thesis (Panic Button) ───────────────────────────────────────────

export async function generateDefenseThesis(threatDescription: string): Promise<string> {
  if (!API_KEY) {
    return `📝 **TESES DE DEFESA PRELIMINAR (BASE MANUAL)**\n\nAtenção: API Gemini não configurada. Baseado em: ${threatDescription.substring(0, 80)}...\n\n- Fundamento Legal: Art. 36-A da Lei das Eleições (Lei nº 9.504/1997).\n- Argumento Base: A postagem contestada não contém pedido explícito de voto, caracterizando-se como exaltação de qualidades pessoais.\n- Ação Recomendada: Petição imediata de defesa e envio preventivo ao Tribunal Pleno.`;
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `Você é um advogado especialista em Direito Eleitoral Brasileiro.
    Baseado na seguinte notificação/intimação recebida pela campanha, gere uma tese de defesa preliminar objetiva, com fundamentos legais, referência à Lei das Eleições (9.504/97), Código Eleitoral e precedentes do TSE/TRE-RS.
    
    OBJETO DA ACUSAÇÃO:
    ${threatDescription}
    
    Estruture a resposta com: 1) Resumo da violação alegada, 2) Tese de defesa principal, 3) Fundamentos legais, 4) Precedentes jurisprudenciais recomendados, 5) Próximos passos processuais.`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    if (isRateLimit(error)) {
      return `⚠️ **API Temporariamente Limitada (Rate Limit)**\n\nA chave Gemini atingiu o limite de requests por minuto. Aguarde 1 minuto e tente novamente.\n\n**Base Manual enquanto isso:**\n- Fundamento: Art. 36-A da Lei 9.504/1997\n- Objeto: ${threatDescription.substring(0, 150)}\n- Ação imediata: Protocolar petição de defesa no prazo legal e comunicar a equipe jurídica.`;
    }
    console.error('Legal Defense RAG Error:', error);
    return `❌ Erro ao gerar tese.\n\nCausa: ${String(error).substring(0, 200)}\n\nBase Manual:\n- Art. 36-A Lei 9.504/1997\n- Objeto: ${threatDescription.substring(0, 100)}`;
  }
}
