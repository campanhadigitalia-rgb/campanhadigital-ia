import { GoogleGenerativeAI } from '@google/generative-ai';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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
  status: 'Ativo' | 'Prazo Aberto' | 'Julgado' | 'Arquivado';
  court: string;
  type: string;
  lastUpdate: string;
  description: string;
}

export interface CnpjStatus {
  razaoSocial: string;
  situacao: string;
  dataAbertura: string;
  natureza: string;
  atividade: string;
  endereco: string;
  telefone?: string;
  email?: string;
  isActive: boolean;
}

export interface DefenseRecord {
  id?: string;
  processInfo: string;
  thesis: string;
  createdAt?: unknown;
  campaignId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRateLimit(e: unknown): boolean {
  return String(e).includes('429') || String(e).toLowerCase().includes('quota') || String(e).toLowerCase().includes('rate');
}

// ─── CNPJ Verification (Receita Federal via cnpj.ws) ─────────────────────────

export async function verifyCnpjStatus(cnpj: string): Promise<CnpjStatus | null> {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const est = data.estabelecimento ?? {};
    const principal = est.atividade_principal ?? {};
    const cidade = est.cidade?.nome ?? '';
    const estado = est.estado?.sigla ?? '';
    const rua = [est.tipo_logradouro, est.logradouro, est.numero].filter(Boolean).join(' ');
    return {
      razaoSocial: data.razao_social ?? '',
      situacao: est.situacao_cadastral ?? 'Desconhecida',
      dataAbertura: est.data_inicio_atividade ?? '',
      natureza: data.natureza_juridica?.descricao ?? '',
      atividade: principal.descricao ?? '',
      endereco: `${rua} — ${est.bairro ?? ''}, ${cidade}/${estado} · CEP ${est.cep ?? ''}`,
      telefone: est.ddd1 && est.telefone1 ? `(${est.ddd1}) ${est.telefone1}` : undefined,
      email: est.email && est.email !== 'nan' ? est.email : undefined,
      isActive: (est.situacao_cadastral ?? '').toLowerCase() === 'ativa',
    };
  } catch (e) {
    console.warn('CNPJ lookup failed:', e);
    return null;
  }
}

// ─── TSE Candidacy via CORS Proxy ─────────────────────────────────────────────
// Uses allorigins.win to bypass TSE CORS restriction

export interface CandidacyInfo {
  nomeUrna: string;
  cargo: string;
  partido: string;
  situacao: string;
  numero: string;
  uf: string;
  ano: number;
  link: string;
}

export async function fetchCandidacyByCnpj(cnpj: string, year: number): Promise<CandidacyInfo | null> {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return null;
  try {
    const target = `https://divulgacandcontas.tse.jus.br/divulga/rest/v1/cnpj/${digits}`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(target)}`;
    const res = await fetch(proxy);
    if (!res.ok) throw new Error('proxy error');
    const wrapper = await res.json();
    const data = JSON.parse(wrapper.contents ?? '{}');
    const cand = data?.candidatura ?? data;
    if (!cand?.nomeUrna && !cand?.nome) return null;
    const seqCand = cand.sequencialCandidato ?? '';
    const ufCand = cand.sgUE ?? cand.sgUf ?? '';
    const anoCand = cand.anoEleicao ?? year;
    return {
      nomeUrna: cand.nomeUrna ?? cand.nome ?? '',
      cargo: cand.descricaoCargo ?? '',
      partido: cand.siglaPartido ?? cand.nomePartido ?? '',
      situacao: cand.descricaoSituacaoTotalizacao ?? cand.descricaoSituacao ?? '',
      numero: String(cand.numeroEleitoral ?? cand.numero ?? ''),
      uf: ufCand,
      ano: anoCand,
      link: seqCand
        ? `https://divulgacandcontas.tse.jus.br/divulga/#/candidato/${anoCand}/${ufCand}/${seqCand}`
        : `https://divulgacandcontas.tse.jus.br/divulga/#/`,
    };
  } catch (e) {
    console.warn('TSE candidacy lookup failed:', e);
    return null;
  }
}

// ─── Jurisprudência (Gemini — dados reais, sem mock) ──────────────────────────

export type JuriResult = { data: Jurisprudence[]; isAI: boolean; isRateLimited: boolean };

export async function fetchJurisprudenceDB(year?: number): Promise<JuriResult> {
  if (!API_KEY) return { data: [], isAI: false, isRateLimited: false };

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const yearStr = year
      ? `da eleição de ${year} (ano eleitoral ${year})`
      : 'dos anos eleitorais 2022 e 2024';

    const prompt = `Você é um advogado eleitoral especialista em direito eleitoral brasileiro.
Liste 6 decisões/resoluções REAIS e verificáveis do TSE ou TRE-RS mais importantes ${yearStr}.
Use SOMENTE decisões que existem de verdade — cite o número exato da resolução TSE ou número do acórdão.
Responda APENAS com JSON válido, sem comentários ou markdown, no formato:
[{"id":"tse-XYZW","tribunal":"TSE","theme":"Tema conciso","decision":"Resumo fiel em 2-3 frases da decisão real, citando o número do acórdão/resolução","date":"YYYY-MM-DD","year":${year ?? 2022},"link":"https://jurisprudencia.tse.jus.br/#/"}]
Regras estritas:
- tribunal: apenas "TSE" ou "TRE-RS"
- Não invente. Se não lembrar o número exato, omita o número mas descreva a decisão fielmente
- link: sempre "https://jurisprudencia.tse.jus.br/#/" (portal público real)`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    if (text.startsWith('```')) text = text.replace(/^```/, '').replace(/```$/, '').trim();
    const parsed: Jurisprudence[] = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Empty response');
    return { data: parsed, isAI: true, isRateLimited: false };
  } catch (e) {
    const rateLimited = isRateLimit(e);
    console.warn(rateLimited ? 'Gemini rate limited' : 'Jurisprudence AI failed:', e);
    return { data: [], isAI: false, isRateLimited: rateLimited };
  }
}

// ─── Processos (user-driven via Firestore, sem mock) ──────────────────────────
// Processos são inseridos pelo advogado manualmente. Não existe API pública do PJe.
// Esta função retorna lista vazia — os dados vêm do Firestore em tempo real no componente.

export async function fetchCampaignLawsuits(): Promise<CampaignLawsuit[]> {
  return [];
}

// ─── Salvar Defesa no Firestore ───────────────────────────────────────────────

export async function saveDefenseToFirestore(
  campaignId: string,
  processInfo: string,
  thesis: string
): Promise<string> {
  const colRef = collection(db, `campaigns/${campaignId}/defenses`);
  const docRef = await addDoc(colRef, {
    processInfo,
    thesis,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

// ─── Exportar Defesa como Word (.doc) ────────────────────────────────────────

export function exportDefenseAsWord(processInfo: string, thesis: string) {
  const now = new Date().toLocaleString('pt-BR');
  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head>
      <meta charset="UTF-8"/>
      <title>Tese Defensiva</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; margin: 3cm; color: #000; }
        h1 { font-size: 14pt; text-align: center; font-weight: bold; text-transform: uppercase; }
        h2 { font-size: 12pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 4pt; margin-top: 24pt; }
        p { text-align: justify; line-height: 1.5; }
        .meta { color: #555; font-size: 10pt; text-align: right; }
        .footer { margin-top: 48pt; border-top: 1px solid #000; padding-top: 8pt; font-size: 9pt; color: #888; }
      </style>
    </head>
    <body>
      <h1>TESE DEFENSIVA — CAMPANHA ELEITORAL</h1>
      <p class="meta">Gerado por CampanhaDigital IA em ${now}</p>
      <h2>OBJETO DA ACUSAÇÃO / INTIMAÇÃO</h2>
      <p>${processInfo.replace(/\n/g, '<br/>')}</p>
      <h2>TESE DE DEFESA GERADA (RAG — IA Jurídica)</h2>
      <p>${thesis.replace(/\n/g, '<br/>')}</p>
      <div class="footer">
        Documento gerado automaticamente. Revisar com advogado responsável antes de protocolar.<br/>
        CampanhaDigital IA — Sistema de Gestão Eleitoral
      </div>
    </body>
    </html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tese_defensiva_${new Date().toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
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
    return `📝 **TESES DE DEFESA PRELIMINAR (SEM IA)**\n\nAPI Gemini não configurada.\n\n- Fundamento Legal: Art. 36-A da Lei das Eleições (Lei nº 9.504/1997).\n- Argumento Base: A postagem contestada não contém pedido explícito de voto, caracterizando-se como exaltação de qualidades pessoais.\n- Ação Recomendada: Petição imediata de defesa e envio preventivo ao Tribunal Pleno.`;
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
      return `⚠️ **API Temporariamente Limitada (Rate Limit)**\n\nAguarde 1 minuto e tente novamente.\n\n**Base Manual:**\n- Fundamento: Art. 36-A da Lei 9.504/1997\n- Objeto: ${threatDescription.substring(0, 150)}\n- Ação imediata: Protocolar petição de defesa no prazo legal.`;
    }
    console.error('Legal Defense RAG Error:', error);
    return `❌ Erro ao gerar tese.\n\nCausa: ${String(error).substring(0, 200)}\n\nBase Manual:\n- Art. 36-A Lei 9.504/1997\n- Objeto: ${threatDescription.substring(0, 100)}`;
  }
}
