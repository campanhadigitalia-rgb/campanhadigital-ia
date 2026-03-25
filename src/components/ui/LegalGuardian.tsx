import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, ShieldAlert, BookOpen, AlertCircle, FileText, Search,
  Clock, FileWarning, PlayCircle, Shield, ArrowRight, AlertTriangle,
  ExternalLink, Sparkles, RefreshCw, FileDown, Plus, Trash2, Download
} from 'lucide-react';
import {
  fetchJurisprudenceDB, fetchCampaignLawsuits, generateDefenseThesis,
  type Jurisprudence, type CampaignLawsuit
} from '../../services/legalService';
import { useCampaign } from '../../context/CampaignContext';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import jsPDF from 'jspdf';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type NoteType = 'Prazo' | 'Diligência' | 'Observação' | 'Alerta';
type NoteStatus = 'Aberto' | 'Em andamento' | 'Concluído';

interface LegalNote {
  id: string;
  date: string;
  type: NoteType;
  description: string;
  responsible: string;
  status: NoteStatus;
}

// ── Helpers PDF ───────────────────────────────────────────────────────────────
function exportJuriCardPdf(j: Jurisprudence) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();

  pdf.setFillColor(120, 88, 0);
  pdf.rect(0, 0, W, 32, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16); pdf.setTextColor(255, 233, 153);
  pdf.text('JURISPRUDÊNCIA TSE/TRE', W / 2, 14, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(253, 224, 71);
  pdf.text(`${j.tribunal} · ${j.date}`, W / 2, 24, { align: 'center' });

  let y = 44;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.setTextColor(30, 27, 75);
  const themeLines = pdf.splitTextToSize(j.theme.toUpperCase(), W - 28);
  pdf.text(themeLines, 14, y); y += themeLines.length * 6 + 6;

  pdf.setDrawColor(217, 119, 6); pdf.setLineWidth(0.5); pdf.line(14, y, W - 14, y); y += 6;

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10); pdf.setTextColor(30, 41, 59);
  const decLines = pdf.splitTextToSize(j.decision, W - 28);
  pdf.text(decLines, 14, y); y += decLines.length * 5 + 10;

  if (j.link) {
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8); pdf.setTextColor(99, 102, 241);
    pdf.text(`Portal TSE: ${j.link}`, 14, y);
  }

  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
  pdf.text('Gerado por CampanhaDigital IA — Apenas para referência interna.', W / 2, 290, { align: 'center' });
  pdf.save(`jurisprudencia_${j.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function exportThesisPdf(thesis: string, panicInput: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const now = new Date().toLocaleString('pt-BR');

  pdf.setFillColor(127, 29, 29);
  pdf.rect(0, 0, W, 36, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(17); pdf.setTextColor(254, 202, 202);
  pdf.text('TESE DEFENSIVA — BOTÃO DO PÂNICO', W / 2, 15, { align: 'center' });
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(252, 165, 165);
  pdf.text(`Gerado por CampanhaDigital IA em ${now}`, W / 2, 26, { align: 'center' });

  let y = 48;
  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(185, 28, 28);
  pdf.text('OBJETO DA ACUSAÇÃO / INTIMAÇÃO', 14, y + 5.5); y += 14;

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(30, 41, 59);
  const inputLines = pdf.splitTextToSize(panicInput, W - 28);
  pdf.text(inputLines, 14, y); y += inputLines.length * 5 + 10;

  pdf.setFillColor(254, 242, 242);
  pdf.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(185, 28, 28);
  pdf.text('TESE DEFENSIVA GERADA (RAG)', 14, y + 5.5); y += 14;

  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(15, 23, 42);
  const thesisLines = pdf.splitTextToSize(thesis, W - 28);

  // Handle page overflow for long theses
  thesisLines.forEach((line: string) => {
    if (y > 270) { pdf.addPage(); y = 20; }
    pdf.text(line, 14, y);
    y += 5;
  });

  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
  pdf.text('Documento interno — CampanhaDigital IA. Revisar com advogado antes de protocolar.', W / 2, 290, { align: 'center' });
  pdf.save(`tese_defensiva_${new Date().toISOString().slice(0, 10)}.pdf`);
}

function exportNotesCsv(notes: LegalNote[]) {
  const header = ['Data', 'Tipo', 'Descrição', 'Responsável', 'Status'];
  const rows = notes.map(n => [n.date, n.type, `"${n.description.replace(/"/g, '""')}"`, n.responsible, n.status]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `caderno_juridico_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

// ── Componente Principal ──────────────────────────────────────────────────────
export function LegalGuardian() {
  const { activeCampaign } = useCampaign();
  const campaignCnpj = activeCampaign?.legalConfig?.cnpj?.trim() || '';
  const campaignYear = activeCampaign?.year ? Number(activeCampaign.year) : undefined;

  // Jurisprudência
  const [jurisprudence, setJurisprudence] = useState<Jurisprudence[]>([]);
  const [juriIsAI, setJuriIsAI] = useState(false);
  const [juriRateLimited, setJuriRateLimited] = useState(false);
  const [juriLoading, setJuriLoading] = useState(false);
  const [juriSearch, setJuriSearch] = useState('');

  // Processos
  const [lawsuits, setLawsuits] = useState<CampaignLawsuit[]>([]);

  // Botão do Pânico
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicInputText, setPanicInputText] = useState('');
  const [panicThesis, setPanicThesis] = useState<string | null>(null);

  // Caderno do Advogado
  const [notes, setNotes] = useState<LegalNote[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [newNote, setNewNote] = useState<Omit<LegalNote, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    type: 'Prazo',
    description: '',
    responsible: '',
    status: 'Aberto',
  });

  const loadJuri = async () => {
    setJuriLoading(true);
    const result = await fetchJurisprudenceDB(campaignYear);
    setJurisprudence(result.data);
    setJuriIsAI(result.isAI);
    setJuriRateLimited(result.isRateLimited);
    setJuriLoading(false);
  };

  useEffect(() => { loadJuri(); }, [campaignYear]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    if (campaignCnpj) {
      fetchCampaignLawsuits().then(data => { if (active) setLawsuits(data); });
    } else {
      setLawsuits([]);
    }
    return () => { active = false; };
  }, [campaignCnpj]);

  // Caderno do Advogado — Firestore listener
  const notesCollectionPath = useCallback(() =>
    activeCampaign ? `campaigns/${activeCampaign.id}/legalNotes` : null,
    [activeCampaign]);

  useEffect(() => {
    const path = notesCollectionPath();
    if (!path) { setNotes([]); return; }
    const col = collection(db, path);
    const unsub = onSnapshot(col, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalNote));
      data.sort((a, b) => a.date > b.date ? -1 : 1);
      setNotes(data);
    });
    return unsub;
  }, [notesCollectionPath]);

  const handleAddNote = async () => {
    const path = notesCollectionPath();
    if (!path || !newNote.description.trim()) return;
    setSavingNote(true);
    try {
      await addDoc(collection(db, path), { ...newNote, createdAt: serverTimestamp() });
      setNewNote({ date: new Date().toISOString().slice(0, 10), type: 'Prazo', description: '', responsible: '', status: 'Aberto' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const path = notesCollectionPath();
    if (!path) return;
    await deleteDoc(doc(db, path, noteId));
  };

  const handleUpdateNoteStatus = async (noteId: string, status: NoteStatus) => {
    const path = notesCollectionPath();
    if (!path) return;
    await updateDoc(doc(db, path, noteId), { status });
  };

  const handlePanicButton = async () => {
    if (!panicInputText.trim()) return;
    setPanicLoading(true);
    setPanicThesis(null);
    const thesis = await generateDefenseThesis(panicInputText);
    setPanicThesis(thesis);
    setPanicLoading(false);
  };

  const handleSelectLawsuit = (lawsuit: CampaignLawsuit) => {
    const text = `PROCESSO CNJ: ${lawsuit.cnjNumber}\nTIPO: ${lawsuit.type}\nLOCAL: ${lawsuit.court}\n\nSÍNTESE DA ACUSAÇÃO:\n${lawsuit.description}`;
    setPanicInputText(text);
    document.getElementById('panic-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const filteredJuri = juriSearch.trim()
    ? jurisprudence.filter(j =>
        j.theme.toLowerCase().includes(juriSearch.toLowerCase()) ||
        j.decision.toLowerCase().includes(juriSearch.toLowerCase()))
    : jurisprudence;

  const statusColor = (status: string) => {
    if (status === 'Prazo Aberto') return 'bg-red-500/20 text-red-400 border border-red-500/20';
    if (status === 'Julgado') return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
    return 'bg-amber-500/20 text-amber-500 border border-amber-500/20';
  };

  const noteTypeBadge = (type: NoteType) => {
    const map: Record<NoteType, string> = {
      'Prazo':      'bg-red-500/20 text-red-400 border-red-500/30',
      'Diligência': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Observação': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'Alerta':     'bg-amber-500/20 text-amber-400 border-amber-500/30',
    };
    return map[type] ?? 'bg-slate-500/20 text-slate-400';
  };

  const noteStatusBadge = (s: NoteStatus) => {
    if (s === 'Concluído') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (s === 'Em andamento') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    return 'bg-slate-600/20 text-slate-400 border-slate-600/30';
  };

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-red-500/20 text-red-500 rounded-xl border border-red-500/30 shrink-0">
          <Scale size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100 m-0">Guardião Jurídico</h2>
          <p className="text-sm text-slate-400 m-0 mt-0.5">
            Monitoramento ativo TSE/TRE{campaignYear ? ` • Eleição ${campaignYear}` : ''}.
          </p>
        </div>
      </div>

      {/* ── Bloco 1: Jurisprudência ── */}
      <div className="glass-card border border-amber-500/20 shadow-[0_0_15px_rgba(180,130,0,0.05)]">
        <div className="p-4 border-b border-amber-500/15 bg-amber-950/20 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen size={16} className="text-amber-500 shrink-0" />
            <h3 className="font-bold text-amber-200 text-sm m-0">
              Jurisprudência TSE/TRE-RS{campaignYear ? ` • Eleição ${campaignYear}` : ''}
            </h3>
            {juriIsAI ? (
              <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles size={10} /> Gemini AI — Dados Reais
              </span>
            ) : juriRateLimited ? (
              <span className="flex items-center gap-1 bg-orange-500/20 border border-orange-500/30 rounded px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                ⏳ Limite API — Referência Offline
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 rounded px-2 py-0.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Base de Referência
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text" placeholder="Filtrar..." value={juriSearch}
                onChange={e => setJuriSearch(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 transition-colors w-28"
              />
            </div>
            <button onClick={loadJuri} disabled={juriLoading} title="Recarregar via Gemini"
              className="p-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={juriLoading ? 'animate-spin' : ''} />
            </button>
            <a href="https://jurisprudencia.tse.jus.br/#/" target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[10px] font-bold text-amber-400/60 hover:text-amber-400 transition-colors">
              <ExternalLink size={12} /> Portal TSE
            </a>
          </div>
        </div>

        {!juriIsAI && (
          <div className={`px-4 py-2 text-[11px] border-b flex items-center gap-2 ${juriRateLimited ? 'text-orange-400/80 bg-orange-900/10 border-orange-500/10' : 'text-amber-700/80 bg-amber-900/10 border-amber-500/10'}`}>
            {juriRateLimited
              ? '⏳ Limite de requests da API Gemini atingido. Clique em recarregar após ~1 minuto.'
              : `⚠️ Exibindo base de referência. Clique em recarregar para buscar decisões reais via Gemini.${campaignYear ? ` (Eleição ${campaignYear})` : ''}`}
          </div>
        )}

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {juriLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-900/50 border border-amber-500/10 rounded-lg p-4 animate-pulse h-28" />
            ))
          ) : filteredJuri.length === 0 ? (
            <div className="col-span-full text-center text-slate-500 text-sm py-6">
              {campaignYear ? `Nenhuma decisão encontrada para Eleição ${campaignYear}. Tente recarregar.` : 'Nenhuma decisão encontrada.'}
            </div>
          ) : filteredJuri.map(j => (
            <div key={j.id} className="bg-slate-900/60 border border-amber-500/15 rounded-lg p-3 flex flex-col gap-1.5 hover:bg-slate-800 transition-colors group relative">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{j.tribunal}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">{j.date}</span>
                  <button
                    onClick={() => exportJuriCardPdf(j)}
                    title="Exportar card em PDF"
                    className="opacity-0 group-hover:opacity-100 p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/20 transition-all"
                  >
                    <FileDown size={11} />
                  </button>
                </div>
              </div>
              <p className="text-[11px] font-bold text-amber-300/80 uppercase tracking-wide leading-tight">{j.theme}</p>
              <p className="text-xs text-slate-300 leading-relaxed flex-1 line-clamp-4">{j.decision}</p>
              {j.link && (
                <a href={j.link} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-amber-500/50 hover:text-amber-400 transition-colors mt-1 self-start">
                  <ExternalLink size={10} /> Ver no TSE
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Bloco 2: Processos & Intimações ── */}
      <div className="glass-card border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
        <div className="p-4 border-b border-indigo-500/20 bg-indigo-950/20">
          <h3 className="font-bold text-indigo-300 flex items-center gap-2 m-0 text-sm">
            <Shield size={16} className="text-indigo-400 shrink-0" /> Processos & Intimações da Campanha
          </h3>
          <p className="text-xs text-indigo-200/40 mt-1 m-0">
            {campaignCnpj
              ? <>Monitorando CNPJ <span className="font-mono text-indigo-300">{campaignCnpj}</span> — PJe e Diários Oficiais.</>
              : 'Aguardando cadastro do CNPJ no painel "Deferimento Eleitoral".'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-indigo-950/40 text-indigo-200/70 uppercase tracking-wider border-b border-white/5">
                <th className="p-3 font-semibold">TIPO & CNJ</th>
                <th className="p-3 font-semibold">DESCRIÇÃO</th>
                <th className="p-3 font-semibold w-24 text-center">TRIBUNAL</th>
                <th className="p-3 font-semibold w-28 text-center">STATUS</th>
                <th className="p-3 font-semibold text-right w-20">DEFESA</th>
              </tr>
            </thead>
            <tbody>
              {!campaignCnpj ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <AlertTriangle size={22} className="text-amber-500" />
                      <div>
                        <p className="text-sm font-bold text-amber-400 m-0">CNPJ não cadastrado</p>
                        <p className="text-xs text-slate-500 mt-1">Cadastre o CNPJ em "Deferimento Eleitoral" para ativar o monitoramento PJe.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : lawsuits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Clock size={20} className="text-slate-600 animate-pulse" />
                      <span className="text-xs">Nenhuma movimentação processual detectada.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                lawsuits.map(lawsuit => (
                  <tr key={lawsuit.id} className="border-b border-white/5 text-slate-300 hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-200">{lawsuit.type}</span>
                        {lawsuit.isDemo && (
                          <span className="text-[9px] font-black text-slate-600 bg-slate-800 border border-slate-700 px-1 py-0.5 rounded uppercase tracking-wider">DEMO</span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{lawsuit.cnjNumber}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-400 max-w-xs">{lawsuit.description}</td>
                    <td className="p-3 text-center font-bold text-indigo-400/80">{lawsuit.court}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${statusColor(lawsuit.status)}`}>
                        {lawsuit.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleSelectLawsuit(lawsuit)}
                        className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-2 py-1.5 rounded transition-colors inline-flex items-center gap-1 text-[10px] font-bold"
                        title="Usar no Botão do Pânico">
                        <ArrowRight size={12} /> Pânico
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bloco 3: Botão do Pânico ── */}
      <div id="panic-section" className="glass-card border border-red-500/30" style={{ background: 'linear-gradient(to bottom, rgba(127,29,29,0.10), transparent)' }}>
        <div className="p-4 border-b border-red-500/20 bg-red-500/5">
          <h3 className="font-bold text-red-500 flex items-center gap-2 m-0 text-base">
            <ShieldAlert size={20} /> Botão do Pânico — Gerador de Defesa RAG
          </h3>
          <p className="text-xs text-red-400/70 m-0 mt-1">
            Clique em <strong>"→ Pânico"</strong> em um processo acima para auto-preencher, ou cole a intimação abaixo.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><FileWarning size={13} className="text-red-400" /> Objeto da Acusação / Intimação</span>
              <span className="text-slate-600 font-normal text-[10px]">(editável após auto-fill)</span>
            </label>
            <textarea
              value={panicInputText}
              onChange={e => setPanicInputText(e.target.value)}
              placeholder="Cole aqui o texto da intimação recebida, ou use '→ Pânico' em um processo acima..."
              className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-4 text-sm text-slate-200 resize-none h-44 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-slate-600"
            />
            <button
              onClick={handlePanicButton}
              disabled={panicLoading || !panicInputText.trim()}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(220,38,38,0.35)] flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all"
            >
              {panicLoading ? <AlertCircle className="animate-spin" size={18} /> : <PlayCircle size={18} />}
              {panicLoading ? 'Gerando Tese...' : 'Gerar Tese Defensiva (RAG)'}
            </button>
          </div>

          <div className="flex flex-col">
            <AnimatePresence>
              {panicLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex-1 flex items-center justify-center text-slate-500 gap-2 h-44">
                  <AlertCircle className="animate-spin text-red-500" size={20} />
                  <span className="text-sm">Consultando base jurídica e gerando tese...</span>
                </motion.div>
              )}
              {!panicLoading && !panicThesis && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex-1 flex items-center justify-center text-slate-600 gap-2 h-44 border border-dashed border-slate-800 rounded-xl">
                  <FileText size={18} />
                  <span className="text-sm">A tese de defesa gerada aparecerá aqui.</span>
                </motion.div>
              )}
              {panicThesis && !panicLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 border border-red-500/30 rounded-xl p-4 flex flex-col relative min-h-44">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl" />
                  <div className="flex items-center gap-2 mb-3 pl-1">
                    <FileText size={15} className="text-red-400" />
                    <span className="font-bold text-sm text-slate-200">Tese Gerada</span>
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 pl-1 max-h-72">
                    {panicThesis}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 flex-wrap">
                    <button
                      onClick={() => exportThesisPdf(panicThesis, panicInputText)}
                      className="flex-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 py-2.5 rounded-lg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <FileDown size={13} /> Exportar Tese em PDF
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(panicThesis ?? '')}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 py-2.5 rounded-lg font-bold text-xs transition-colors"
                    >
                      Copiar Draft
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Bloco 4: Caderno do Advogado ── */}
      <div className="glass-card border border-violet-500/20">
        <div className="p-4 border-b border-violet-500/20 bg-violet-950/20 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-violet-300 flex items-center gap-2 m-0 text-sm">
              <BookOpen size={16} className="text-violet-400" /> Caderno do Advogado
            </h3>
            <p className="text-[11px] text-violet-200/40 mt-0.5 m-0">Anotações, prazos e diligências — editável e exportável.</p>
          </div>
          <button
            onClick={() => exportNotesCsv(notes)}
            disabled={notes.length === 0}
            className="flex items-center gap-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40"
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>

        {/* Linha de entrada */}
        <div className="p-4 border-b border-white/5 bg-slate-950/30">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input
              type="date"
              value={newNote.date}
              onChange={e => setNewNote(p => ({ ...p, date: e.target.value }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500"
            />
            <select
              value={newNote.type}
              onChange={e => setNewNote(p => ({ ...p, type: e.target.value as NoteType }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500"
            >
              {(['Prazo', 'Diligência', 'Observação', 'Alerta'] as NoteType[]).map(t => <option key={t}>{t}</option>)}
            </select>
            <input
              placeholder="Descrição *"
              value={newNote.description}
              onChange={e => setNewNote(p => ({ ...p, description: e.target.value }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500 sm:col-span-2"
            />
            <div className="flex gap-2">
              <input
                placeholder="Responsável"
                value={newNote.responsible}
                onChange={e => setNewNote(p => ({ ...p, responsible: e.target.value }))}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={handleAddNote}
                disabled={savingNote || !newNote.description.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 rounded-lg transition-colors"
              >
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de notas */}
        <div className="overflow-x-auto">
          {notes.length === 0 ? (
            <div className="py-10 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
              <BookOpen size={20} className="text-slate-700" />
              Nenhuma anotação ainda. Adicione a primeira linha acima.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-violet-950/30 text-violet-200/60 uppercase tracking-wider border-b border-white/5">
                  <th className="p-3 font-semibold w-24">Data</th>
                  <th className="p-3 font-semibold w-24">Tipo</th>
                  <th className="p-3 font-semibold">Descrição</th>
                  <th className="p-3 font-semibold w-28">Responsável</th>
                  <th className="p-3 font-semibold w-32 text-center">Status</th>
                  <th className="p-3 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody>
                {notes.map(note => (
                  <tr key={note.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{note.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${noteTypeBadge(note.type)}`}>
                        {note.type}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{note.description}</td>
                    <td className="p-3 text-slate-400">{note.responsible || '—'}</td>
                    <td className="p-3 text-center">
                      <select
                        value={note.status}
                        onChange={e => handleUpdateNoteStatus(note.id, e.target.value as NoteStatus)}
                        className={`text-[10px] font-bold rounded px-2 py-1 border bg-transparent focus:outline-none cursor-pointer ${noteStatusBadge(note.status)}`}
                      >
                        {(['Aberto', 'Em andamento', 'Concluído'] as NoteStatus[]).map(s => (
                          <option key={s} value={s} className="bg-slate-900 text-slate-300">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
