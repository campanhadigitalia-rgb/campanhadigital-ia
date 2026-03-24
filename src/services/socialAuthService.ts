/**
 * Serviço de Conectividade Social (Meta OAuth Flow).
 * Permite que o Admin conecte Instagram e Facebook para leitura de comentários.
 */

export interface SocialAccount {
  platform: 'instagram' | 'facebook';
  connected: boolean;
  username?: string;
  accessToken?: string;
}

/**
 * Inicia o fluxo de autenticação via Popup (Simulado para o Dashboard).
 */
export async function connectSocialAccount(platform: 'instagram' | 'facebook'): Promise<SocialAccount> {
  console.log(`[SocialAuth] Iniciando OAuth para: ${platform}`);
  
  // Em produção: usar Firebase Auth + Facebook Provider ou SDK da Meta
  // window.open(`https://www.facebook.com/v19.0/dialog/oauth?client_id=...`);
  
  await new Promise(r => setTimeout(r, 2000));

  return {
    platform,
    connected: true,
    username: platform === 'instagram' ? '@campanha_oficial' : 'Campanha Digital IA Oficial',
    accessToken: 'EAAYX...'
  };
}

export async function disconnectSocialAccount(platform: string): Promise<void> {
  console.log(`[SocialAuth] Desconectando: ${platform}`);
  await new Promise(r => setTimeout(r, 500));
}
