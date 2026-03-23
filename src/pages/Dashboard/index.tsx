import { motion } from 'framer-motion';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { Users, TrendingUp, Handshake, MapPin } from 'lucide-react';

const mockEngagementData = [
  { region: 'Porto Alegre', engagement: 85, visits: 120 },
  { region: 'Canoas', engagement: 62, visits: 85 },
  { region: 'Caxias do Sul', engagement: 94, visits: 140 },
  { region: 'Pelotas', engagement: 45, visits: 60 },
  { region: 'Santa Maria', engagement: 78, visits: 110 },
  { region: 'Passo Fundo', engagement: 56, visits: 75 },
];

const mockTimelineData = [
  { month: 'Jan', interactions: 400 },
  { month: 'Fev', interactions: 600 },
  { month: 'Mar', interactions: 850 },
  { month: 'Abr', interactions: 1200 },
  { month: 'Mai', interactions: 950 },
  { month: 'Jun', interactions: 1400 },
];

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* HeaderStats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users size={24} />} label="Total Contatos" value="12.450" trend="+12%" />
        <StatCard icon={<Handshake size={24} />} label="Interações" value="3.842" trend="+5%" inlineColor="#10b981" />
        <StatCard icon={<MapPin size={24} />} label="Cidades Cobertas" value="84" trend="+2" inlineColor="#f59e0b" />
        <StatCard icon={<TrendingUp size={24} />} label="Engajamento" value="76%" trend="+8%" inlineColor="#6366f1" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card p-6 lg:col-span-2 flex flex-col gap-4"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-100 m-0">Evolução de Interações</h2>
            <p className="text-sm text-slate-400 m-0">Volume de contatos ativos ao longo do tempo</p>
          </div>
          <div className="h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockTimelineData}>
                <defs>
                  <linearGradient id="colorInteractions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(99,102,241,0.2)', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="interactions" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorInteractions)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Region Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="glass-card p-6 flex flex-col gap-4"
        >
          <div>
            <h2 className="text-lg font-bold text-slate-100 m-0">Engajamento por Região</h2>
            <p className="text-sm text-slate-400 m-0">Principais polos</p>
          </div>
          <div className="h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockEngagementData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="region" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={85} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(99,102,241,0.2)', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="engagement" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend, inlineColor = '#6366f1' }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-5 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500" style={{ color: inlineColor }}>
        {icon}
      </div>
      <div className="flex flex-col gap-1 relative z-10">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-slate-100">{value}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
            {trend}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
