// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — Firebase Config & Helpers
// ──────────────────────────────────────────────────────────────
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  type Query,
  type CollectionReference,
  type DocumentData,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// ── Configuração importada do módulo centralizado ──
import { firebaseConfig } from '../config/firebase.config';

// Evita reinicialização em HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Analytics (só no browser)
isSupported().then((ok) => ok && getAnalytics(app));

// ── Helper de isolamento multi-tenant ──────────────────────────
/**
 * Retorna uma query já filtrada pelo campaign_id.
 * TODOS os acessos ao Firestore devem passar por esta função.
 */
export function campaignQuery<T = DocumentData>(
  col: CollectionReference<T>,
  campaignId: string,
  ...extraConstraints: Parameters<typeof query>[1][]
): Query<T> {
  return query(col, where('campaign_id', '==', campaignId), ...extraConstraints);
}

/**
 * Retorna a referência de coleção raiz com tipo seguro.
 */
export function col<T = DocumentData>(path: string) {
  return collection(db, path) as CollectionReference<T>;
}

// ── Nomes de coleções (centralizados) ─────────────────────────
export const COLLECTIONS = {
  CAMPAIGNS:    'campaigns',
  USERS:        'users',
  CONTACTS:     'contacts',
  INTERACTIONS: 'interactions',
  TASKS:        'tasks',
  ASSETS:       'assets',
  MCP_QUEUE:    'mcp_queue',
  EVENTS:       'events',
  SENTIMENT_METRICS: 'sentiment_metrics',
} as const;
