// ──────────────────────────────────────────────────────────────
//  ERP Piratini — App.tsx
//  Roteamento + Layout principal
// ──────────────────────────────────────────────────────────────
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import {
  Users, BarChart2, CheckSquare, Settings, LogOut,
  Menu, X, Zap, Bot,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useCampaign } from './context/CampaignContext';
import { CampaignBadge } from './components/ui/CampaignBadge';


// ── Páginas (stubs — serão implementadas nos próximos prompts) ─
function Dashboard()  { return <PlaceholderPage icon={<BarChart2 />} title="Dashboard" />; }
function Contacts()   { return <PlaceholderPage icon={<Users />}     title="Contatos" />; }
function Tasks()      { return <PlaceholderPage icon={<CheckSquare />} title="Tarefas" />; }
function MCPPanel()   { return <PlaceholderPage icon={<Bot />}       title="Agentes MCP" />; }
function SettingsPage(){ return <PlaceholderPage icon={<Settings />} title="Configurações" />; }

function PlaceholderPage({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full gap-4"
      style={{ color: '#94a3b8' }}
    >
      <div style={{ fontSize: 64 }}>{icon}</div>
      <h2 style={{ fontSize: 24, fontWeight: 600, color: '#e2e8f0' }}>{title}</h2>
      <p style={{ fontSize: 14 }}>Módulo em desenvolvimento — próximos prompts</p>
    </motion.div>
  );
}

// ── Tela de Login ──────────────────────────────────────────────
function LoginScreen() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="gradient-bg flex items-center justify-center min-h-screen">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="glass-card p-10 flex flex-col items-center gap-6 w-full max-w-sm"
      >
        {/* Logo */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#818cf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 32px rgba(99,102,241,0.5)',
        }}>
          <Zap size={36} color="#fff" />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          CampanhaDigital IA
        </h1>
        <p style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', margin: 0 }}>
          Plataforma Multi-Campanha de<br />Gestão Política Estratégica
        </p>
        <button
          id="google-signin-btn"
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
            transition: 'transform 0.1s',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.97)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Entrar com Google
        </button>
        <p style={{ fontSize: 11, color: '#475569', textAlign: 'center', margin: 0 }}>
          Sistema restrito — acesso autorizado apenas
        </p>
      </motion.div>
    </div>
  );
}

// ── Sidebar Nav ────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',  Icon: BarChart2  },
  { id: 'contacts',   label: 'Contatos',   Icon: Users      },
  { id: 'tasks',      label: 'Tarefas',    Icon: CheckSquare },
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
    contacts:  <Contacts />,
    tasks:     <Tasks />,
    mcp:       <MCPPanel />,
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
              {NAV_ITEMS.map(({ id, label, Icon }) => (
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
                    {profile?.role ?? 'viewer'}
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
    </div>
  );
}
