import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ThumbsUp, ThumbsDown, Flag, Brain, Loader2, RefreshCw } from 'lucide-react';
import { generateScenarioAnalysis } from '../../services/aiService';
import type { Campaign, MonitoringItem } from '../../types';

interface ScenarioAnalysisProps {
  activeCampaign: Campaign;
  items: MonitoringItem[];
}

export function ScenarioAnalysis({ activeCampaign, items }: ScenarioAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{ pros: string[]; cons: string[]; risks: string[]; summary: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (items.length === 0) {
      setError('Nenhum dado de monitoramento disponível para análise. Sincronize a inteligência primeiro.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await generateScenarioAnalysis(activeCampaign, items);
      setAnalysis(result);
    } catch (err) {
      setError('Falha ao gerar análise. Verifique sua chave de API.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!analysis && !loading) {
    return (
      <div className="glass-card p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed border-indigo-500/30">
        <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400">
          <Brain size={48} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-100">Análise de Cenário IA</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            O Gemini analisará todas as notícias e dados jurídicos encontrados para gerar um relatório de Prós, Contras e Riscos Estratégicos.
          </p>
        </div>
        {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}
        <button
          onClick={handleGenerate}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
        >
          <Flag size={16} /> Gerar Análise de Risco
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <div className="glass-card p-20 flex flex-col items-center justify-center gap-4">
          <Loader2 size={40} className="animate-spin text-indigo-500" />
          <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-widest">
            Gemini Processando Tensores Políticos...
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
          {/* Resumo Executivo */}
          <div className="glass-card p-4 border border-indigo-500/20 bg-indigo-500/5">
            <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2 flex items-center gap-2">
              <Brain size={12} /> Resumo Executivo da Inteligência
            </h4>
            <p className="text-sm text-slate-200 leading-relaxed italic m-0">
              "{analysis?.summary}"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Prós */}
            <div className="glass-card p-4 border-emerald-500/20 bg-emerald-500/5">
              <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-3 flex items-center gap-2">
                <ThumbsUp size={12} /> Pontos Fortes / Prós
              </h4>
              <ul className="space-y-2 m-0 p-0 list-none">
                {analysis?.pros.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Contras */}
            <div className="glass-card p-4 border-rose-500/20 bg-rose-500/5">
              <h4 className="text-[10px] font-black uppercase text-rose-400 tracking-widest mb-3 flex items-center gap-2">
                <ThumbsDown size={12} /> Pontos de Ataque / Contras
              </h4>
              <ul className="space-y-2 m-0 p-0 list-none">
                {analysis?.cons.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-rose-500 mt-1">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Riscos */}
            <div className="glass-card p-4 border-amber-500/20 bg-amber-500/5">
              <h4 className="text-[10px] font-black uppercase text-amber-400 tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert size={12} /> Riscos Jurídicos / Imagem
              </h4>
              <ul className="space-y-2 m-0 p-0 list-none">
                {analysis?.risks.map((item, i) => (
                  <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">•</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            className="self-center flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw size={12} /> Refazer Análise Global
          </button>
        </motion.div>
      )}
    </div>
  );
}
