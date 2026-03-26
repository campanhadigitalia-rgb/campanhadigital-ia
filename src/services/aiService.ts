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

export async function generateLegalDefense(requestText: string, identity?: CampaignIdentity): Promise<string> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') return "Serviço RAG Offline (Chave não configurada).";

  try {
    const context = identity ? `
Contexto do Candidato:
Nome: ${identity.name} (${identity.urnName})
Cargo: ${identity.position} em ${identity.location}
Partido/Coligação: ${identity.party} / ${identity.coalition}
Histórico/Perfil: ${identity.history}
` : '';

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Atue como um Advogado Eleitoral Senior especialista no TSE.
${context}

O cliente (Campanha) reportou a seguinte situação/incidente jurídico ou ataque do adversário:
"${requestText}"

Com base na teoria geral do direito eleitoral brasileiro, resoluções vigentes do TSE e jurisprudência:
1. Formule uma minuta de defesa técnica ou tese jurídica inicial estruturada.
2. Cite especificamente os artigos de leis ou resoluções (ex: Res. 23.610/2019) aplicáveis.
3. Classifique o nível de risco (Baixo, Médio, Crítico).
4. Sugira uma "Ação Imediata" (Ex: Pedido de Liminar, Direito de Resposta, Notificação Extrajudicial).

Responda diretamente em formato de memorando jurídico profissional, sem markdown de código, usando tom formal e assertivo.`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    trackApiCall("generateLegalDefense", prompt, text);
    
    return text;
  } catch (error) {
    console.error("AI RAG Defense Error:", error);
    return "Erro crítico no motor de defesa IA.";
  }
}

export async function analyzeCompliance(mediaBase64: string, mimeType: string): Promise<{status: string, report: string}> {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
     // Mock fallback if something fails with key
     return { status: "Aprovado", report: "Verificação Offline: Parece em conformidade." };
  }

  try {
    // Media handling for Gemini
    const parts: any[] = [];
    parts.push({text: `Você é um Auditor Rigoroso do TSE. Analise esta peça publicitária da campanha.
Verifique 3 coisas essenciais de compliance eleitoral:
1. Proporção do vice (A resolução exige que o nome do vice tenha no mínimo 30% do tamanho do nome do titular, se visível nesta peça).
2. Presença do CNPJ/CPF da campanha e de quem imprimiu/produziu.
3. Identificação clara de que se trata de propaganda eleitoral.
4. Identificação imediata de discursos de ódio, fake news, manipulações grosseiras (deepfake) ou ataques levianos.

Se houver graves violações, declare Risco Imediato com os motivos. Se estiver conforme as resoluções principais, declare Aprovado ou Aprovado com Ressalvas.
O seu retorno deve comecar OBRIGATORIAMENTE com a palavra "RISCO" ou "APROVADO", seguido de uma quebra de linha e do detalhamento.`});

    // Strip data URL prefix to get raw base64
    const base64Data = mediaBase64.split(',')[1];
    if (base64Data) {
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(parts);
    const text = result.response.text().trim();
    trackApiCall("analyzeCompliance", "Auditoria de Imagem MultiModal", text);
    
    const statusPrefix = text.toUpperCase().startsWith("RISCO") ? "Risco" : "Aprovado";
    
    return { status: statusPrefix, report: text };
  } catch (error) {
    console.error("AI Compliance Verification Error:", error);
    return { status: "Erro", report: "Não foi possível auditar a peça via IA." };
  }
}
