// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — OSINT Proxy Helper
//  Roteador de fallbacks para contornar bloqueios de CORS 
//  no frontend ao realizar raspagens de dados em fontes abertas.
// ──────────────────────────────────────────────────────────────
import { logger } from './logger';

interface ProxyStrategy {
  name: string;
  buildUrl: (url: string) => string;
  extract: (res: Response) => Promise<string>;
}

const PROXIES: ProxyStrategy[] = [
  {
    name: 'AllOrigins',
    buildUrl: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    extract: async (res) => {
      const data = await res.json();
      if (!data.contents) throw new Error('AllOrigins: JSON sem contents');
      return data.contents as string;
    }
  },
  {
    name: 'CorsProxyIO',
    buildUrl: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    extract: async (res) => res.text()
  },
  {
    name: 'CodeTabs',
    buildUrl: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    extract: async (res) => res.text()
  }
];

/**
 * Busca o conteúdo de uma URL na internet lidando com CORS.
 * Tenta múltiplos proxies públicos em sequência (fallback).
 * 
 * TBD / Backend Migration:
 * No futuro, com a arquitetura backend configurada, basta trocar
 * o loop de proxies abaixo por uma chamada única para a Cloud Function:
 * @example
 * const res = await fetch(`https://us-central1-campanhadigitalia.cloudfunctions.net/osintProxy?url=${encodeURIComponent(targetUrl)}`);
 * return res.text();
 */
export async function fetchWithProxy(targetUrl: string, timeoutMs = 12000): Promise<string> {
  let lastError: Error | null = null;

  for (const proxy of PROXIES) {
    try {
      const url = proxy.buildUrl(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP Error ${res.status}`);
      }

      const text = await proxy.extract(res);
      
      if (!text || text.trim() === '') {
        throw new Error('Corpo da resposta vazio');
      }

      return text;
    } catch (err: any) {
      lastError = err;
      logger.warn(`[ProxyHelper] Fallback: Proxy ${proxy.name} falhou para ${targetUrl} - ${err.message}`);
      // Continua para o próximo proxy do array se este falhar
    }
  }

  throw new Error(`[ProxyHelper] Todos os proxies falharam. Último erro: ${lastError?.message}`);
}
