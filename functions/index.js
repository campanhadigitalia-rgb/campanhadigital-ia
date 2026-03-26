const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// Configurações e Logs de Billing
// Custo será debitado dos créditos de US$ 300 atrelados ao VITE_GEMINI_API_KEY
const API_KEY = process.env.VITE_GEMINI_API_KEY || functions.config().gemini?.key; 
const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Utilitário Interno: Simula o Billing Monitor para o Backend
 */
function logBackendBilling(serviceName, textInput, textOutput) {
  // $1.25 / 1M input tokens + $3.75 / 1M output tokens (Estimativa Pro)
  const estIn = Math.ceil((textInput?.length || 0) / 4);
  const estOut = Math.ceil((textOutput?.length || 0) / 4);
  const cost = (estIn * (1.25 / 1000000)) + (estOut * (3.75 / 1000000));
  
  functions.logger.info(`💰 [Billing Backend] [${serviceName}] $${cost.toFixed(6)} estimados.`);
}

/**
 * Webhook para Meta (WhatsApp/Instagram)
 * Recebe mensagens orgânicas, passa pela IA (Gemini Pro) e salva no CRM
 */
exports.metaWebhookEndpoint = functions.https.onRequest(async (req, res) => {
  // 1. Verificação de Auth do Webhook da Meta
  if (req.method === 'GET') {
    const verifyToken = "campanha_digital_ia_secret"; // Trocar por config real
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === verifyToken) {
        functions.logger.info("Meta Webhook verificado.");
        res.status(200).send(challenge);
        return;
      } else {
        res.sendStatus(403);
        return;
      }
    }
  }

  // 2. Processamento do Payload (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;
      functions.logger.info("Recebido Evento Meta:", JSON.stringify(body));

      // Simulando extração de mensagem de um evento do WhatsApp Cloud API
      const messageText = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || "Mensagem vazia";
      const fromNumber = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from || "unknown";

      if (messageText !== "Mensagem vazia") {
        if (!API_KEY) {
          functions.logger.warn("Chave Gemini ausente no backend.");
          res.status(200).send('EVENT_RECEIVED');
          return;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
        const prompt = `Analise a seguinte mensagem enviada via WhatsApp por um eleitor para a campanha oficial.
        Mensagem: "${messageText}"
        Identifique o sentimento, o tema principal e gere uma resposta preliminar estruturada sugerindo se é um doador em potencial, uma denúncia ou um eleitor comum pedindo informações. Retorne em JSON.`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        logBackendBilling("MetaWebhookAnalysis", prompt, text);

        // 3. Salvar no Firestore (CRM/Inbox da Aplicação)
        await admin.firestore().collection("inbound_messages").add({
          source: "whatsapp",
          sender: fromNumber,
          originalText: messageText,
          aiAnalysis: text,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        functions.logger.info("Mensagem processada e salva com análise do Gemini Pro.");
      }

      res.status(200).send('EVENT_RECEIVED');
    } catch (error) {
      functions.logger.error("Erro ao processar Webhook:", error);
      res.status(500).send("INTERNAL_SERVER_ERROR");
    }
  }
});
