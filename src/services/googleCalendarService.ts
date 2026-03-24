/**
 * Google Calendar Integration Service
 * Handles OAuth2 and bidirectional event synchronization.
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  location?: string;
  start: { dateTime: string };
  end: { dateTime: string };
}

// Em um cenário real, estas chaves viriam de variáveis de ambiente configuradas no Google Cloud Console
// const CLIENT_ID = import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID || '';
// const API_KEY = import.meta.env.VITE_GOOGLE_CALENDAR_API_KEY || '';
// const SCOPES = "https://www.googleapis.com/auth/calendar.events";

/**
 * Inicia o fluxo de autenticação OAuth2 (Simulado para Web App)
 */
export async function connectGoogleCalendar(): Promise<boolean> {
  // Simulação de popup de autorização
  return new Promise((resolve) => {
    console.log("Iniciando OAuth2 com Google...");
    setTimeout(() => {
      localStorage.setItem('gcal_connected', 'true');
      resolve(true);
    }, 2000);
  });
}

/**
 * Verifica se o usuário já conectou a agenda
 */
export function isGoogleCalendarConnected(): boolean {
  return localStorage.getItem('gcal_connected') === 'true';
}

/**
 * Importa eventos de uma agenda Google selecionada
 */
export async function importGoogleEvents(calendarId: string = 'primary'): Promise<any[]> {
  if (!isGoogleCalendarConnected()) return [];
  
  console.log(`Importando eventos da agenda: ${calendarId}`);
  
  // Simulação de retorno da API do Google Calendar
  return [
    {
      id: 'g-1',
      summary: 'Reunião com Prefeito (Vindo do Google)',
      location: 'Prefeitura Municipal',
      start: { dateTime: new Date(Date.now() + 172800000).toISOString() }
    }
  ];
}

/**
 * Envia um evento do App para o Google Calendar
 */
export async function pushEventToGoogle(event: any): Promise<boolean> {
  console.log("Enviando evento para Google Calendar:", event.title);
  return true;
}

/**
 * Retorna a lista de agendas do usuário (Simulado)
 */
export async function listUserCalendars(): Promise<{id: string, summary: string, primary: boolean}[]> {
  return [
    { id: 'primary', summary: 'Agenda Principal (Campanha)', primary: true },
    { id: 'sec-1', summary: 'Eventos Externos / Comitê', primary: false },
    { id: 'sec-2', summary: 'Agenda Pessoal Candidato', primary: false }
  ];
}
