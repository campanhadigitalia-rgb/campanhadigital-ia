// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Output Channels Settings
//  Configuração de todos os canais de SAÍDA (envio) da campanha.
//  Segue a mesma lógica visual dos Mecanismos de Busca.
// ──────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  MessageCircle, Mail, Webhook, Phone, Bot, Zap,
  Save, Loader2, CheckCircle, XCircle, Eye, EyeOff,
  ChevronDown, ChevronUp, Info, ExternalLink, Send,
  AlertCircle, Hash, AtSign, Smartphone
} from 'lucide-react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import {
  sendTelegramMessage, getTelegramBotInfo, sendEmail,
  sendWebhook, sendSMS, sendWhatsAppMeta, sendWhatsAppZAPI
} from '../../services/messagingService';

// ── Tipos de configuração ──────────────────────────────────────

interface OutputConfig {
  // Telegram (GRÁTIS)
  telegramEnabled: boolean;
  telegramBotToken: string;
  telegramDefaultChatId: string;
  telegramBotName?: string;       // preenchido após teste
  telegramBotUsername?: string;

  // Email Resend (GRÁTIS 3k/mês)
  emailEnabled: boolean;
  emailResendKey: string;
  emailFromAddress: string;       // ex: campanha@seudominio.com
  emailFromName: string;          // ex: Campanha João Silva

  // Webhook genérico (GRÁTIS)
  webhookEnabled: boolean;
  webhookUrl: string;
  webhookSecret: string;          // Header Authorization opcional

  // Z-API / Evolution (alternativa barata)
  zapiEnabled: boolean;
  zapiInstanceId: string;
  zapiToken: string;
  zapiPhone: string;              // número vinculado à instância

  // WhatsApp Business Meta (PAGO)
  whatsappMetaEnabled: boolean;
  whatsappMetaToken: string;
  whatsappMetaPhoneId: string;    // ID do número no Meta Business
  whatsappMetaPhoneDisplay: string; // Número formatado: +55 51 99999-9999

  // Twilio SMS (PAGO com trial)
  twilioEnabled: boolean;
  twilioSid: string;
  twilioToken: string;
  twilioFromNumber: string;       // número Twilio: +15005550006

  // Número padrão para testes
  testRecipientPhone: string;
  testRecipientEmail: string;
}

const DEFAULT: OutputConfig = {
  telegramEnabled: false, telegramBotToken: '', telegramDefaultChatId: '',
  emailEnabled: false, emailResendKey: '', emailFromAddress: '', emailFromName: '',
  webhookEnabled: false, webhookUrl: '', webhookSecret: '',
  zapiEnabled: false, zapiInstanceId: '', zapiToken: '', zapiPhone: '',
  whatsappMetaEnabled: false, whatsappMetaToken: '', whatsappMetaPhoneId: '', whatsappMetaPhoneDisplay: '',
  twilioEnabled: false, twilioSid: '', twilioToken: '', twilioFromNumber: '',
  testRecipientPhone: '', testRecipientEmail: '',
};

// ── Sub-components ─────────────────────────────────────────────

function SectionCard({
  title, icon, color, tier, children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; color: string;
  tier: 'free' | 'cheap' | 'paid'; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const badges = {
    free:  { label: '✓ Grátis',       cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    cheap: { label: '≈ Alternativa $', cls: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
    paid:  { label: '$ Pago',          cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  };
  const badge = badges[tier];
  return (
    <div className="glass-card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center ${color}`}>{icon}</div>
          <span className="font-bold text-slate-200">{title}</span>
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ml-1 ${badge.cls}`}>{badge.label}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-white/5 flex flex-col gap-4">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div onClick={() => onChange(!checked)} className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className="text-sm text-slate-300">{label}</span>
    </label>
  );
}

function MaskedKey({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex gap-2">
      <input type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? 'Cole aqui'}
        className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono" />
      <button onClick={() => setVisible(v => !v)} className="px-3 py-2 rounded-md bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200">
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-slate-300">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-500">{hint}</p>}
    </div>
  );
}

function InfoBox({ type, children }: { type: 'info' | 'warn' | 'tip'; children: React.ReactNode }) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-200',
    warn: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
    tip:  'bg-emerald-500/10 border-emerald-500/20 text-emerald-200',
  };
  return (
    <div className={`border rounded-lg p-3 flex gap-2 ${styles[type]}`}>
      <Info size={14} className="shrink-0 mt-0.5 opacity-70" />
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

function TestButton({
  label, onClick, status,
}: { label: string; onClick: () => void; status: 'idle' | 'sending' | 'ok' | 'fail' }) {
  return (
    <button onClick={onClick} disabled={status === 'sending'}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-colors disabled:opacity-50">
      {status === 'sending' ? <Loader2 size={12} className="animate-spin" /> :
       status === 'ok' ? <CheckCircle size={12} className="text-emerald-400" /> :
       status === 'fail' ? <XCircle size={12} className="text-rose-400" /> :
       <Send size={12} />}
      {label}
    </button>
  );
}

/** Card mostrando "de onde vai sair" a mensagem para o receptor */
function OriginCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-indigo-300 truncate">{value}</p>
        {sublabel && <p className="text-[10px] text-slate-500">{sublabel}</p>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export default function OutputChannelsSettings() {
  const { activeCampaign } = useCampaign();
  const campaignId = activeCampaign?.id;

  const [cfg, setCfg] = useState<OutputConfig>(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Test states
  const [tgStatus, setTgStatus]         = useState<'idle'|'sending'|'ok'|'fail'>('idle');
  const [tgBotInfo, setTgBotInfo]       = useState<{username?: string; first_name?: string} | null>(null);
  const [emailStatus, setEmailStatus]   = useState<'idle'|'sending'|'ok'|'fail'>('idle');
  const [webhookStatus, setWebhookStatus] = useState<'idle'|'sending'|'ok'|'fail'>('idle');
  const [smsStatus, setSmsStatus]       = useState<'idle'|'sending'|'ok'|'fail'>('idle');
  const [zapiStatus, setZapiStatus]     = useState<'idle'|'sending'|'ok'|'fail'>('idle');
  const [metaStatus, setMetaStatus]     = useState<'idle'|'sending'|'ok'|'fail'>('idle');

  // Load
  useEffect(() => {
    if (!campaignId) return;
    getDoc(doc(db, 'output_configs', campaignId)).then(snap => {
      if (snap.exists()) setCfg(prev => ({ ...prev, ...(snap.data() as Partial<OutputConfig>) }));
    });
  }, [campaignId]);

  const handleSave = useCallback(async () => {
    if (!campaignId) return;
    setSaving(true);
    await setDoc(doc(db, 'output_configs', campaignId), { ...cfg, campaign_id: campaignId, updatedAt: serverTimestamp() });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000);
  }, [cfg, campaignId]);

  const set = <K extends keyof OutputConfig>(k: K, v: OutputConfig[K]) => setCfg(c => ({ ...c, [k]: v }));

  // Tests
  const testTelegram = async () => {
    if (!cfg.telegramBotToken || !cfg.telegramDefaultChatId) return;
    setTgStatus('sending');
    const ok = await sendTelegramMessage(cfg.telegramDefaultChatId, '✅ *CampanhaDigital IA* — Teste de conexão bem-sucedido!', cfg.telegramBotToken);
    setTgStatus(ok ? 'ok' : 'fail');
    if (ok) {
      const info = await getTelegramBotInfo(cfg.telegramBotToken);
      if (info) { setTgBotInfo(info); setCfg(c => ({ ...c, telegramBotName: info.first_name, telegramBotUsername: info.username })); }
    }
  };

  const testEmail = async () => {
    if (!cfg.emailResendKey || !cfg.testRecipientEmail) return;
    setEmailStatus('sending');
    const ok = await sendEmail(cfg.testRecipientEmail, '✅ CampanhaDigital IA — Teste',
      `<h2>Teste de Email</h2><p>Configuração de email funcionando corretamente!</p><p><strong>De:</strong> ${cfg.emailFromName} &lt;${cfg.emailFromAddress}&gt;</p>`,
      cfg.emailResendKey, cfg.emailFromAddress, cfg.emailFromName);
    setEmailStatus(ok ? 'ok' : 'fail');
  };

  const testWebhook = async () => {
    if (!cfg.webhookUrl) return;
    setWebhookStatus('sending');
    const ok = await sendWebhook(cfg.webhookUrl, { event: 'test', source: 'CampanhaDigitalIA', campaign: activeCampaign?.name, timestamp: new Date().toISOString() },
      cfg.webhookSecret ? { Authorization: cfg.webhookSecret } : undefined);
    setWebhookStatus(ok ? 'ok' : 'fail');
  };

  const testSMS = async () => {
    if (!cfg.twilioSid || !cfg.twilioToken || !cfg.twilioFromNumber || !cfg.testRecipientPhone) return;
    setSmsStatus('sending');
    const ok = await sendSMS(cfg.testRecipientPhone, '✅ CampanhaDigital IA — Teste de SMS', cfg.twilioSid, cfg.twilioToken, cfg.twilioFromNumber);
    setSmsStatus(ok ? 'ok' : 'fail');
  };

  const testZAPI = async () => {
    if (!cfg.zapiInstanceId || !cfg.zapiToken || !cfg.testRecipientPhone) return;
    setZapiStatus('sending');
    const ok = await sendWhatsAppZAPI(cfg.testRecipientPhone, '✅ *CampanhaDigital IA* — Teste via Z-API', cfg.zapiInstanceId, cfg.zapiToken);
    setZapiStatus(ok ? 'ok' : 'fail');
  };

  const testMeta = async () => {
    if (!cfg.whatsappMetaToken || !cfg.whatsappMetaPhoneId || !cfg.testRecipientPhone) return;
    setMetaStatus('sending');
    const ok = await sendWhatsAppMeta(cfg.testRecipientPhone, '✅ CampanhaDigital IA — Teste WhatsApp', cfg.whatsappMetaToken, cfg.whatsappMetaPhoneId);
    setMetaStatus(ok ? 'ok' : 'fail');
  };

  if (!activeCampaign) {
    return <div className="flex items-center justify-center py-16 text-slate-500 gap-3"><AlertCircle size={20} /> Selecione uma campanha.</div>;
  }

  const SaveBtn = () => (
    <button onClick={handleSave} disabled={saving}
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-bold">
      {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Save size={14} />}
      {saved ? 'Salvo!' : 'Salvar Configurações'}
    </button>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-400">Configure os canais pelos quais a campanha envía mensagens, alertas e comunicados.</p>
        <SaveBtn />
      </div>

      {/* ── Resumo "De onde sai" ────────────────────────────── */}
      <div className="glass-card p-5">
        <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2"><Zap size={15} className="text-yellow-400" /> O que o destinatário vê ao receber</h3>
        <p className="text-xs text-slate-500 mb-4">Cada canal configurado aparece abaixo mostrando exatamente como aparece para quem recebe.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cfg.telegramEnabled && (cfg.telegramBotName || cfg.telegramBotUsername) && (
            <OriginCard icon={<Bot size={14} />} label="Telegram — Bot remetente" value={`@${cfg.telegramBotUsername ?? ''}`} sublabel={cfg.telegramBotName} />
          )}
          {cfg.emailEnabled && cfg.emailFromAddress && (
            <OriginCard icon={<AtSign size={14} />} label="Email — Endereço remetente" value={cfg.emailFromAddress} sublabel={cfg.emailFromName || undefined} />
          )}
          {cfg.zapiEnabled && cfg.zapiPhone && (
            <OriginCard icon={<MessageCircle size={14} />} label="WhatsApp (Z-API) — Número" value={cfg.zapiPhone} sublabel="Aparece como número comum no WhatsApp" />
          )}
          {cfg.whatsappMetaEnabled && cfg.whatsappMetaPhoneDisplay && (
            <OriginCard icon={<MessageCircle size={14} />} label="WhatsApp Business — Número oficial" value={cfg.whatsappMetaPhoneDisplay} sublabel="Aparece com selo de empresa verificada ✅" />
          )}
          {cfg.twilioEnabled && cfg.twilioFromNumber && (
            <OriginCard icon={<Smartphone size={14} />} label="SMS — Número Twilio" value={cfg.twilioFromNumber} sublabel="Número internacional (+1 EUA)" />
          )}
          {cfg.webhookEnabled && cfg.webhookUrl && (
            <OriginCard icon={<Webhook size={14} />} label="Webhook — Enviando para" value={new URL(cfg.webhookUrl).hostname} sublabel={cfg.webhookUrl.substring(0, 60) + '...'} />
          )}
          {!cfg.telegramEnabled && !cfg.emailEnabled && !cfg.zapiEnabled && !cfg.whatsappMetaEnabled && !cfg.twilioEnabled && !cfg.webhookEnabled && (
            <p className="text-xs text-slate-600 italic col-span-2">Nenhum canal ativo. Configure abaixo.</p>
          )}
        </div>
      </div>

      {/* Campo de teste global */}
      <div className="glass-card p-4 flex gap-4 flex-wrap">
        <div className="flex-1 min-w-40">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Número para testes</label>
          <input value={cfg.testRecipientPhone} onChange={e => set('testRecipientPhone', e.target.value)}
            placeholder="+5551999999999" className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
        <div className="flex-1 min-w-40">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email para testes</label>
          <input value={cfg.testRecipientEmail} onChange={e => set('testRecipientEmail', e.target.value)}
            placeholder="seu@email.com" className="w-full mt-1 px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
        </div>
      </div>

      {/* ── 1. Telegram Bot ──────────────────────────────────── */}
      <SectionCard title="Telegram Bot" icon={<Bot size={16} />} color="text-sky-400" tier="free" defaultOpen>
        <Toggle checked={cfg.telegramEnabled} onChange={v => set('telegramEnabled', v)} label="Canal ativo" />
        <InfoBox type="tip">
          <strong>100% Gratuito.</strong> Crie um bot em segundos: abra o Telegram → busque <strong>@BotFather</strong> → /newbot → copie o token.<br />
          Para obter o chat_id: envie uma mensagem ao bot e acesse: <code>api.telegram.org/botSEU_TOKEN/getUpdates</code>
        </InfoBox>
        <Field label="Token do Bot" hint="Formato: 1234567890:AAHdqTcvCH...">
          <MaskedKey value={cfg.telegramBotToken} onChange={v => set('telegramBotToken', v)} placeholder="1234567890:AAHdqTcv..." />
        </Field>
        <Field label="Chat ID padrão" hint="ID do grupo, canal ou conversa para receber alertas automáticos.">
          <input value={cfg.telegramDefaultChatId} onChange={e => set('telegramDefaultChatId', e.target.value)}
            placeholder="-1001234567890 ou @seucanal" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
        </Field>
        {tgBotInfo && (
          <OriginCard icon={<Bot size={14} />} label="Bot identificado" value={`@${tgBotInfo.username ?? ''}`} sublabel={tgBotInfo.first_name} />
        )}
        <div className="flex gap-2 items-center flex-wrap">
          <TestButton label="Enviar mensagem de teste" onClick={testTelegram} status={tgStatus} />
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
            <ExternalLink size={10} /> @BotFather
          </a>
        </div>
      </SectionCard>

      {/* ── 2. Email Resend ──────────────────────────────────── */}
      <SectionCard title="Email (Resend.com)" icon={<Mail size={16} />} color="text-violet-400" tier="free">
        <Toggle checked={cfg.emailEnabled} onChange={v => set('emailEnabled', v)} label="Canal ativo" />
        <InfoBox type="tip">
          <strong>Grátis: 3.000 emails/mês</strong> (100/dia). Melhor opção para comunicados formais, boletins e alertas. Alternativa: SendGrid (100/dia grátis).<br />
          Precisa verificar o domínio remetente ou usar um subdomínio Resend (@resend.dev para testes sem verificação).
        </InfoBox>
        <Field label="API Key Resend" hint="Obtenha em resend.com → API Keys → Create API Key">
          <MaskedKey value={cfg.emailResendKey} onChange={v => set('emailResendKey', v)} placeholder="re_..." />
          <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 flex items-center gap-1 mt-1">
            <ExternalLink size={10} /> resend.com/api-keys
          </a>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email remetente" hint="Ex: campanha@seudominio.com.br">
            <input value={cfg.emailFromAddress} onChange={e => set('emailFromAddress', e.target.value)}
              placeholder="campanha@seudominio.com" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
          </Field>
          <Field label="Nome remetente" hint="Nome que aparece no campo 'De:' do email">
            <input value={cfg.emailFromName} onChange={e => set('emailFromName', e.target.value)}
              placeholder="João Silva — Campanha 2026" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
          </Field>
        </div>
        {cfg.emailFromAddress && (
          <OriginCard icon={<Mail size={14} />} label="Email aparece para o destinatário como" value={cfg.emailFromAddress} sublabel={cfg.emailFromName} />
        )}
        <TestButton label="Enviar email de teste" onClick={testEmail} status={emailStatus} />
      </SectionCard>

      {/* ── 3. Webhook ───────────────────────────────────────── */}
      <SectionCard title="Webhook Genérico (Zapier / N8N / Make)" icon={<Webhook size={16} />} color="text-teal-400" tier="free">
        <Toggle checked={cfg.webhookEnabled} onChange={v => set('webhookEnabled', v)} label="Canal ativo" />
        <InfoBox type="info">
          <strong>Gratuito.</strong> Integre com qualquer automação: Zapier (5 zaps grátis), Make/Integromat (1.000 ops/mês grátis), N8N (self-hosted grátis).<br />
          Use para disparar WhatsApp, criar tarefas no Trello, mandar para Slack, etc — tudo por POST JSON.
        </InfoBox>
        <Field label="URL do Webhook">
          <input value={cfg.webhookUrl} onChange={e => set('webhookUrl', e.target.value)}
            placeholder="https://hooks.zapier.com/hooks/catch/..." className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
        </Field>
        <Field label="Token de autenticação (opcional)" hint="Enviado no header Authorization do POST">
          <MaskedKey value={cfg.webhookSecret} onChange={v => set('webhookSecret', v)} placeholder="Bearer token ou qualquer string" />
        </Field>
        <div className="bg-black/20 rounded-lg p-3">
          <p className="text-[10px] text-slate-400 font-bold mb-1">Payload enviado:</p>
          <pre className="text-[10px] text-slate-500 font-mono overflow-x-auto">{JSON.stringify({ event: 'alert|monitoring|broadcast', source: 'CampanhaDigitalIA', campaign: activeCampaign.name, data: {}, timestamp: 'ISO8601' }, null, 2)}</pre>
        </div>
        <TestButton label="Testar Webhook" onClick={testWebhook} status={webhookStatus} />
      </SectionCard>

      {/* ── 4. Z-API ─────────────────────────────────────────── */}
      <SectionCard title="WhatsApp via Z-API (alternativa ao Meta)" icon={<MessageCircle size={16} />} color="text-emerald-400" tier="cheap">
        <Toggle checked={cfg.zapiEnabled} onChange={v => set('zapiEnabled', v)} label="Canal ativo" />
        <InfoBox type="info">
          <strong>Versão alternativa mais barata.</strong> Funciona conectando um número comum de WhatsApp via sessão web (como WhatsApp Web). Não precisa de conta Meta Business. Planos a partir de <strong>R$ 50/mês</strong>.<br />
          ⚠️ O WhatsApp pode suspender números usados em massa sem verificação Meta. Ideal para campanhas iniciantes.
        </InfoBox>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Instance ID" hint="Código da instância no painel Z-API">
            <input value={cfg.zapiInstanceId} onChange={e => set('zapiInstanceId', e.target.value)}
              placeholder="3A50F..." className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
          </Field>
          <Field label="Token Z-API">
            <MaskedKey value={cfg.zapiToken} onChange={v => set('zapiToken', v)} placeholder="seu-token-zapi" />
          </Field>
        </div>
        <Field label="Número vinculado" hint="Número de celular conectado na instância (ex: +55 51 99999-9999). Este é o número que aparece para quem recebe.">
          <input value={cfg.zapiPhone} onChange={e => set('zapiPhone', e.target.value)}
            placeholder="+55 51 99999-9999" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
        </Field>
        {cfg.zapiPhone && (
          <OriginCard icon={<MessageCircle size={14} />} label="WhatsApp remetente (o que a pessoa vê)" value={cfg.zapiPhone} sublabel="Aparece como número comum. Não tem selo de verificação." />
        )}
        <div className="flex gap-2 flex-wrap">
          <TestButton label="Enviar WhatsApp de teste" onClick={testZAPI} status={zapiStatus} />
          <a href="https://z-api.io" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 flex items-center gap-1">
            <ExternalLink size={10} /> z-api.io
          </a>
        </div>
      </SectionCard>

      {/* ── 5. WhatsApp Meta Business ────────────────────────── */}
      <SectionCard title="WhatsApp Business (Meta — versão ideal)" icon={<MessageCircle size={16} />} color="text-green-400" tier="paid">
        <Toggle checked={cfg.whatsappMetaEnabled} onChange={v => set('whatsappMetaEnabled', v)} label="Canal ativo" />
        <InfoBox type="warn">
          <strong>Versão profissional paga.</strong> Taxa por conversa iniciada (aprox. R$ 0,25–R$ 1,00 dependendo da categoria). Número verificado com <strong>selo Meta ✅</strong>, mais confiança e sem risco de suspensão.<br />
          Ideal após a campanha crescer. Requer conta no <strong>Meta Business Manager</strong> e CNPJ.
        </InfoBox>
        <Field label="Token de Acesso (User Access Token)" hint="Meta Business → Configurações → Sistema de usuário → Access Token">
          <MaskedKey value={cfg.whatsappMetaToken} onChange={v => set('whatsappMetaToken', v)} placeholder="EAABs..." />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Phone Number ID" hint="ID do número no Meta Business Manager (somente números)">
            <input value={cfg.whatsappMetaPhoneId} onChange={e => set('whatsappMetaPhoneId', e.target.value)}
              placeholder="123456789012345" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
          </Field>
          <Field label="Número formatado (para exibição)" hint="Como aparece para quem recebe: +55 51 3333-4444">
            <input value={cfg.whatsappMetaPhoneDisplay} onChange={e => set('whatsappMetaPhoneDisplay', e.target.value)}
              placeholder="+55 51 3333-4444" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
          </Field>
        </div>
        {cfg.whatsappMetaPhoneDisplay && (
          <OriginCard icon={<MessageCircle size={14} />} label="WhatsApp remetente verificado" value={cfg.whatsappMetaPhoneDisplay} sublabel="✅ Aparece com nome da empresa e selo de verificação Meta" />
        )}
        <div className="flex gap-2 flex-wrap">
          <TestButton label="Enviar WhatsApp de teste" onClick={testMeta} status={metaStatus} />
          <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 flex items-center gap-1">
            <ExternalLink size={10} /> Meta Business Manager
          </a>
        </div>
      </SectionCard>

      {/* ── 6. Twilio SMS ────────────────────────────────────── */}
      <SectionCard title="SMS via Twilio" icon={<Phone size={16} />} color="text-rose-400" tier="paid">
        <Toggle checked={cfg.twilioEnabled} onChange={v => set('twilioEnabled', v)} label="Canal ativo" />
        <InfoBox type="info">
          <strong>Trial grátis com US$ 15 de crédito</strong> (~2.000 SMS). Depois ~U$ 0.0075/SMS. Ideal para alertas urgentes e OTPs.<br />
          O número Twilio é americano (+1). Para número brasileiro precisaria de um número local (disponível no plano pago).
        </InfoBox>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Account SID" hint="Twilio Console → Account Info → Account SID">
            <MaskedKey value={cfg.twilioSid} onChange={v => set('twilioSid', v)} placeholder="ACxxxxxxxx..." />
          </Field>
          <Field label="Auth Token">
            <MaskedKey value={cfg.twilioToken} onChange={v => set('twilioToken', v)} placeholder="seu auth token" />
          </Field>
        </div>
        <Field label="Número Twilio (remetente do SMS)" hint="Número que aparece no celular de quem recebe. Formato: +15005550006">
          <input value={cfg.twilioFromNumber} onChange={e => set('twilioFromNumber', e.target.value)}
            placeholder="+15005550006" className="px-3 py-2 rounded-md bg-black/40 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none" />
        </Field>
        {cfg.twilioFromNumber && (
          <OriginCard icon={<Hash size={14} />} label="SMS enviado pelo número" value={cfg.twilioFromNumber} sublabel="Número internacional Twilio" />
        )}
        <div className="flex gap-2 flex-wrap">
          <TestButton label="Enviar SMS de teste" onClick={testSMS} status={smsStatus} />
          <a href="https://console.twilio.com" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-400 flex items-center gap-1">
            <ExternalLink size={10} /> console.twilio.com
          </a>
        </div>
      </SectionCard>

      <div className="pb-6">
        <button onClick={handleSave} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20">
          {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Configurações Salvas!' : 'Salvar Todos os Canais'}
        </button>
      </div>
    </div>
  );
}
