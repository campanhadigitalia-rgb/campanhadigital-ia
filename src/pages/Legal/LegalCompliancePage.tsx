import { Camera, ShieldCheck, ShieldAlert, Zap, Search, Clock, FileCheck, CheckCircle } from 'lucide-react';

export default function LegalCompliancePage() {
  const mockMedia = [
    { title: 'Vídeo: Ataque ao Prefeito', status: 'Risco Alto', type: 'Vídeo/MP4', date: 'Há 10min', risk: 'high', desc: 'Possível propaganda antecipada ou ofensa pessoal.' },
    { title: 'Card: Proposta de Saúde', status: 'Aprovado', type: 'Imagem/PNG', date: 'Há 1h', risk: 'low', desc: 'Conforme Resolução TSE 23.610/2019.' },
    { title: 'Jingle: Caminhada 15', status: 'Em Revisão', type: 'Áudio/MP3', date: 'Há 4h', risk: 'medium', desc: 'Verificar volume de áudio e mencão ao vice.' },
  ];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/20">
          <Camera size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0 text-gradient from-emerald-400 to-teal-400">Compliance de Mídia</h2>
          <p className="text-sm text-slate-400 m-0">Análise automatizada de peças publicitárias via IA Jurídica.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 transition-all hover:border-emerald-500/30 group">
            <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 group-hover:scale-110 transition-transform">
              <Zap size={32} />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-slate-200">Arraste a peça para análise</p>
              <p className="text-xs text-slate-500">Analise vídeos, imagens ou áudios para checar conformidade com o TSE.</p>
            </div>
            <input type="file" className="hidden" id="compliance-upload" />
            <label htmlFor="compliance-upload" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest cursor-pointer shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
              Enviar para o Scanner
            </label>
          </div>

          <div className="glass-card overflow-hidden border border-white/5">
            <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Fila de Revisão</h3>
               <Search size={14} className="text-slate-600" />
            </div>
            <div className="divide-y divide-white/5">
              {mockMedia.map((m, i) => (
                <div key={i} className="p-4 hover:bg-white/2 transition-all flex items-center justify-between gap-4 group">
                  <div className="flex gap-4 items-center">
                    <div className="p-2 rounded bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                      <FileCheck size={18} />
                    </div>
                    <div>
                       <p className="text-sm font-bold text-slate-200">{m.title}</p>
                       <p className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5 uppercase tracking-tighter">
                         {m.type} • <Clock size={10} /> {m.date}
                       </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                      m.risk === 'high' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      m.risk === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {m.status}
                    </span>
                    <button className="p-2 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-all">
                      <Zap size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 border border-emerald-500/20 bg-emerald-500/5 space-y-4">
             <div className="flex items-center gap-2 text-emerald-400">
                <ShieldCheck size={20} />
                <h3 className="text-sm font-black uppercase tracking-widest">IA Sentinel Ativo</h3>
             </div>
             <p className="text-[11px] text-slate-400 leading-relaxed italic">
               "Minha rede neural está calibrada com as Resoluções 23.610 e 23.671 do TSE. 
               Detecto ausência de nome de vice, legendas em desacordo com a lei e gatilhos de Direito de Resposta."
             </p>
             <div className="pt-4 space-y-2">
                 {[
                   'Verificação de Legendas (1/3)',
                   'Identificação de Candidatos',
                   'Análise de Ataques Diretos',
                   'Compliance de Logomarcas',
                 ].map((check, i) => (
                   <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                     <CheckCircle size={10} className="text-emerald-500" /> {check}
                   </div>
                 ))}
             </div>
          </div>

          <div className="glass-card p-6 border border-rose-500/20 bg-rose-500/5 space-y-4">
             <div className="flex items-center gap-2 text-rose-400 font-black tracking-widest uppercase de text-sm">
                <ShieldAlert size={20} />
                Radar de Risco
             </div>
             <p className="text-[10px] text-slate-400 leading-relaxed uppercase font-bold tracking-tighter">Último Alerta Detectado:</p>
             <div className="p-3 bg-black/40 rounded border border-rose-500/10">
                <p className="text-[11px] font-bold text-rose-300">"Tamanho da fonte do nome do vice inferior a 30% do nome do titular no vídeo 'Ataque ao Prefeito'. Peça sujeita a suspensão imediata."</p>
             </div>
             <button className="w-full py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/20 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all">
                Corrigir Imediatamente
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
