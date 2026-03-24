/**
 * Centralizador de Logs de Produção para CampanhaDigitalIA.
 * Evita vazamento de informações sensíveis no console do cliente.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProd = import.meta.env.PROD;

  private log(level: LogLevel, message: string, data?: any) {
    if (this.isProd && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = `[CDIA-${level.toUpperCase()}] ${timestamp}:`;

    switch (level) {
      case 'info':
        console.info(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'debug':
        console.log(prefix, message, data || '');
        break;
    }
  }

  info(msg: string, data?: any) { this.log('info', msg, data); }
  warn(msg: string, data?: any) { this.log('warn', msg, data); }
  error(msg: string, data?: any) { this.log('error', msg, data); }
  debug(msg: string, data?: any) { this.log('debug', msg, data); }
}

export const logger = new Logger();
