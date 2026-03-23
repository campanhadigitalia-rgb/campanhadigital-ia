import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PenTool, Camera, MessageSquare, Video, Image as ImageIcon, Sparkles, Send, CheckCircle, Smartphone, Loader2, Scale } from 'lucide-react';
import { generateCampaignScripts, generateBrandedImage, fetchCampaignAssets, type ContentPayload } from '../../services/contentService';
import { validateContentCompliance } from '../../services/legalService';

export function ContentStudio() {
  const [fact, setFact] = useState('');
  const [loadingText, setLoadingText] = useState(false);
  const [scripts, setScripts] = useState<ContentPayload | null>(null);

  const [prompt, setPrompt] = useState('');
  const [loadingImage, setLoadingImage] = useState(false);
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);

  const [assets, setAssets] = useState<{id: string, url: string, type: string}[]>([]);
  const [sentApproval, setSentApproval] = useState(false);

  const [legalCheck, setLegalCheck] = useState<'IDLE' | 'SCANNING' | 'SAFE' | 'WARNING'>('IDLE');
  const [legalFlags, setLegalFlags] = useState<string[]>([]);

  useEffect(() => {
    fetchCampaignAssets().then(setAssets);
  }, []);

  const handleGenerateScripts = async () => {
    if (!fact) return;
    setLoadingText(true);
    setSentApproval(false);
    setLegalCheck('IDLE');
    setLegalFlags([]);
    
    const result = await generateCampaignScripts(fact);
    setScripts(result);
    setLoadingText(false);
  };

  const verifyLegalCompliance = async () => {
    if (!scripts) return;
    setLegalCheck('SCANNING');
    setLegalFlags([]);
    
    // Checkando o texto que aglutina os scripts gerados
    const fullText = Object.values(scripts).join(' | ');
    const compliance = await validateContentCompliance(fullText);
    
    setLegalCheck(compliance.status.toUpperCase() as any);
    setLegalFlags(compliance.flags);
  };

  const handleGenerateImage = async () => {
    if (!prompt) return;
    setLoadingImage(true);
    const url = await generateBrandedImage(prompt);
    setGeneratedImg(url);
    setLoadingImage(false);
  };

  const handleSendApproval = () => {
    setSentApproval(true);
    setTimeout(() => {
      // reseta o envio simulando que já foi pra fila
    }, 5000);
  };

  return (
    <div className="flex flex-col gap-6 h-full w-full">
      {/* Header Estúdio */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-fuchsia-400 flex items-center gap-2 m-0 mt-2 hover:text-fuchsia-300 transition-colors cursor-default">
            <PenTool size={22} className="animate-pulse" />
            Voz do Candidato (Estúdio IA)
          </h2>
          <p className="text-sm text-slate-400 m-0">Fábrica de conteúdo omnichannel automatizada por prompts.</p>
        </div>
        
        {scripts && !sentApproval && (
          <motion.button 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            onClick={handleSendApproval}
            className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-[0_0_20px_rgba(192,38,211,0.4)] transition-all"
          >
            <Smartphone size={18} />
            Enviar para Aprovação (Push)
          </motion.button>
        )}
        
        {sentApproval && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-sm font-bold">
            <CheckCircle size={18} /> Ping Direto Sucesso
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-full">
        {/* Lado Esquerdo: Motor de Texto */}
        <div className="glass-card flex flex-col border border-fuchsia-500/10">
          <div className="p-4 border-b border-fuchsia-500/10 bg-black/20 flex flex-col gap-3">
             <label className="text-sm font-bold text-fuchsia-300 flex items-center gap-2">
                1. Fato do Dia (A base geradora)
             </label>
             {legalCheck === 'WARNING' && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-[10px] text-red-500 font-bold mb-2">
                   ⚠️ INFRAÇÕES IDENTIFICADAS:
                   <ul className="list-disc pl-4 mt-1">
                     {legalFlags.map((flag: string, idx: number) => <li key={idx} className="text-red-400">{flag}</li>)}
                   </ul>
                </div>
             )}
             {legalCheck === 'SAFE' && (
               <div className="bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-1.5 text-[10px] text-emerald-400 font-bold mb-2 flex items-center gap-1">
                 <CheckCircle size={12}/> Copys 100% de acordo com TRE-RS e TSE.
               </div>
             )}
             <div className="flex flex-col gap-2">
                <div className="flex items-start gap-2">
                  <textarea 
                    value={fact} onChange={e => setFact(e.target.value)}
                    placeholder="Ex: Inauguração histórica da ponte de Uruguaiana hoje às 15h com prefeitos da região oeste..."
                    className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-3 text-sm min-h-[80px] focus:outline-none focus:border-fuchsia-500 resize-none transition-colors"
                  />
                  <button 
                    onClick={handleGenerateScripts} disabled={loadingText || !fact}
                    className="h-[80px] w-[80px] rounded-lg bg-fuchsia-600/20 hover:bg-fuchsia-600/40 border border-fuchsia-500/30 flex flex-col items-center justify-center gap-1 text-fuchsia-300 disabled:opacity-50 transition-all font-bold group"
                  >
                    {loadingText ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} className="group-hover:scale-110 transition-transform" />}
                    <span className="text-[10px] uppercase text-center">Gerar Mix</span>
                  </button>
                </div>

                {scripts && !loadingText && legalCheck === 'IDLE' && (
                  <button 
                    onClick={verifyLegalCompliance}
                    className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded-lg border border-slate-600 font-bold text-xs w-full transition-colors"
                  >
                    <Scale size={14} className="text-amber-500" /> Passar Filtro Jurídico (TRE/TSE)
                  </button>
                )}
                {legalCheck === 'SCANNING' && (
                  <button disabled className="flex items-center justify-center gap-2 bg-slate-800 text-amber-500 py-1.5 rounded-lg border border-amber-500/30 font-bold text-xs w-full">
                    <Loader2 size={14} className="animate-spin" /> Verificando na IA Jurídica...
                  </button>
                )}
             </div>
          </div>

          <div className="flex-1 p-4 bg-slate-900/30 overflow-y-auto min-h-[400px]">
            {!scripts && !loadingText && (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 opacity-50">
                 <PenTool size={48} strokeWidth={1} />
                 <span className="text-sm font-medium text-center">Insira o fato principal da agenda e deixe a IA<br/>moldar suas personas em segundos.</span>
               </div>
            )}
            
            {loadingText && (
               <div className="h-full flex flex-col gap-4 max-w-sm mx-auto justify-center opacity-70">
                 <div className="w-full h-24 bg-slate-800 rounded animate-pulse"></div>
                 <div className="w-full h-16 bg-slate-800 rounded animate-pulse"></div>
               </div>
            )}

            {scripts && !loadingText && (
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                 {/* Card Insta */}
                 <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden hover:border-pink-500/50 transition-colors group">
                    <div className="bg-gradient-to-r from-pink-600/20 to-orange-500/10 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-pink-400 font-bold text-xs uppercase"><Camera size={14}/> Instagram (Persona: Entusiasta)</span>
                    </div>
                    <div className="p-3 text-sm text-slate-300 whitespace-pre-wrap font-medium">{scripts.instagram}</div>
                 </div>

                 {/* Card TikTok */}
                 <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-colors group">
                    <div className="bg-gradient-to-r from-cyan-600/20 to-blue-500/10 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-cyan-400 font-bold text-xs uppercase"><Video size={14}/> TikTok/Reels Script (Estilo: Foco em Entregas)</span>
                    </div>
                    <div className="p-3 text-sm text-slate-300 whitespace-pre-wrap font-medium">{scripts.tiktok}</div>
                 </div>

                 {/* Card Twitter */}
                 <div className="bg-slate-950 border border-slate-700 rounded-xl overflow-hidden hover:border-slate-500/50 transition-colors group">
                    <div className="bg-black/40 px-3 py-2 border-b border-white/5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300 font-bold text-xs uppercase"><MessageSquare size={14}/> Twitter/X (Persona Oficial / Governança)</span>
                    </div>
                    <div className="p-3 text-sm text-slate-300 whitespace-pre-wrap font-medium">{scripts.twitter}</div>
                 </div>
               </motion.div>
            )}
          </div>
        </div>

        {/* Lado Direito: Motor de Imagens e Biblioteca */}
        <div className="flex flex-col gap-6">
          <div className="glass-card flex flex-col flex-1 border border-indigo-500/10 overflow-hidden">
            <div className="p-4 border-b border-indigo-500/10 bg-black/20">
               <label className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                 <ImageIcon size={16} />
                 2. Difusão Visual (DALL-E 3 / Flux)
               </label>
               <div className="flex items-center gap-2 mt-3">
                 <input 
                   type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
                   placeholder="Ex: Foto conceitual do final da tarde focado em uma ponte do interior com as cores do RS..."
                   className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg p-3 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                 />
                 <button 
                   onClick={handleGenerateImage} disabled={loadingImage || !prompt}
                   className="px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                 >
                   {loadingImage ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                 </button>
               </div>
            </div>
            
            <div className="bg-black/40 flex-1 flex flex-col items-center justify-center p-6 min-h-[250px] relative">
               {!generatedImg && !loadingImage && (
                 <div className="text-slate-500 text-xs font-medium text-center opacity-70">
                    O preview renderizado usando Stable Diffusion ou DALL-E <br/> aparecerá emoldurado com os Safe Zones.
                 </div>
               )}
               {loadingImage && (
                 <div className="absolute inset-0 bg-indigo-900/10 flex flex-col items-center justify-center text-indigo-400 gap-3">
                    <Loader2 size={32} className="animate-spin" />
                    <span className="text-sm font-bold tracking-widest uppercase animate-pulse">Renderizando Tensores...</span>
                 </div>
               )}
               {generatedImg && !loadingImage && (
                 <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative h-full w-full max-h-[300px] flex items-center justify-center">
                    <div className="relative border-4 border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-indigo-500/20 max-h-full">
                       <img src={generatedImg} alt="Arte Gerada IA" className="max-h-full object-cover" />
                       <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                          SELO IA (PRONTO)
                       </div>
                    </div>
                 </motion.div>
               )}
            </div>
          </div>

          {/* Galeria Local (Storage) */}
          <div className="glass-card border border-white/5 p-4 flex flex-col gap-3">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest m-0 flex items-center justify-between">
                ☁️ Cofre de Ativos da Campanha
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">Cloud Storage</span>
             </h3>
             <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {assets.map((a: {id: string, url: string, type: string}) => (
                   <div key={a.id} className="relative w-20 h-20 rounded border border-white/10 overflow-hidden flex-shrink-0 group hover:border-indigo-400 cursor-copy transition-colors">
                      <img src={a.url} alt="asset" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
