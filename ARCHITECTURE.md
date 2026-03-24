# ARCHITECTURE.md — CampanhaDigitalIA Multi-Campanha

> **Versão:** 1.0.0 · **Data:** 2026-03-24  
> **Stack:** React 19 + Vite 8 + Tailwind CSS 4 + Firebase 12

---

## 1. Visão Geral

O CampanhaDigitalIA é uma **plataforma SaaS Multi-Tenant** para gestão política de campanhas eleitorais. Cada instância de dado é **isolada por campanha** (`campaign_id`), permitindo que múltiplas campanhas (2026, 2028, etc.) coexistam no mesmo banco sem vazamento de dados.

```
[ Usuário ] → [ AuthContext ] → [ CampaignContext ] → [ Firestore / campaignQuery() ]
                                       ↓
                               [ Isolamento por campaign_id ]
```

---

## 2. Modelo Multi-Tenant

### Princípio Central

**Todo documento Firestore DEVE conter o campo `campaign_id`.**

```typescript
interface BaseDocument {
  id: string;
  campaign_id: string;  // ← OBRIGATÓRIO — isolamento multi-tenant
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

### Função de Isolamento

Toda query deve passar pela função `campaignQuery()`:

```typescript
// src/services/firebase.ts
export function campaignQuery<T>(col, campaignId, ...extras) {
  return query(col, where('campaign_id', '==', campaignId), ...extras);
}
```

O hook `useCampaignQuery` encapsula isso automaticamente para todos os módulos.

---

## 3. Coleções do Firestore

| Coleção | Descrição | Campos principais |
|---|---|---|
| `campaigns` | Metadados de cada campanha (**sem** campaign_id próprio) | `year`, `name`, `active` |
| `users` | Perfis de usuário com roles RBAC | `uid`, `role`, `campaigns[]` |
| `contacts` | Lideranças, eleitores, parceiros | `name`, `cpf`, `city`, `party`, `tags[]` |
| `interactions` | Log de interações com contatos | `contactId`, `type`, `date`, `outcome` |
| `tasks` | Tarefas e atividades da campanha | `title`, `assignedTo`, `status`, `priority` |
| `assets` | Materiais, documentos, fotos | `url`, `type`, `size` |
| `mcp_queue` | Fila de mensagens para agentes AI | `action`, `payload`, `status`, `response` |

### Regras de Segurança Recomendadas (Firestore Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Campanhas — leitura para autenticados, escrita apenas admin
    match /campaigns/{id} {
      allow read: if request.auth != null;
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Coleções com isolamento multi-tenant
    match /{collection}/{id} {
      allow read, write: if
        request.auth != null &&
        resource.data.campaign_id in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.campaigns;
    }
  }
}
```

---

## 4. Estrutura de Pastas

```
campanhadigital-ia/
├── public/
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   └── ui/            # Atoms: CampaignBadge, Button, Card, Modal, etc.
│   ├── context/           # React Contexts
│   │   ├── AuthContext.tsx
│   │   └── CampaignContext.tsx
│   ├── hooks/             # Custom hooks
│   │   └── useCampaignQuery.ts
│   ├── pages/             # Páginas/módulos
│   │   ├── Dashboard/
│   │   ├── Contacts/
│   │   ├── Tasks/
│   │   └── Settings/
│   ├── services/          # Integração com serviços externos
│   │   ├── firebase.ts    # Config + campaignQuery helper
│   │   └── mcp.ts         # Model Context Protocol (IA)
│   ├── types/             # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/             # Helpers puros (formatação, validação)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── ARCHITECTURE.md
├── package.json
└── vite.config.ts
```

---

## 5. CampaignContext — Histórico vs. Ativo

O `CampaignContext` gerencia dois modos de visualização:

| Modo | `viewMode` | Comportamento |
|---|---|---|
| **Campanha Ativa** | `'active'` | Exibe dados da campanha atual selecionada |
| **Consulta Histórica** | `'historical'` | Filtra por `year` (2026 ou 2028) para análise |

```typescript
// Alternando para modo histórico (2028)
const { setViewMode, setHistoricalYear } = useCampaign();
setViewMode('historical');
setHistoricalYear(2028);
```

---

## 6. MCP — Model Context Protocol

A coleção `mcp_queue` funciona como **barramento de mensagens** entre o frontend e agentes autônomos (Manus AI / Meta).

### Fluxo

```
Frontend → addDoc(mcp_queue, { action, payload, status: 'pending' })
              ↓
Agent (Manus AI) observa mcp_queue via onSnapshot
              ↓
Agent processa e atualiza status='done', response=resultado
              ↓
Frontend reage em tempo real via subscribeMCPMessages()
```

### Ações disponíveis

| Ação | Descrição |
|---|---|
| `sync_contacts` | Sincroniza contatos externos |
| `generate_report` | Gera relatório analítico |
| `import_csv` | Importa CSV de contatos |
| `send_whatsapp` | Disparo de mensagens WhatsApp |
| `analyze_network` | Análise de rede de relacionamentos |
| `schedule_visit` | Agenda visitas automáticas |

---

## 7. Provider Stack

```tsx
<QueryClientProvider>      // TanStack Query — cache e estados de servidor
  <AuthProvider>           // Firebase Auth + perfil do usuário
    <CampaignProvider>     // Multi-tenant + modo histórico
      <App />
    </CampaignProvider>
  </AuthProvider>
</QueryClientProvider>
```

---

## 8. Próximos Módulos (Roadmap)

- **Prompt 2** — Módulo de Contatos (CRUD completo + filtros)
- **Prompt 3** — Dashboard com gráficos Recharts
- **Prompt 4** — Módulo de Tarefas e interações
- **Prompt 5** — Import CSV / bulk import
- **Prompt 6** — Painel MCP integrado com Manus AI
