// ──────────────────────────────────────────────────────────────
//  ERP Piratini — App.tsx
//  Roteamento + Layout principal
// ──────────────────────────────────────────────────────────────
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  Users, BarChart2, CalendarDays, Settings, LogOut,
  Menu, X, Zap, Bot, PenTool, MessageCircle, Brain, Scale
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
import LegalPage from './pages/Legal';
import SettingsPage from './pages/Settings';
import MCPAgents from './pages/MCPAgents';

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
    } catch (err: any) {
      setError(err.message.replace('Firebase: ', ''));
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

// ── Sidebar Nav ────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: BarChart2  },
  { id: 'agenda',     label: 'Agenda',     Icon: CalendarDays },
  { id: 'contacts',   label: 'Operações',  Icon: Users      },
  { id: 'studio',     label: 'Estúdio IA', Icon: PenTool    },
  { id: 'whatsapp',   label: 'Mensageria', Icon: MessageCircle },
  { id: 'oracle',     label: 'O Oráculo',  Icon: Brain      },
  { id: 'legal',      label: 'Jurídico',   Icon: Scale      },
  { id: 'mcp',        label: 'Agentes AI', Icon: Bot        },
  { id: 'settings',   label: 'Config',     Icon: Settings   },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];

// ── App Principal ──────────────────────────────────────────────
export default function App() {
  const { user, profile, loading, logout } = useAuth();
  const { activeCampaign, viewMode }       = useCampaign();
  const [page, setPage]     = useState<NavId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
    dashboard: <Dashboard />,
    agenda:    <CampaignCalendar />,
    contacts:  <Contacts />,
    studio:    <Studio />,
    whatsapp:  <Messaging />,
    oracle:    <OraclePage />,
    legal:     <LegalPage />,
    mcp:       <MCPAgents />,
    settings:  <SettingsPage />,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              background: 'rgba(15,23,42,0.95)',
              borderRight: '1px solid rgba(99,102,241,0.12)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', flexShrink: 0,
            }}
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

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px 8px' }}>
              {NAV_ITEMS.filter(item => {
                if (profile?.role === 'Volunteer' && ['oracle', 'settings'].includes(item.id)) return false;
                return true;
              }).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  id={`nav-${id}`}
                  onClick={() => setPage(id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, border: 'none',
                    marginBottom: 2, cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    background: page === id ? 'rgba(99,102,241,0.18)' : 'transparent',
                    color: page === id ? '#818cf8' : '#94a3b8',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (page !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { if (page !== id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={16} />
                  {label}
                  {page === id && (
                    <div style={{
                      marginLeft: 'auto', width: 3, height: 16,
                      borderRadius: 2, background: '#6366f1',
                    }} />
                  )}
                </button>
              ))}
            </nav>

            {/* User */}
            <div style={{ padding: '12px 8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                <img
                  src={profile?.photoURL ?? user.photoURL ?? ''}
                  alt="avatar"
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover',
                    border: '2px solid rgba(99,102,241,0.4)' }}
                />
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
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 56, display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          background: 'rgba(10,15,30,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          flexShrink: 0,
        }}>
          <button
            id="sidebar-toggle"
            onClick={() => setSidebarOpen(p => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, borderRadius: 6 }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb */}
          <span style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>
            {NAV_ITEMS.find(n => n.id === page)?.label}
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
        <main style={{
          flex: 1, overflow: 'auto', padding: 24,
          background: 'var(--color-piratini-950)',
        }}>
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
