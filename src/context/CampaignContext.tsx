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
import { onSnapshot, doc, updateDoc, serverTimestamp, setDoc, collection, query, where } from 'firebase/firestore';
import { col, COLLECTIONS, db } from '../services/firebase';
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
  /** Cria uma nova campanha com suporte a legado */
  createCampaign: (data: { name: string; year: CampaignYear; legacy_id?: string; sync_crm?: boolean; admin_email: string }) => Promise<void>;
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

  const { user, profile } = useAuth();

  // Escuta mudanças em tempo real na coleção de campanhas apenas se logado
  useEffect(() => {
    if (!user || !profile) {
      setCampaigns([]);
      setActiveCampaign(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    let q;
    if (profile.role === 'Proprietor') {
      q = col<Campaign>(COLLECTIONS.CAMPAIGNS);
    } else {
      q = query(col<Campaign>(COLLECTIONS.CAMPAIGNS), where('admin_email', '==', user.email));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
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
  }, [user, profile]); // re-avalia se usuário ou perfil mudar

  const selectCampaign = useCallback(
    (id: string) => {
      const found = campaigns.find((c) => c.id === id);
      if (found) {
        setActiveCampaign(found);
        localStorage.setItem('@Campanha_Ativa', id);
        
        // Persistência no Firestore para validação das Security Rules
        if (user) {
          const ref = doc(db, COLLECTIONS.USERS, user.uid);
          updateDoc(ref, { 
            campaign_id: id,
            updatedAt: serverTimestamp() 
          }).catch(err => console.error("Erro ao persistir campanha no perfil:", err));
        }
      }
    },
    [campaigns, user],
  );

  const createCampaign = useCallback(
    async (data: { name: string; year: CampaignYear, legacy_id?: string, sync_crm?: boolean, admin_email: string }) => {
      if (!user) return;
      
      const newRef = doc(collection(db, COLLECTIONS.CAMPAIGNS));
      const campaignData: Campaign = {
        id: newRef.id,
        organization_id: profile?.organization_id ?? 'org-default',
        name: data.name,
        year: data.year,
        active: true,
        createdAt: new Date(),
        admin_email: data.admin_email,
      };

      if (data.legacy_id) {
        campaignData.legacy_campaign_id = data.legacy_id;
      }

      await setDoc(newRef, campaignData);

      // Se houver legado e opção de sync, chamamos o serviço
      if (data.legacy_id && data.sync_crm) {
        const { cloneCampaignContacts } = await import('../services/legacyService');
        await cloneCampaignContacts(data.legacy_id, newRef.id, user.uid);
      }

      // Auto-seleciona a nova
      selectCampaign(newRef.id);
    },
    [user, selectCampaign]
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
      createCampaign,
    }),
    [activeCampaign, campaigns, viewMode, selectCampaign, campaignId, loading, historicalYear, createCampaign],
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
