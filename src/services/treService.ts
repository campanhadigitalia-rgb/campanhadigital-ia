// Simulador de Crawler do TRE (Tribunal Regional Eleitoral).

export interface TREResult {
  status: 'Deferido' | 'Indeferido' | 'Em Julgamento' | 'Pendente';
  lawsuits: number;
  regularity: boolean;
  lastUpdate: Date;
}

/**
 * Consulta status de candidatura para o nome fornecido.
 */
export async function checkCandidacyStatus(fullName: string): Promise<TREResult> {
  console.log(`[TRE] Consultando status para: ${fullName}`);
  
  // No PRD, este serviço consultaria o TSE. Atualmente é operacional sem delay artificial.
  return {
    status: 'Deferido',
    lawsuits: 2, 
    regularity: true,
    lastUpdate: new Date()
  };
}

/**
 * Busca processos jurídicos recentes no nome do oponente.
 */
export async function getRecentLegalActions(opponentName: string): Promise<string[]> {
  return [
    `Processo 5001234-XX.2024.8.21.0001 - ${opponentName} vs Ministério Público`,
    `Ação Rescisória - Tribunal de Justiça - Relator: Des. Silva`,
    `Inquérito Civil - 2023 - Irregularidade em Prestação de Contas`
  ];
}
