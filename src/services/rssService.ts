import { logger } from '../utils/logger';
import { fetchWithProxy } from '../utils/proxyHelper';

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  summary: string;
  source: string;
}

// Lista de Feeds RSS Reais (Exemplos locais/nacionais focados em política e finanças)
const RSS_FEEDS: Record<string, string> = {
  'G1 RS': 'https://g1.globo.com/rss/g1/rs/rio-grande-do-sul/',
  'Correio do Povo': 'https://www.correiodopovo.com.br/cmlink/correio-do-povo-1.12461?saida=rss',
  'Senado Federal': 'https://www12.senado.leg.br/noticias/noticias/@@RSS'
};

/**
 * Busca e parseia os feeds RSS reais para gerar clippings de notícias.
 * Utiliza um proxy CORS público (allorigins) porque o Firestore/Navegador 
 * bloqueia requisições Cross-Origin diretas para arquivos XML de terceiros.
 */
export async function fetchNewsClipping(sourceName: string = 'G1 RS', maxItems: number = 5): Promise<NewsItem[]> {
  try {
    const feedUrl = RSS_FEEDS[sourceName];
    if (!feedUrl) {
      throw new Error(`Feed RSS não configurado para: ${sourceName}`);
    }

    logger.debug(`[RSS] Buscando feed de ${sourceName} via ProxyHelper...`);
    
    // Roteador Híbrido lida com CORS e possíveis encerramentos JSON no wrapper
    const xmlText = await fetchWithProxy(feedUrl);

    // Converte a string XML para um Document Object Model
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const items = xmlDoc.querySelectorAll('item');
    const news: NewsItem[] = [];

    items.forEach((item, index) => {
      if (index >= maxItems) return;

      const titleNode = item.querySelector('title');
      const linkNode = item.querySelector('link');
      const pubDateNode = item.querySelector('pubDate');
      const descNode = item.querySelector('description');
      
      const title = titleNode?.textContent || 'Sem Título';
      const link = linkNode?.textContent || '#';
      const pubDate = pubDateNode?.textContent || new Date().toISOString();
      const rawDesc = descNode?.textContent || '';
      
      // Limpa tags HTML da descrição (resumo)
      const cleanSummary = rawDesc.replace(/<[^>]+>/g, '').substring(0, 150) + '...';

      news.push({
        id: `news-${sourceName.replace(/\s/g, '').toLowerCase()}-${index}`,
        title,
        link,
        pubDate,
        summary: cleanSummary,
        source: sourceName
      });
    });

    logger.info(`[RSS] ${news.length} notícias carregadas de ${sourceName}`);
    return news;

  } catch (error) {
    logger.error(`Erro ao processar RSS de ${sourceName}:`, error);
    // Fallback silencioso para não quebrar a UI
    return [];
  }
}
