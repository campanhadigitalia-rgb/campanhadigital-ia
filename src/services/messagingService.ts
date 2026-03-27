// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Messaging Service (expanded)
//  Canais de saída: Telegram, Email (Resend), Webhook, Twilio SMS,
//  WhatsApp Meta e Z-API/Evolution (alternativa gratuita)
// ──────────────────────────────────────────────────────────────
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface MilitancyCell {
  id: string; name: string; region: string; memberCount: number;
  estimatedReach: number; status: 'Online' | 'Aquecendo' | 'Offline';
  webhookId: string; campaign_id?: string;
}

export interface FAQItem { id: string; trigger: string; text: string; }

export async function fetchMilitancyCells(campaignId: string): Promise<MilitancyCell[]> {
  try {
    const q = query(collection(db, 'militancy_cells'), where('campaign_id', '==', campaignId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MilitancyCell));
  } catch { return []; }
}

export async function fetchQuickReplies(): Promise<FAQItem[]> {
  return new Promise(resolve => setTimeout(() => resolve([
    { id: 'faq1', trigger: 'O que fizemos pela saúde?', text: '🏥 *Saúde em Primeiro Lugar!*\n\nInvestimos mais de R$ 300 milhões no Programa Assistir.' },
    { id: 'faq2', trigger: 'Por que o pedágio subiu?', text: '🛣️ *Sobre as Rodovias:*\n\nO reajuste é contratual do IPCA, mas garantimos duplicações históricas.' },
  ]), 200));
}

// ── WhatsApp Business (Meta) ───────────────────────────────────
/** PAGO — Taxa por conversa. Versão ideal e mais robusta. */
export async function sendWhatsAppMeta(
  phone: string, text: string,
  token: string, phoneNumberId: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }),
    });
    return res.ok;
  } catch { return false; }
}

// ── WhatsApp via Z-API (alternativa) ──────────────────────────
/**
 * ALTERNATIVA GRATUITA/BARATA ao WhatsApp Business Meta.
 * Z-API conecta via sessão WhatsApp Web — sem taxa por conversa.
 * Planos a partir de R$50/mês. Funciona com número comum.
 * Atenção: WhatsApp pode bloquear se usado em massa.
 */
export async function sendWhatsAppZAPI(
  phone: string, text: string,
  instanceId: string, token: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: text }),
    });
    return res.ok;
  } catch { return false; }
}

// Compat alias
export interface BroadcastPayload { phones?: string[]; text?: string; [key: string]: unknown; }
export async function dispatchPlatformBroadcast(
  _cellIds: string[], contentPayload: BroadcastPayload
): Promise<boolean> {
  const token = import.meta.env.VITE_META_ACCESS_TOKEN || '';
  const phoneId = import.meta.env.VITE_WHATSAPP_PHONE_ID || '';
  if (!token || !phoneId) return false;
  const results = await Promise.all(
    (contentPayload.phones ?? []).map(p => sendWhatsAppMeta(p, contentPayload.text ?? '', token, phoneId))
  );
  return results.every(Boolean);
}

// ── Telegram Bot ───────────────────────────────────────────────
/**
 * GRATUITO — Bot do Telegram via @BotFather.
 * Envia para um chat_id (pessoa, grupo ou canal).
 * Suporta texto rico com Markdown.
 */
export async function sendTelegramMessage(
  chatId: string, text: string, botToken: string,
  parseMode: 'Markdown' | 'HTML' | 'MarkdownV2' = 'Markdown'
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
    });
    const data = await res.json() as { ok: boolean };
    return data.ok;
  } catch { return false; }
}

/**
 * Obtém informações do bot para verificar o token e mostrar o nome público.
 */
export async function getTelegramBotInfo(botToken: string): Promise<{ username?: string; first_name?: string } | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const data = await res.json() as { ok: boolean; result?: { username: string; first_name: string } };
    return data.ok ? (data.result ?? null) : null;
  } catch { return null; }
}

// ── Email via Resend.com ───────────────────────────────────────
/**
 * GRATUITO — 3.000 emails/mês no plano grátis da Resend.com.
 * Melhor opção para campanhas que precisam de email profissional.
 * Alternativa: SendGrid (100/dia grátis).
 */
export async function sendEmail(
  to: string | string[], subject: string, html: string,
  resendApiKey: string,
  fromEmail: string = 'noreply@campanha.com.br',
  fromName: string = 'CampanhaDigital IA'
): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });
    return res.ok;
  } catch { return false; }
}

// ── Webhook Genérico ───────────────────────────────────────────
/**
 * GRATUITO — Envia um POST para qualquer URL (Zapier, Make, N8N, etc.)
 * Ideal para integrar com automações externas sem custo.
 */
export async function sendWebhook(
  url: string,
  payload: Record<string, unknown>,
  headers?: Record<string, string>
): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(headers ?? {}) },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch { return false; }
}

// ── SMS via Twilio ─────────────────────────────────────────────
/**
 * TRIAL GRATUITO ($15 de crédito) depois ~U$0.0075/SMS.
 * Envia de um número Twilio verificado.
 * Alternativa: Vonage (Nexmo), AWS SNS.
 */
export async function sendSMS(
  to: string, body: string,
  accountSid: string, authToken: string, fromNumber: string
): Promise<boolean> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const form = new URLSearchParams({ To: to, From: fromNumber, Body: body });
    const creds = btoa(`${accountSid}:${authToken}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    return res.ok;
  } catch { return false; }
}
