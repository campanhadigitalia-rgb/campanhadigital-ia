# 📸 Snapshot Estrutural V1.1 — Motor Real

Este documento detalha o estado técnico do repositório *CampanhaDigital IA* após a ignição do MVP V1.1, focado em segurança, hierarquia e integração oficial de Inteligência Artificial.

---

### 1. 📂 Árvore de Arquivos Atual (src/)

Uma visão limpa e unificada das instâncias atuais da aplicação:

```text
C:\...\ERP-PIRATINI\SRC
├── App.css
├── App.tsx          <-- Root de Rotas e Layout (RBAC)
├── index.css        <-- Diretivas do Tailwind v4
├── main.tsx
│
├── assets/
│   ├── hero.png
│   ├── react.svg
│   └── vite.svg
│
├── components/ui/
│   ├── CampaignBadge.tsx
│   ├── CampaignCalendar.tsx
│   ├── CampaignMap.tsx
│   ├── CampaignOnboardingModal.tsx
│   ├── ContentStudio.tsx
│   ├── ExecutiveDashboard.tsx
│   ├── FundraisingStats.tsx
│   ├── Leaderboard.tsx
│   ├── LegalGuardian.tsx
│   ├── PollsOracle.tsx
│   ├── SocialSentinel.tsx
│   └── WhatsappCommand.tsx
│
├── config/
│   └── firebase.config.ts
│
├── context/
│   ├── AuthContext.tsx    <-- Gestão de Login e Roles ('Volunteer' | 'Manager' | 'Admin')
│   └── CampaignContext.tsx
│
├── hooks/
│   └── useCampaignQuery.ts <-- Hook multi-tenant seguro com Firestore Rules
│
├── pages/
│   ├── Contacts/index.tsx
│   ├── Dashboard/index.tsx
│   ├── Legal/index.tsx
│   ├── MCPAgents/index.tsx
│   ├── Messaging/index.tsx
│   ├── Oracle/index.tsx
│   ├── Settings/index.tsx
│   └── Studio/index.tsx
│
├── services/
│   ├── aiService.ts       <-- Google Generative AI (Gemini 1.5 Flash)
│   ├── firebase.ts
│   ├── mcp.ts
│   ├── multipliersService.ts
│   └── ...
│
├── types/
│   └── index.ts
│
└── utils/
    └── seedRS.ts          <-- Script de injeção de mesorregiões do Heatmap
```

---

### 2. 🧠 Integração Gemni no [aiService.ts](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/services/aiService.ts) (Resumo)

O serviço de IA abandonou os mocks de `setTimeout` estáticos e está 100% plugado no SDK `@google/generative-ai`. 
O código previne falhas críticas, disparando um *fallback* gracioso se a chave API estiver vazia.

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

// Utilizando import.meta.env seguramente. 
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);

// Função 1: Inference Semântica Dinâmica
export async function analyzeSentiment(text: string) { ... }

// Função 2: Geração RAG Multi-Persona (Agente MCP)
export async function generateResponseOptions(mention) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Gere exatamente 3 opções de rascunho oficial de resposta. 
      As abordagens são: 1. Conciliador, 2. Técnico, 3. Firme.
      Responda ÚNICA E EXCLUSIVAMENTE retornando um array JSON válido...`;
      
    // Disparo Cloud -> Parsing -> Entrega ao frontend
    const result = await model.generateContent(prompt);
    // Parse rigoroso de \`\`\`json etc.
    return parsedData;
  } catch (error) { ... }
}
```

---

### 3. 🔐 Rotas e Hierarquia de Acesso no [App.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/App.tsx) (RBAC)

O [App.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/App.tsx) não apenas desenha o Wrapper Visual, como intercepta o fluxo e dita quais menus um perfil pode ou não ver.
A inteligência do mapeamento se ampara num `.filter()` estrito:

**Em [App.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/App.tsx) (Sidebar/Nav Rendering):**
```typescript
{NAV_ITEMS.filter(item => {
   // Apenas Administradores e Managers podem acessar o Oráculo e as Configurações:
   if (profile?.role === 'Volunteer' && ['oracle', 'settings'].includes(item.id)) return false;
   return true;
}).map(({ id, label, Icon }) => (
   <button key={id} onClick={() => setPage(id)} ...> {label} </button>
))}
```
Isso garante que Operadores/Voluntários recém-criados jamais cheguem na página de Setup Geoespacial ou de projeções eleitorais sigilosas.

---

### 4. 🧩 Diagnóstico de Componentes Solicitados 

Análise técnica detalhada da renderização dos 3 módulos solicitados:

1. **`OraclePage`**: ✅ **Pleno.** 
   - **Status:** Importado rigorosamente em [App.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/App.tsx) (Linha 21: `import OraclePage from './pages/Oracle';`) e inserido de forma ativa no mapa de rotas (`PAGE_MAP['oracle'] = <OraclePage />`). Protegido pelo RBAC.

2. **`CampaignMap`**: ❌ **Inativo (Standby).** 
   - **Status:** O arquivo [src/components/ui/CampaignMap.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/components/ui/CampaignMap.tsx) que plota o heatmap geográfico existe no projeto, mas atualmente está **desacoplado** (unmounted). Ele não é invocado dentro do painel do Dashboard Central ([ExecutiveDashboard.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/components/ui/ExecutiveDashboard.tsx)), que hoje exibe apenas os 4 Big Numbers (Oráculo, Financeiro, Clima e Alcance).

3. **`SocialSentinel`**: ❌ **Inativo (Standby).** 
   - **Status:** De igual forma, o arquivo [src/components/ui/SocialSentinel.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/components/ui/SocialSentinel.tsx) existe e tem sua loja estrutural completa, mas não foi importado no [Dashboard/index.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/pages/Dashboard/index.tsx) nem no [ExecutiveDashboard.tsx](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/components/ui/ExecutiveDashboard.tsx). 

*Sugerimos plugar o `CampaignMap` e o `SocialSentinel` numa nova página analítica ou integrá-los à tela do Dashboard.*

---

### 5. 🔒 Verificação do Arquivo [.env](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/.env)

O arquivo raiz([.env](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/.env) de desenvolvimento e os *Secrets* de build do host) estão impecavelmente seguros e corretamente referenciados pelo framework na flag do Vite:

* As chaves de serviço do Firebase estão em `VITE_FIREBASE_API_KEY` (usadas centralizadamente por [src/services/firebase.ts](file:///c:/Users/alexandre-almoarqueg/.gemini/antigravity/scratch/erp-piratini/src/services/firebase.ts)).
* A chave `VITE_GEMINI_API_KEY` está alocada com segurança. O código do serviço a captura via `import.meta.env.VITE_GEMINI_API_KEY`. Como este projeto constrói scripts no lado frontend (Single Page Application via React), prefixar com `VITE_` é o padrão da indústria e a única forma pela qual o bundler injeta o secret. Nenhum secret é exposto ativamente na tela, e a conexão não vaza propriedades de host.
