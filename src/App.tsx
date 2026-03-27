// ──────────────────────────────────────────────────────────────
//  CampanhaDigital IA — App.tsx
//  Roteamento + Layout principal
// ──────────────────────────────────────────────────────────────
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  Users, LogOut,
  Menu, X, Zap, Bot, MessageCircle, Brain, Scale, DollarSign, ClipboardList,
  ChevronDown, ChevronRight, MapPin, PhoneCall, Target
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useCampaign } from './context/CampaignContext';
import { CampaignBadge } from './components/ui/CampaignBadge';
import { CampaignOnboardingModal } from './components/ui/CampaignOnboardingModal';

import Dashboard from './pages/Dashboard';
import { CampaignCalendar } from './components/ui/CampaignCalendar';
import Contacts from './pages/Contacts';
import Studio from './pages/Studio';
import Messaging from './pages/Messaging';
import OraclePage from './pages/Oracle';
import LegalDocsPage from './pages/Legal';
import LegalDashboardPage from './pages/Legal/LegalDashboardPage';
import LegalCompliancePage from './pages/Legal/LegalCompliancePage';
import LegalMonitorPage from './pages/Legal/LegalMonitorPage';
import LegalFinanceiroPage from './pages/Legal/LegalFinanceiroPage';
import LegalTemplatesPage from './pages/Legal/LegalTemplatesPage';
import SettingsPage from './pages/Settings';
import MCPAgents from './pages/MCPAgents';
import MonitorGeral from './pages/MonitorGeral';
import FinancePage from './pages/Finance';
import AdminPage from './pages/Administrative';
import { PeopleManager } from './components/ui/PeopleManager';

// ── Tela de Login ──────────────────────────────────────────────
function LoginScreen() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) await signUpWithEmail(email, password);
      else await signInWithEmail(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.replace('Firebase: ', ''));
    }
  };

  return (
    <div className="gradient-bg flex items-center justify-center min-h-screen p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="glass-card p-10 flex flex-col items-center gap-6 w-full max-w-sm"
      >
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 32px rgba(99,102,241,0.5)',
        }}>
          <Zap size={36} color="#fff" />
        </div>
        <div className="text-center">
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
            CampanhaDigital IA
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', margin: '4px 0 0 0' }}>
            Acesso Restrito ao Sistema
          </p>
        </div>

        {error && (
          <div className="w-full p-3 rounded-lg text-sm bg-red-500/10 border border-red-500/20 text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            required
            className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            required
            className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff',
              fontWeight: 600, fontSize: 15, boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              transition: 'transform 0.1s', display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {loading ? <motion.div animate={{rotate:360}} transition={{repeat:Infinity,duration:1}} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"/> : (isRegister ? 'Criar Conta' : 'Entrar')}
          </button>
        </form>

        <div className="flex items-center w-full gap-3">
          <div className="flex-1 h-px bg-white/10"></div>
          <span className="text-xs text-slate-500 font-medium">OU</span>
          <div className="flex-1 h-px bg-white/10"></div>
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-white/5 border border-white/10 text-white font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <button 
          onClick={() => setIsRegister(!isRegister)}
          className="text-xs text-indigo-400 hover:text-indigo-300 bg-transparent border-none cursor-pointer p-0"
        >
          {isRegister ? 'Já tenho conta, fazer login' : 'Não tem conta? Criar acesso'}
        </button>
      </motion.div>
    </div>
  );
}

export type NavId = 'dashboard' | 'legal_dashboard' | 'legal_compliance' | 'legal_monitor' | 'legal_financeiro' | 'legal_docs' | 'legal_templates' | 'finance_dashboard' | 'finance_caixa' | 'finance_suppliers' | 'finance_vaquinha' | 'admin' | 'pessoas' | 'studio' | 'whatsapp' | 'oracle' | 'contacts' | 'messaging' | 'mcp' | 'settings' | 'agenda' | 'owner' | 'monitor';

interface NavItem {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
  subItems: {
    id: NavId;
    label: string;
    proprietorOnly?: boolean;
    volunteerHidden?: boolean;
  }[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'grp_juridico', label: '1. Jurídico', Icon: Scale,
    subItems: [
      { id: 'legal_dashboard',   label: '⚖️ Central Jurídica' },
      { id: 'legal_docs',        label: '🗂️ Dossiê de Registro' },
      { id: 'legal_templates',   label: '📝 Gestão de Minutas' },
      { id: 'legal_financeiro',  label: '📊 Prestação de Contas' },
      { id: 'legal_monitor',     label: '🎯 Motor RAG & Monitor' },
    ]
  },
  {
    id: 'grp_financeiro', label: '2. Financeiro', Icon: DollarSign,
    subItems: [
      { id: 'finance_dashboard', label: 'Dashboard Financeiro' },
      { id: 'finance_caixa', label: 'Livro Caixa (SPCE)' },
      { id: 'finance_vaquinha', label: 'Vaquinha & Eventos' },
      { id: 'finance_suppliers', label: 'Fornecedores' },
    ]
  },
  {
    id: 'grp_admin', label: '3. Administrativo', Icon: ClipboardList,
    subItems: [
      { id: 'admin', label: 'Frota, Logística & Estoque' }
    ]
  },
  {
    id: 'grp_comunicacao', label: '4. Comunicação', Icon: MessageCircle,
    subItems: [
      { id: 'studio', label: 'Estúdio de Criação IA' },
      { id: 'whatsapp', label: 'Monitoramento & Whats' }
    ]
  },
  {
    id: 'grp_pessoas', label: '5. Pessoas', Icon: Users,
    subItems: [
      { id: 'pessoas', label: 'Gerenciar Pessoas' }
    ]
  },
  {
    id: 'grp_rua_mobi', label: '6. Rua (Mobilização)', Icon: MapPin,
    subItems: [
      { id: 'contacts', label: 'Multiplicadores & CRM' }
    ]
  },
  {
    id: 'grp_rua_tele', label: '7. Rua (Telemarketing)', Icon: PhoneCall,
    subItems: [
      { id: 'messaging', label: 'Disparo & Mensagens' }
    ]
  },
  {
    id: 'grp_estrategia', label: '8. Estratégia', Icon: Brain,
    subItems: [
      { id: 'oracle', label: 'O Oráculo (Cérebro IA)', volunteerHidden: true },
      { id: 'monitor', label: '📡 Monitor Geral de Menções' }
    ]
  },
  {
    id: 'grp_tec', label: '9. Tecnologia', Icon: Bot,
    subItems: [
      { id: 'mcp', label: 'Painel de Agentes (MCP)' },
      { id: 'settings', label: 'Chaves de API & Conexões', volunteerHidden: true }
    ]
  },
  {
    id: 'grp_gestao', label: '10. Gestão', Icon: Zap,
    subItems: [
      { id: 'owner', label: 'Master (Owner Portal)', proprietorOnly: true },
      { id: 'agenda', label: 'Agenda Pessoal & Pública' }
    ]
  }
];

// ── App Principal ──────────────────────────────────────────────
export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const { activeCampaign, viewMode }       = useCampaign();
  const [page, setPage]     = useState<NavId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  if (loading) {
    return (
      <div className="gradient-bg flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{ width: 40, height: 40, borderRadius: '50%',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366f1' }}
        />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  const PAGE_MAP: Record<NavId, React.ReactNode> = {
    dashboard:            <Dashboard />,
    legal_dashboard:      <LegalDashboardPage onNavigate={(p) => setPage(p as NavId)} />,
    legal_compliance:     <LegalCompliancePage />,
    legal_monitor:        <LegalMonitorPage />,
    legal_financeiro:     <LegalFinanceiroPage onNavigate={setPage} />,
    legal_docs:           <LegalDocsPage />,
    legal_templates:      <LegalTemplatesPage />,
    finance_dashboard:    <FinancePage activeTab="dashboard" />,
    finance_caixa:        <FinancePage activeTab="caixa" />,
    finance_suppliers:    <FinancePage activeTab="suppliers" />,
    finance_vaquinha:     <FinancePage activeTab="vaquinha" />,
    admin:                <AdminPage />,
    pessoas:              <PeopleManager />,
    studio:               <Studio />,
    messaging:            <Messaging />,
    whatsapp:             <Messaging />,
    oracle:               <OraclePage />,
    contacts:             <Contacts />,
    mcp:                  <MCPAgents />,
    settings:             <SettingsPage />,
    agenda:               <CampaignCalendar />,
    monitor:              <MonitorGeral />,
    owner:                <div className="p-6 text-white">Owner Portal under construction.</div>
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 w-full relative">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[220px] shrink-0 overflow-hidden 
          bg-slate-900 border-r border-indigo-500/10 shadow-2xl md:shadow-none
          transition-transform duration-300 ease-in-out md:static md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
            {/* Logo */}
            <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(99,102,241,0.4)',
                }}>
                  <Zap size={18} color="#fff" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>
                    CampanhaDigital IA
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#6366f1' }}>
                    {viewMode === 'active' ? '● Campanha Ativa' : '◎ Histórico'}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Principal */}
          <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-2 relative" style={{ scrollbarWidth: 'none' }}>
            
            <div className="mb-4">
              <button
                onClick={() => { setPage('dashboard'); setSidebarOpen(false); }}
                className={`w-full flex items-center px-4 py-3 rounded-lg border-none cursor-pointer transition-colors shadow-sm ${page === 'dashboard' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'bg-slate-900/50 text-slate-200 border border-white/5 hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <Target size={18} className={page === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'} />
                  <span className="text-[13px] font-black uppercase tracking-widest bg-clip-text text-transparent bg-linear-to-r from-white to-slate-400">Página Inicial</span>
                </div>
              </button>
            </div>

            {NAV_ITEMS.map(group => {
                const visibleSubItems = group.subItems.filter(sub => {
                  if (sub.proprietorOnly && profile?.role !== 'Proprietor') return false;
                  if (sub.volunteerHidden && profile?.role === 'Volunteer') return false;
                  return true;
                });

                if (visibleSubItems.length === 0) return null;

                const isExpanded = expandedGroups.includes(group.id);
                const hasActiveChild = visibleSubItems.some(sub => sub.id === page);

                return (
                  <div key={group.id} className="mb-2">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg border-none cursor-pointer transition-colors"
                      style={{
                        background: hasActiveChild && !isExpanded ? 'rgba(99,102,241,0.1)' : 'transparent',
                        color: hasActiveChild ? '#818cf8' : '#e2e8f0',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = hasActiveChild && !isExpanded ? 'rgba(99,102,241,0.1)' : 'transparent'; }}
                    >
                      <div className="flex items-center gap-3">
                        <group.Icon size={18} className={hasActiveChild ? 'text-indigo-400' : 'text-slate-400'} />
                        <span className="text-sm font-bold">{group.label}</span>
                      </div>
                      {isExpanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden flex flex-col gap-1 mt-1 pl-9 pr-2"
                        >
                          {visibleSubItems.map(sub => (
                            <button
                              key={sub.id}
                                onClick={() => { setPage(sub.id); setSidebarOpen(false); }}
                                className="w-full flex items-center px-3 py-2 rounded-md border-none cursor-pointer transition-colors text-left"
                                style={{
                                  background: page === sub.id ? 'rgba(99,102,241,0.18)' : 'transparent',
                                  color: page === sub.id ? '#818cf8' : '#94a3b8',
                                  fontSize: '13px',
                                  fontWeight: page === sub.id ? 600 : 500,
                                }}
                                onMouseEnter={e => { if (page !== sub.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                              onMouseLeave={e => { if (page !== sub.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>

            {/* User */}
            <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                {profile?.photoURL || user.photoURL ? (
                  <img
                    src={profile?.photoURL ?? user.photoURL ?? ''}
                    alt="avatar"
                    style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
                      border: '2px solid rgba(99,102,241,0.4)' }}
                  />
                ) : (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#818cf8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid rgba(99,102,241,0.4)',
                    fontSize: 13, fontWeight: 700, color: '#fff',
                  }}>
                    {(profile?.displayName ?? user.displayName ?? 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile?.displayName ?? user.displayName}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#6366f1', textTransform: 'uppercase' }}>
                    {profile?.role ?? 'Volunteer'}
                  </p>
                </div>
                <button
                  id="logout-btn"
                  onClick={logout}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: '#ef4444', padding: 4, borderRadius: 6 }}
                  title="Sair"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative w-full">
        {/* Topbar */}
        <header className="h-14 shrink-0 flex items-center px-4 md:px-6 gap-3 bg-slate-900/80 backdrop-blur-md border-b border-indigo-500/10 z-30">
          
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(p => !p)}
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
            title={sidebarOpen ? "Fechar" : "Menu"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb */}
          <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>
            {page === 'dashboard' ? 'Página Inicial (Dashboard Geral)'
              : page === 'monitor' ? '📡 Monitor Geral de Menções'
              : NAV_ITEMS.flatMap(g => g.subItems).find(sub => sub.id === page)?.label}
          </span>

          {/* Campaign indicator */}
          {activeCampaign && (
            <div style={{
              fontSize: 12, color: '#6366f1',
              background: 'rgba(99,102,241,0.1)',
              padding: '3px 10px', borderRadius: 20,
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              {activeCampaign.name} · {activeCampaign.year}
            </div>
          )}

          <div style={{ marginLeft: 'auto' }}>
            <CampaignBadge />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6 bg-slate-950">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              {PAGE_MAP[page]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CampaignOnboardingModal />
    </div>
  );
}
