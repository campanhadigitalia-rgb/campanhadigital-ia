import { useState, useEffect } from 'react';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Heart, QrCode, CheckCircle2, User, Phone, MapPin, Calendar, AlertCircle, Copy } from 'lucide-react';

interface PublicEventProps {
  campaignId: string;
  eventId: string;
}

export default function PublicEvent({ campaignId, eventId }: PublicEventProps) {
  const [eventData, setEventData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const ref = doc(db, `campaigns/${campaignId}/fundraisingCampaigns/${eventId}`);
        const snap = await getDoc(ref);
        
        if (snap.exists() && snap.data().status !== 'Rascunho') {
          setEventData({ id: snap.id, ...snap.data() });
        } else {
          setError('Evento não encontrado ou indisponível no momento.');
        }
      } catch {
         setError('Erro ao carregar os dados do evento.');
      } finally {
         setLoading(false);
      }
    };
    
    fetchEvent();
  }, [campaignId, eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'event_rsvps'), {
        campaign_id: campaignId,
        event_id: eventId,
        name,
        contact,
        createdAt: serverTimestamp()
      });
      setSuccess(true);
    } catch {
      alert('Erro ao confirmar presença. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyPix = async () => {
    if (eventData?.pixKey) {
      await navigator.clipboard.writeText(eventData.pixKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <Heart className="text-rose-500 animate-pulse mb-4" size={48} />
        <h2 className="text-xl font-black text-white uppercase tracking-widest text-center">Carregando Evento...</h2>
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-white text-center mb-2">Ops!</h2>
        <p className="text-slate-400 text-center max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center py-10 px-4 font-sans text-slate-200">
      
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Banner/Header */}
        <div className="h-32 bg-linear-to-bl from-rose-600 to-amber-600 relative overflow-hidden flex items-center justify-center">
           <div className="absolute inset-0 bg-black/20 mix-blend-overlay"></div>
           <Heart size={48} className="text-white/20 absolute -right-4 -bottom-4 rotate-12" />
           <div className="z-10 text-center px-4">
              <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] uppercase font-black tracking-widest text-white shadow-lg border border-white/30">Convite Oficial</span>
           </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 -mt-8 relative z-20">
          <div className="bg-slate-800 rounded-2xl p-5 shadow-2xl border border-white/5 mb-6 text-center">
             <h1 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2">{eventData.title}</h1>
             {eventData.description && (
               <p className="text-sm text-slate-400 leading-relaxed mb-4">{eventData.description}</p>
             )}

             <div className="flex flex-col gap-2 mt-4 text-left">
                {eventData.eventDate && (
                  <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl">
                    <Calendar className="text-amber-500 shrink-0" size={18} />
                    <span className="text-sm font-bold text-slate-300">{eventData.eventDate}</span>
                  </div>
                )}
                {eventData.eventLocation && (
                  <div className="flex items-center gap-3 bg-black/30 p-3 rounded-xl">
                    <MapPin className="text-rose-500 shrink-0" size={18} />
                    <span className="text-sm font-bold text-slate-300">{eventData.eventLocation}</span>
                  </div>
                )}
             </div>
          </div>

          {!success ? (
            <div className="space-y-6">
               {eventData.pixKey && (
                 <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl text-center">
                    <h3 className="text-sm font-black text-emerald-400 flex items-center justify-center gap-2 mb-2 uppercase tracking-widest"><QrCode size={16}/> Pagamento / Doação PIX</h3>
                    <p className="text-xs text-slate-400 mb-4">Apoie a campanha com uma doação via PIX (Qualquer valor).</p>
                    
                    <button onClick={handleCopyPix} className={`w-full py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'}`}>
                      {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                      {copied ? 'Chave Copiada!' : 'Copiar Chave PIX'}
                    </button>
                    <p className="text-[9px] text-slate-500 mt-3 font-medium uppercase text-center w-full block">Doações auditáveis pelo SPCE/TSE</p>
                 </div>
               )}

               <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-2xl">
                 <h3 className="text-sm font-black text-white flex items-center gap-2 mb-4"><CheckCircle2 className="text-indigo-400" size={18} /> Confirme sua Presença</h3>
                 
                 <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                   <div className="relative">
                     <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                     <input type="text" required placeholder="Seu Nome Completo" value={name} onChange={e => setName(e.target.value)} className="w-full bg-black/40 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-colors" />
                   </div>
                   <div className="relative">
                     <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                     <input type="tel" required placeholder="WhatsApp ou E-mail" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-black/40 border border-slate-600 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-indigo-500 outline-none transition-colors" />
                   </div>
                   
                   <button type="submit" disabled={submitting} className="mt-2 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all">
                      {submitting ? 'Confirmando...' : 'Confirmar Participação'}
                   </button>
                 </form>
               </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
               <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                 <CheckCircle2 className="text-emerald-400" size={40} />
               </div>
               <h2 className="text-2xl font-black text-white mb-2">Presença Confirmada!</h2>
               <p className="text-slate-400 text-sm max-w-[250px]">Obrigado, {name.split(' ')[0]}! Sua participação foi registrada com sucesso.</p>
               
               {eventData.pixKey && (
                 <div className="mt-8 bg-black/30 p-4 rounded-xl border border-white/5 w-full">
                   <p className="text-[10px] uppercase font-black text-slate-500 mb-2">Ainda não fez sua doação?</p>
                   <button onClick={handleCopyPix} className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-emerald-400 border border-emerald-500/20'}`}>
                     {copied ? 'Chave Copiada!' : 'Copiar Chave PIX'}
                   </button>
                 </div>
               )}
            </div>
          )}

        </div>
        
        <div className="py-4 text-center border-t border-white/5 bg-black/40 mt-4">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
            Apoio Logístico: CampanhaDigital IA
          </p>
        </div>
      </div>
    </div>
  );
}
