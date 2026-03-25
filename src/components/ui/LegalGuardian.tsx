import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale, ShieldAlert, BookOpen, AlertCircle, FileText, Search,
  Clock, FileWarning, PlayCircle, Shield, ArrowRight,
  ExternalLink, Sparkles, RefreshCw, FileDown, Plus, Trash2,
  Download, Save, Copy, CheckCircle2, FolderOpen
} from 'lucide-react';
import {
  fetchJurisprudenceDB, generateDefenseThesis, saveDefenseToFirestore, exportDefenseAsWord,
  type Jurisprudence
} from '../../services/legalService';
import { useCampaign } from '../../context/CampaignContext';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc, query, orderBy
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import jsPDF from 'jspdf';

// ── Types ─────────────────────────────────────────────────────────────────────
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

interface ProcessEntry {
  id: string;
  cnjNumber: string;
  type: string;
  court: string;
  status: 'Ativo' | 'Prazo Aberto' | 'Julgado' | 'Arquivado';
  description: string;
  createdAt?: unknown;
}

interface DefenseRecord {
  id: string;
  processInfo: string;
  thesis: string;
  createdAt?: { seconds: number };
}

// ── PDF Helper ────────────────────────────────────────────────────────────────
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
  if (j.link) { pdf.setFont('helvetica', 'italic'); pdf.setFontSize(8); pdf.setTextColor(99, 102, 241); pdf.text(`Portal TSE: ${j.link}`, 14, y); }
  pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
  pdf.text('Gerado por CampanhaDigital IA — Apenas para referência interna.', W / 2, 290, { align: 'center' });
  pdf.save(`jurisprudencia_${j.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
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

// ── Component ─────────────────────────────────────────────────────────────────
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

  // Processos (user-driven)
  const [processes, setProcesses] = useState<ProcessEntry[]>([]);
  const [newProcess, setNewProcess] = useState<Omit<ProcessEntry, 'id'>>({
    cnjNumber: '', type: '', court: 'TRE-RS', status: 'Ativo', description: ''
  });
  const [addingProcess, setAddingProcess] = useState(false);

  // Botão do Pânico
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicInputText, setPanicInputText] = useState('');
  const [panicThesis, setPanicThesis] = useState<string | null>(null);
  const [copiedThesis, setCopiedThesis] = useState(false);
  const [savingDefense, setSavingDefense] = useState(false);
  const [savedDefenseId, setSavedDefenseId] = useState<string | null>(null);

  // Defesas salvas
  const [defenses, setDefenses] = useState<DefenseRecord[]>([]);
  const [defensesOpen, setDefensesOpen] = useState(false);

  // Caderno do Advogado
  const [notes, setNotes] = useState<LegalNote[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [newNote, setNewNote] = useState<Omit<LegalNote, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    type: 'Prazo', description: '', responsible: '', status: 'Aberto',
  });

  const loadJuri = async () => {
    setJuriLoading(true);
    const result = await fetchJurisprudenceDB(campaignYear);
    setJurisprudence(result.data);
    setJuriIsAI(result.isAI);
    setJuriRateLimited(result.isRateLimited);
    setJuriLoading(false);
  };

  useEffect(() => { loadJuri(); }, [campaignYear]); // eslint-disable-line

  const pathFor = useCallback((sub: string) =>
    activeCampaign ? `campaigns/${activeCampaign.id}/${sub}` : null,
    [activeCampaign]);

  // Processos listener
  useEffect(() => {
    const path = pathFor('processes');
    if (!path) { setProcesses([]); return; }
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setProcesses(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcessEntry)))
    );
  }, [pathFor]);

  // Defesas listener
  useEffect(() => {
    const path = pathFor('defenses');
    if (!path) { setDefenses([]); return; }
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setDefenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as DefenseRecord)))
    );
  }, [pathFor]);

  // Caderno listener
  useEffect(() => {
    const path = pathFor('legalNotes');
    if (!path) { setNotes([]); return; }
    return onSnapshot(collection(db, path), snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as LegalNote));
      data.sort((a, b) => (a.date > b.date ? -1 : 1));
      setNotes(data);
    });
  }, [pathFor]);

  const handleAddProcess = async () => {
    const path = pathFor('processes');
    if (!path || !newProcess.cnjNumber.trim()) return;
    setAddingProcess(true);
    try {
      await addDoc(collection(db, path), { ...newProcess, createdAt: serverTimestamp() });
      setNewProcess({ cnjNumber: '', type: '', court: 'TRE-RS', status: 'Ativo', description: '' });
    } finally { setAddingProcess(false); }
  };

  const handleDeleteProcess = async (pid: string) => {
    const path = pathFor('processes');
    if (!path) return;
    await deleteDoc(doc(db, path, pid));
  };

  const handlePanicButton = async () => {
    if (!panicInputText.trim()) return;
    setPanicLoading(true); setPanicThesis(null); setSavedDefenseId(null);
    const thesis = await generateDefenseThesis(panicInputText);
    setPanicThesis(thesis);
    setPanicLoading(false);
  };

  const handleSaveDefense = async () => {
    if (!panicThesis || !activeCampaign) return;
    setSavingDefense(true);
    try {
      const id = await saveDefenseToFirestore(activeCampaign.id, panicInputText, panicThesis);
      setSavedDefenseId(id);
      setDefensesOpen(true);
    } finally { setSavingDefense(false); }
  };

  const handleCopyThesis = async () => {
    if (!panicThesis) return;
    await navigator.clipboard.writeText(panicThesis);
    setCopiedThesis(true);
    setTimeout(() => setCopiedThesis(false), 2500);
  };

  const handleAddNote = async () => {
    const path = pathFor('legalNotes');
    if (!path || !newNote.description.trim()) return;
    setSavingNote(true);
    try {
      await addDoc(collection(db, path), { ...newNote, createdAt: serverTimestamp() });
      setNewNote({ date: new Date().toISOString().slice(0, 10), type: 'Prazo', description: '', responsible: '', status: 'Aberto' });
    } finally { setSavingNote(false); }
  };

  const handleDeleteNote = async (nid: string) => {
    const path = pathFor('legalNotes');
    if (!path) return;
    await deleteDoc(doc(db, path, nid));
  };

  const handleUpdateNoteStatus = async (nid: string, status: NoteStatus) => {
    const path = pathFor('legalNotes');
    if (!path) return;
    await updateDoc(doc(db, path, nid), { status });
  };

  const filteredJuri = juriSearch.trim()
    ? jurisprudence.filter(j =>
        j.theme.toLowerCase().includes(juriSearch.toLowerCase()) ||
        j.decision.toLowerCase().includes(juriSearch.toLowerCase()))
    : jurisprudence;

  const processBadge = (s: string) => {
    if (s === 'Prazo Aberto') return 'bg-red-500/20 text-red-400 border-red-500/20';
    if (s === 'Julgado') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20';
    if (s === 'Arquivado') return 'bg-slate-500/20 text-slate-400 border-slate-500/20';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
  };

  const noteTypeBadge = (type: NoteType) => {
    const map: Record<NoteType, string> = {
      'Prazo': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Diligência': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Observação': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
      'Alerta': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
            {campaignCnpj && <span className="ml-2 font-mono text-[11px] text-indigo-300">CNPJ: {campaignCnpj}</span>}
          </p>
        </div>
      </div>

      {/* ── Bloco 1: Jurisprudência via Gemini (dados reais) ── */}
      <div className="glass-card border border-amber-500/20">
        <div className="p-4 border-b border-amber-500/15 bg-amber-950/20 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen size={16} className="text-amber-500 shrink-0" />
            <h3 className="font-bold text-amber-200 text-sm m-0">
              Jurisprudência TSE/TRE-RS{campaignYear ? ` • Eleição ${campaignYear}` : ''}
            </h3>
            {juriIsAI ? (
              <span className="flex items-center gap-1 bg-emerald-500/20 border border-emerald-500/30 rounded px-2 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles size={10} /> Gemini AI — Decisões Reais
              </span>
            ) : juriRateLimited ? (
              <span className="bg-orange-500/20 border border-orange-500/30 rounded px-2 py-0.5 text-[10px] font-bold text-orange-400 uppercase">
                ⏳ Rate Limit — Aguarde
              </span>
            ) : (
              <span className="bg-slate-700/50 border border-slate-600/30 rounded px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase">
                Configure Gemini API Key
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="text" placeholder="Filtrar..." value={juriSearch}
                onChange={e => setJuriSearch(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 w-28" />
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

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {juriLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-slate-900/50 border border-amber-500/10 rounded-lg p-4 animate-pulse h-28" />
            ))
          ) : filteredJuri.length === 0 ? (
            <div className="col-span-full text-center py-10 flex flex-col items-center gap-3">
              <RefreshCw size={20} className="text-slate-600" />
              <div>
                <p className="text-sm font-bold text-slate-500">
                  {juriRateLimited ? 'Limite da API atingido' : 'Nenhuma decisão carregada'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {juriRateLimited
                    ? 'Aguarde ~1 minuto e clique em recarregar.'
                    : 'Configure a VITE_GEMINI_API_KEY e clique em recarregar para buscar decisões reais.'}
                </p>
              </div>
              <button onClick={loadJuri}
                className="flex items-center gap-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                <RefreshCw size={12} /> Recarregar Agora
              </button>
            </div>
          ) : filteredJuri.map(j => (
            <div key={j.id} className="bg-slate-900/60 border border-amber-500/15 rounded-lg p-3 flex flex-col gap-1.5 hover:bg-slate-800 transition-colors group relative">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">{j.tribunal}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">{j.date}</span>
                  <button onClick={() => exportJuriCardPdf(j)} title="Exportar PDF"
                    className="opacity-0 group-hover:opacity-100 p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/20 transition-all">
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

      {/* ── Bloco 2: Processos Judiciais (user-driven, Firestore) ── */}
      <div className="glass-card border border-indigo-500/20">
        <div className="p-4 border-b border-indigo-500/20 bg-indigo-950/20">
          <h3 className="font-bold text-indigo-300 flex items-center gap-2 m-0 text-sm">
            <Shield size={16} className="text-indigo-400 shrink-0" /> Processos & Intimações da Campanha
          </h3>
          <p className="text-xs text-indigo-200/40 mt-1 m-0">
            Registre os processos recebidos. O advogado insere o CNJ e o sistema organiza. &nbsp;
            <a href="https://pje.tse.jus.br/consultapublica/ConsultaPublica/listView.seam"
              target="_blank" rel="noreferrer"
              className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-0.5 transition-colors">
              Consultar processos no PJe <ExternalLink size={10} />
            </a>
          </p>
        </div>

        {/* Linha de entrada */}
        <div className="p-4 border-b border-white/5 bg-slate-950/20">
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            <input placeholder="CNJ (ex: 0600123-45.2022.6.21.0000)" value={newProcess.cnjNumber}
              onChange={e => setNewProcess(p => ({ ...p, cnjNumber: e.target.value }))}
              className="sm:col-span-2 bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500" />
            <input placeholder="Tipo (ex: Representação)" value={newProcess.type}
              onChange={e => setNewProcess(p => ({ ...p, type: e.target.value }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
            <select value={newProcess.court}
              onChange={e => setNewProcess(p => ({ ...p, court: e.target.value }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500">
              {['TRE-RS', 'TSE', 'TRE-SP', 'TRE-RJ', 'Outro'].map(c => <option key={c}>{c}</option>)}
            </select>
            <select value={newProcess.status}
              onChange={e => setNewProcess(p => ({ ...p, status: e.target.value as ProcessEntry['status'] }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500">
              {['Ativo', 'Prazo Aberto', 'Julgado', 'Arquivado'].map(s => <option key={s}>{s}</option>)}
            </select>
            <button onClick={handleAddProcess} disabled={addingProcess || !newProcess.cnjNumber.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg px-3 transition-colors flex items-center justify-center">
              <Plus size={15} />
            </button>
          </div>
          <input placeholder="Descrição / objeto do processo (opcional)"
            value={newProcess.description}
            onChange={e => setNewProcess(p => ({ ...p, description: e.target.value }))}
            className="w-full mt-2 bg-slate-900 border border-slate-700 text-slate-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500" />
        </div>

        <div className="overflow-x-auto">
          {processes.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2">
              <Clock size={20} className="text-slate-700" />
              <p className="text-slate-500 text-sm font-bold">Nenhum processo registrado</p>
              <p className="text-slate-600 text-xs">Use o formulário acima para inserir números CNJ de processos recebidos.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-indigo-950/40 text-indigo-200/60 uppercase tracking-wider border-b border-white/5">
                  <th className="p-3 font-semibold">TIPO & CNJ</th>
                  <th className="p-3 font-semibold">DESCRIÇÃO</th>
                  <th className="p-3 font-semibold w-24 text-center">TRIBUNAL</th>
                  <th className="p-3 font-semibold w-28 text-center">STATUS</th>
                  <th className="p-3 font-semibold text-right w-20">AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {processes.map(p => (
                  <tr key={p.id} className="border-b border-white/5 text-slate-300 hover:bg-white/2 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-200">{p.type || '—'}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{p.cnjNumber}</div>
                    </td>
                    <td className="p-3 text-xs text-slate-400 max-w-xs">{p.description || '—'}</td>
                    <td className="p-3 text-center font-bold text-indigo-400/80">{p.court}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border whitespace-nowrap ${processBadge(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            const text = `PROCESSO CNJ: ${p.cnjNumber}\nTIPO: ${p.type}\nLOCAL: ${p.court}\n\nSÍNTESE:\n${p.description}`;
                            setPanicInputText(text);
                            document.getElementById('panic-section')?.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 px-2 py-1.5 rounded transition-colors inline-flex items-center gap-1 text-[10px] font-bold"
                          title="Usar no Gerador de Defesa">
                          <ArrowRight size={12} /> Defender
                        </button>
                        <button onClick={() => handleDeleteProcess(p.id)}
                          className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Bloco 3: Gerador de Defesa RAG ── */}
      <div id="panic-section" className="glass-card border border-red-500/30"
        style={{ background: 'linear-gradient(to bottom, rgba(127,29,29,0.10), transparent)' }}>
        <div className="p-4 border-b border-red-500/20 bg-red-500/5">
          <h3 className="font-bold text-red-500 flex items-center gap-2 m-0 text-base">
            <ShieldAlert size={20} /> Gerador de Defesa RAG
          </h3>
          <p className="text-xs text-red-400/70 m-0 mt-1">
            Use <strong>"→ Defender"</strong> em um processo acima para auto-preencher, ou cole a intimação abaixo.
          </p>
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><FileWarning size={13} className="text-red-400" /> Objeto da Acusação / Intimação</span>
              <span className="text-slate-600 font-normal text-[10px]">(editável após auto-fill)</span>
            </label>
            <textarea value={panicInputText} onChange={e => setPanicInputText(e.target.value)}
              placeholder="Cole aqui o texto da intimação recebida, ou use '→ Defender' em um processo acima..."
              className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-4 text-sm text-slate-200 resize-none h-44 focus:outline-none focus:border-red-500/50 transition-all placeholder:text-slate-600" />
            <button onClick={handlePanicButton} disabled={panicLoading || !panicInputText.trim()}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-[0_4px_20px_rgba(220,38,38,0.35)] flex items-center justify-center gap-2 text-sm uppercase tracking-wider transition-all">
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
                  <span className="text-sm">Consultando base jurídica...</span>
                </motion.div>
              )}
              {!panicLoading && !panicThesis && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex-1 flex items-center justify-center text-slate-600 gap-2 h-44 border border-dashed border-slate-800 rounded-xl">
                  <FileText size={18} /><span className="text-sm">A tese de defesa aparecerá aqui.</span>
                </motion.div>
              )}
              {panicThesis && !panicLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-950 border border-red-500/30 rounded-xl p-4 flex flex-col relative min-h-44">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500 rounded-l-xl" />
                  <div className="flex items-center gap-2 mb-3 pl-1">
                    <FileText size={15} className="text-red-400" />
                    <span className="font-bold text-sm text-slate-200">Tese Gerada</span>
                    {savedDefenseId && (
                      <span className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded">
                        <CheckCircle2 size={10} /> Salvo no sistema
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap overflow-y-auto flex-1 pl-1 max-h-72">
                    {panicThesis}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/5 flex gap-2 flex-wrap">
                    {/* Salvar no Sistema */}
                    <button onClick={handleSaveDefense} disabled={savingDefense || !!savedDefenseId}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 disabled:opacity-50 text-indigo-400 border border-indigo-500/30 py-2.5 rounded-lg font-bold text-xs transition-colors">
                      {savingDefense ? <AlertCircle size={12} className="animate-spin" /> : <Save size={12} />}
                      {savedDefenseId ? 'Salvo' : 'Salvar no Sistema'}
                    </button>
                    {/* Exportar Word */}
                    <button onClick={() => exportDefenseAsWord(panicInputText, panicThesis)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 py-2.5 rounded-lg font-bold text-xs transition-colors">
                      <FileDown size={12} /> Exportar Word
                    </button>
                    {/* Copiar */}
                    <button onClick={handleCopyThesis}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-xs transition-colors border ${
                        copiedThesis
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                      }`}>
                      {copiedThesis ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {copiedThesis ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Bloco 4: Defesas Salvas ── */}
      <div className="glass-card border border-indigo-500/15">
        <button
          onClick={() => setDefensesOpen(o => !o)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-white/2 transition-colors rounded-xl">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-indigo-400" />
            <h3 className="font-bold text-indigo-300 text-sm m-0">Histórico de Defesas Geradas</h3>
            {defenses.length > 0 && (
              <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[9px] font-black px-1.5 py-0.5 rounded">
                {defenses.length}
              </span>
            )}
          </div>
          <span className="text-slate-500 text-xs">{defensesOpen ? '▲' : '▼'}</span>
        </button>
        {defensesOpen && (
          <div className="border-t border-white/5">
            {defenses.length === 0 ? (
              <div className="py-8 text-center text-slate-600 text-sm">
                Nenhuma defesa salva ainda. Gere uma tese e clique em "Salvar no Sistema".
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {defenses.map(d => {
                  const date = d.createdAt?.seconds
                    ? new Date(d.createdAt.seconds * 1000).toLocaleString('pt-BR')
                    : '—';
                  return (
                    <div key={d.id} className="p-4 hover:bg-white/2 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-slate-500 mb-1">{date}</p>
                          <p className="text-xs font-bold text-slate-400 truncate">{d.processInfo.slice(0, 100)}</p>
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{d.thesis.slice(0, 200)}...</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => exportDefenseAsWord(d.processInfo, d.thesis)}
                            className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded border border-blue-500/20 transition-colors" title="Exportar Word">
                            <FileDown size={12} />
                          </button>
                          <button onClick={() => navigator.clipboard.writeText(d.thesis)}
                            className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-400 rounded transition-colors" title="Copiar">
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bloco 5: Caderno do Advogado ── */}
      <div className="glass-card border border-violet-500/20">
        <div className="p-4 border-b border-violet-500/20 bg-violet-950/20 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-bold text-violet-300 flex items-center gap-2 m-0 text-sm">
              <BookOpen size={16} className="text-violet-400" /> Caderno do Advogado
            </h3>
            <p className="text-[11px] text-violet-200/40 mt-0.5 m-0">Prazos, diligências e anotações — persiste no Firestore.</p>
          </div>
          <button onClick={() => exportNotesCsv(notes)} disabled={notes.length === 0}
            className="flex items-center gap-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 border border-violet-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40">
            <Download size={13} /> Exportar CSV
          </button>
        </div>

        <div className="p-4 border-b border-white/5 bg-slate-950/30">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <input type="date" value={newNote.date}
              onChange={e => setNewNote(p => ({ ...p, date: e.target.value }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500" />
            <select value={newNote.type}
              onChange={e => setNewNote(p => ({ ...p, type: e.target.value as NoteType }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500">
              {(['Prazo', 'Diligência', 'Observação', 'Alerta'] as NoteType[]).map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Descrição *" value={newNote.description}
              onChange={e => setNewNote(p => ({ ...p, description: e.target.value }))}
              className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500 sm:col-span-2" />
            <div className="flex gap-2">
              <input placeholder="Responsável" value={newNote.responsible}
                onChange={e => setNewNote(p => ({ ...p, responsible: e.target.value }))}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-violet-500" />
              <button onClick={handleAddNote} disabled={savingNote || !newNote.description.trim()}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white px-3 rounded-lg transition-colors">
                <Plus size={15} />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {notes.length === 0 ? (
            <div className="py-10 text-center text-slate-600 text-sm flex flex-col items-center gap-2">
              <BookOpen size={20} className="text-slate-700" />
              Nenhuma anotação. Adicione a primeira linha acima.
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
                  <th className="p-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {notes.map(note => (
                  <tr key={note.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{note.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${noteTypeBadge(note.type)}`}>{note.type}</span>
                    </td>
                    <td className="p-3 text-slate-300">{note.description}</td>
                    <td className="p-3 text-slate-400">{note.responsible || '—'}</td>
                    <td className="p-3 text-center">
                      <select value={note.status}
                        onChange={e => handleUpdateNoteStatus(note.id, e.target.value as NoteStatus)}
                        className={`text-[10px] font-bold rounded px-2 py-1 border bg-transparent focus:outline-none cursor-pointer ${noteStatusBadge(note.status)}`}>
                        {(['Aberto', 'Em andamento', 'Concluído'] as NoteStatus[]).map(s => (
                          <option key={s} value={s} className="bg-slate-900 text-slate-300">{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded"><Trash2 size={13} /></button>
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
