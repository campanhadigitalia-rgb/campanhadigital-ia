// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — CampaignContext
//  Multi-Tenant: controla qual campanha está ativa + modo histórico
// ──────────────────────────────────────────────────────────────
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onSnapshot } from 'firebase/firestore';
import { col, COLLECTIONS } from '../services/firebase';
import type { Campaign, CampaignYear, ViewMode } from '../types';
import { useAuth } from './AuthContext';

// ── Tipagem do contexto ────────────────────────────────────────
interface CampaignContextValue {
  /** Campanha atualmente selecionada */
  activeCampaign: Campaign | null;
  /** Todas as campanhas disponíveis ao usuário */
  campaigns: Campaign[];
  /** Modo de visualização */
  viewMode: ViewMode;
  /** Alterna entre ativa / histórica */
  setViewMode: (mode: ViewMode) => void;
  /** Seleciona uma campanha pelo ID */
  selectCampaign: (id: string) => void;
  /** Retorna o campaign_id seguro para queries (nunca undefined) */
  campaignId: string;
  /** Indica se está carregando a lista de campanhas */
  loading: boolean;
  /** Ano filtrado no modo histórico (2026 | 2028) */
  historicalYear: CampaignYear | null;
  setHistoricalYear: (year: CampaignYear | null) => void;
}

// ── Contexto ───────────────────────────────────────────────────
const CampaignContext = createContext<CampaignContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────
export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns]       = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [viewMode, setViewMode]         = useState<ViewMode>('active');
  const [loading, setLoading]           = useState(true);
  const [historicalYear, setHistoricalYear] = useState<CampaignYear | null>(null);

  const { user } = useAuth();

  // Escuta mudanças em tempo real na coleção de campanhas apenas se logado
  useEffect(() => {
    if (!user) {
      setCampaigns([]);
      setActiveCampaign(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(col<Campaign>(COLLECTIONS.CAMPAIGNS), (snap) => {
      const data = snap.docs.map((d) => ({
        ...(d.data() as Campaign),
        id: d.id,
      }));
      setCampaigns(data);

      // Removemos auto-select forçado para mostrar o Modal
      // Apenas restaura do LocalStorage se existir
      if (!activeCampaign) {
        const savedId = localStorage.getItem('@Campanha_Ativa');
        if (savedId) {
          const found = data.find((c) => c.id === savedId);
          if (found) setActiveCampaign(found);
        }
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [user]); // re-avalia se usuário mudar

  const selectCampaign = useCallback(
    (id: string) => {
      const found = campaigns.find((c) => c.id === id);
      if (found) {
        setActiveCampaign(found);
        localStorage.setItem('@Campanha_Ativa', id);
      }
    },
    [campaigns],
  );

  // Removemos o fallback forçado, se não houver campanha o ID fica vazio (esperando Onboarding)
  const campaignId = activeCampaign?.id ?? '';

  const value = useMemo<CampaignContextValue>(
    () => ({
      activeCampaign,
      campaigns,
      viewMode,
      setViewMode,
      selectCampaign,
      campaignId,
      loading,
      historicalYear,
      setHistoricalYear,
    }),
    [activeCampaign, campaigns, viewMode, selectCampaign, campaignId, loading, historicalYear],
  );

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

// ── Hook público ───────────────────────────────────────────────
export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used inside <CampaignProvider>');
  return ctx;
}
