import { useState, useEffect, useRef } from 'react';
import { ShieldCheck, FileCheck, Landmark, CheckCircle2, Save, ExternalLink, Upload, AlertTriangle, QrCode, Paperclip, X, FileDown } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../services/firebase';
import { useCampaign } from '../../context/CampaignContext';
import jsPDF from 'jspdf';

interface AttachedFile {
  name: string;
  size: number;
}

export function LegalOnboarding() {
  const { activeCampaign } = useCampaign();
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Record<string, AttachedFile | null>>({
    cnpj: null, bankAccount: null, pix: null,
    fidelidade: null, docs: null, tre: null, cnpj_emitted: null, spce_setup: null
  });
  const [legal, setLegal] = useState({
    cnpj: '',
    bankAccount: '',
    pix: '',
    checklist: {
      docs: false,
      tre: false,
      fidelidade: false,
      cnpj_emitted: false,
      spce_setup: false
    }
  });

  // Hidden file input refs
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (activeCampaign?.legalConfig) {
      setLegal({
        cnpj: activeCampaign.legalConfig.cnpj || '',
        bankAccount: activeCampaign.legalConfig.bankAccount || '',
        pix: (activeCampaign.legalConfig as { pix?: string }).pix || '',
        checklist: {
          docs: activeCampaign.legalConfig.checklist?.docs || false,
          tre: activeCampaign.legalConfig.checklist?.tre || false,
          fidelidade: activeCampaign.legalConfig.checklist?.fidelidade || false,
          cnpj_emitted: activeCampaign.legalConfig.checklist?.cnpj_emitted || false,
          spce_setup: activeCampaign.legalConfig.checklist?.spce_setup || false
        }
      });
    }
  }, [activeCampaign]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCampaign) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, COLLECTIONS.CAMPAIGNS, activeCampaign.id), {
        legalConfig: legal
      });
      alert('Informações Oficiais salvas com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const campanha = activeCampaign?.name || 'Campanha';
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    const W = pdf.internal.pageSize.getWidth();

    // ── Capa / Resumo ────────────────────────────────────────
    // Header band
    pdf.setFillColor(49, 46, 129); // indigo-900
    pdf.rect(0, 0, W, 36, 'F');
    pdf.setDrawColor(99, 102, 241);
    pdf.setLineWidth(0.8);
    pdf.line(0, 36, W, 36);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DEFERIMENTO ELEITORAL', W / 2, 16, { align: 'center' });
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(199, 210, 254);
    pdf.text('Checklist de Conformidade TSE — CampanhaDigital IA', W / 2, 26, { align: 'center' });

    let y = 48;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(30, 27, 75);
    pdf.text(campanha, 14, y);
    y += 7;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Gerado em: ${now}`, 14, y);
    y += 10;

    // Section: Dados Oficiais
    pdf.setFillColor(238, 242, 255);
    pdf.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(67, 56, 202);
    pdf.text('DADOS OFICIAIS DA CAMPANHA', 14, y + 5.5);
    y += 14;

    const row = (label: string, value: string) => {
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); pdf.setTextColor(71, 85, 105);
      pdf.text(label, 14, y);
      pdf.setFont('helvetica', 'normal'); pdf.setTextColor(15, 23, 42);
      pdf.text(value || '(não preenchido)', 55, y);
      y += 7;
    };
    row('CNPJ da Campanha:', legal.cnpj);
    row('Conta Eleitoral   :', legal.bankAccount);
    row('Chave PIX           :', legal.pix);
    y += 4;

    // Progresso
    pdf.setFillColor(238, 242, 255);
    pdf.roundedRect(10, y, W - 20, 8, 2, 2, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(67, 56, 202);
    pdf.text('CHECKLIST TSE — RITO DO CANDIDATO', 14, y + 5.5);
    y += 14;

    checkItems.forEach(item => {
      const checked = legal.checklist[item.id as keyof typeof legal.checklist];
      const att = attachments[item.id];
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9);
      pdf.setTextColor(checked ? 22 : 180, checked ? 163 : 20, checked ? 74 : 20);
      pdf.text(checked ? '✓' : '✗', 14, y);
      pdf.setTextColor(30, 41, 59);
      const lines = pdf.splitTextToSize(item.label, W - 50);
      pdf.text(lines, 22, y);
      if (att) {
        pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(99, 102, 241);
        pdf.text(`  📎 ${att.name} (${(att.size / 1024).toFixed(0)} KB)`, 22, y + lines.length * 4.5);
        y += lines.length * 4.5 + 5.5;
      } else {
        y += lines.length * 4.5 + 2;
      }
    });

    y += 6;
    // Status badge
    const isOk = progressPerc === 100;
    pdf.setFillColor(isOk ? 209 : 254, isOk ? 250 : 243, isOk ? 229 : 199);
    pdf.roundedRect(10, y, W - 20, 10, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5);
    pdf.setTextColor(isOk ? 21 : 120, isOk ? 128 : 53, isOk ? 61 : 15);
    const statusTxt = isOk
      ? '✅ Campanha 100% Legalizada e Apta ao Deferimento'
      : `⚠️  ${checkItems.length - currentChecks} pendência(s) para regulamentação — Completar: ${progressPerc}%`;
    pdf.text(statusTxt, W / 2, y + 6.5, { align: 'center' });

    // ── Rodapé ──────────────────────────────────────────────
    pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7.5); pdf.setTextColor(148, 163, 184);
    pdf.text('Documento gerado por CampanhaDigital IA — apenas para controle interno. Não substitui protocolos oficiais no TSE/TRE.', W / 2, 290, { align: 'center' });

    const fileName = `deferimento_${(legal.cnpj || 'campanha').replace(/[^\w]/g, '')}_${new Date().toISOString().slice(0,10)}.pdf`;
    pdf.save(fileName);
  };

  const handleToggle = (key: keyof typeof legal.checklist) => {
    setLegal(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [key]: !prev.checklist[key] }
    }));
  };

  const triggerFileInput = (key: string) => {
    fileRefs.current[key]?.click();
  };

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachments(prev => ({ ...prev, [key]: { name: file.name, size: file.size } }));
    }
  };

  const removeAttachment = (key: string) => {
    setAttachments(prev => ({ ...prev, [key]: null }));
    if (fileRefs.current[key]) fileRefs.current[key]!.value = '';
  };

  const checkItems = [
    { id: 'fidelidade', label: '1. Ata Partidária e Ficha de Filiação conferidas', link: 'https://www.tse.jus.br/partidos/filiacao-partidaria', tooltip: 'Filiação deve estar regular há pelo menos 6 meses.' },
    { id: 'docs', label: '2. Certidões Criminais e Documentação Pessoal (TRF/TJ)', link: 'https://www.tse.jus.br/eleicoes/eleicoes-2024/registro-de-candidatura', tooltip: 'Certidões de 1º e 2º graus — Justiça Estadual e Federal.' },
    { id: 'tre', label: '3. Candex: Pedido de Registro e Homologação no TRE', link: 'https://www.tse.jus.br/eleicoes/eleicoes-2024/candex', tooltip: 'Transmitir dados via sistema CANDEX ao TRE.' },
    { id: 'cnpj_emitted', label: '4. CNPJ de Campanha emitido (gerado pelo TSE)', link: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/cadastros/cnpj', tooltip: 'CNPJ gerado automaticamente pelo TSE em até 3 dias.' },
    { id: 'spce_setup', label: '5. Conta Bancária aberta e SPCE configurado', link: 'https://www.tse.jus.br/eleicoes/eleicoes-2024/prestacao-de-contas/sistema-de-prestacao-de-contas-eleitorais-spce', tooltip: 'Abrir conta no banco em até 10 dias após o CNPJ e iniciar o SPCE.' }
  ];

  const totalChecks = checkItems.length;
  const currentChecks = Object.values(legal.checklist).filter(v => v).length;
  const progressPerc = Math.round((currentChecks / totalChecks) * 100);
  const is100 = progressPerc === 100;

  const AttachButton = ({ field }: { field: string }) => {
    const att = attachments[field];
    return (
      <div className="flex items-center gap-1">
        {att ? (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded max-w-[120px]">
            <Paperclip size={8} />
            <span className="truncate">{att.name}</span>
            <button type="button" onClick={() => removeAttachment(field)} className="ml-0.5 text-red-400 hover:text-red-300">
              <X size={8} />
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => triggerFileInput(field)}
            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-0.5 rounded transition-colors text-[10px] border border-indigo-500/20"
          >
            <Upload size={9} /> Anexar
          </button>
        )}
        <input
          ref={el => { fileRefs.current[field] = el; }}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={e => handleFileChange(field, e)}
        />
      </div>
    );
  };

  return (
    <div className="glass-card p-5 border-indigo-500/20 h-full flex flex-col gap-5">
      {/* Header + Progress */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight leading-none">Onboarding TSE</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Fundação legal da campanha.</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xl font-black ${is100 ? 'text-emerald-400' : 'text-amber-500'}`}>{progressPerc}%</span>
          <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5 mt-1">
            <div className={`h-full transition-all duration-500 ${is100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${progressPerc}%` }} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4 flex-1">
        {/* CNPJ + Conta + PIX */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <FileCheck size={11} /> Dados Oficiais da Campanha
          </p>

          {/* CNPJ */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><FileCheck size={10} /> CNPJ da Campanha</label>
              <AttachButton field="cnpj" />
            </div>
            <input
              value={legal.cnpj}
              onChange={e => setLegal({ ...legal, cnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500/50 font-mono tracking-wider text-xs"
            />
          </div>

          {/* Conta bancária */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Landmark size={10} /> Conta Eleitoral (Banco/Agência/C/C)</label>
              <AttachButton field="bankAccount" />
            </div>
            <input
              value={legal.bankAccount}
              onChange={e => setLegal({ ...legal, bankAccount: e.target.value })}
              placeholder="Banco do Brasil · Ag: 1234 · C/C: 12345-6"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500/50 text-xs"
            />
          </div>

          {/* PIX */}
          <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><QrCode size={10} /> Chave PIX Oficial (Doações)</label>
              <AttachButton field="pix" />
            </div>
            <input
              value={legal.pix}
              onChange={e => setLegal({ ...legal, pix: e.target.value })}
              placeholder="CNPJ, email ou chave aleatória"
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500/50 text-xs font-mono"
            />
            <p className="text-[10px] text-slate-600">⚠️ O PIX de doações deve ter o mesmo CNPJ da campanha e ser registrado no SPCE.</p>
          </div>
        </div>

        {/* CHECKLIST */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle2 size={11} /> Checklist TSE (Rito do Candidato)
          </p>
          <div className="flex flex-col gap-1.5">
            {checkItems.map(item => {
              const isChecked = legal.checklist[item.id as keyof typeof legal.checklist];
              const att = attachments[item.id];
              return (
                <div key={item.id} className={`rounded-lg border bg-slate-900/60 border-white/5 hover:border-indigo-500/20 transition-colors ${isChecked ? 'opacity-70' : ''}`}>
                  <div className="flex items-center gap-2.5 p-2.5">
                    {/* Checkbox */}
                    <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'}`}>
                        {isChecked && <CheckCircle2 size={11} className="text-black" strokeWidth={3} />}
                      </div>
                      <span className={`text-[11px] font-medium leading-tight ${isChecked ? 'text-indigo-300 line-through' : 'text-slate-300'}`}>
                        {item.label}
                      </span>
                      <input type="checkbox" className="hidden" checked={isChecked} onChange={() => handleToggle(item.id as keyof typeof legal.checklist)} />
                    </label>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a href={item.link} target="_blank" rel="noreferrer" title={item.tooltip}
                        className="p-1 bg-slate-800 rounded hover:bg-slate-700 text-slate-500 hover:text-amber-400 transition-colors">
                        <ExternalLink size={11} />
                      </a>
                      <AttachButton field={item.id} />
                    </div>
                  </div>
                  {att && (
                    <div className="flex items-center gap-1 px-3 pb-2 text-[10px] text-emerald-400">
                      <Paperclip size={9} /> {att.name} ({(att.size / 1024).toFixed(0)} KB)
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {is100 ? (
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] text-center rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <ShieldCheck size={14} /> Campanha 100% Legalizada e Apta
            </div>
          ) : (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] text-center rounded-lg font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <AlertTriangle size={14} /> {totalChecks - currentChecks} pendência(s) para regulamentação
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] disabled:opacity-50"
        >
          {loading ? 'Salvando...' : <><Save size={15} /> Protocolar Base Legal</>}
        </button>
        <button
          type="button"
          onClick={generatePDF}
          className="flex items-center justify-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
        >
          <FileDown size={15} /> Gerar PDF de Deferimento
        </button>
      </form>
    </div>
  );
}
