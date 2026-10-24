import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData } from '../lib/crypto';
import { extractSuspectDetails, runOcrOnImage } from '../lib/extractor';
import { CaseRecord, EvidenceItem, SuspectDetail } from '../types';
import { Shield, Copy, Check, EyeOff, Eye, ArrowLeft, FileSearch, Sparkles } from 'lucide-react';

export const SuspectExtractorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [suspects, setSuspects] = useState<SuspectDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const session = getVaultSession();
    if (!session.key) {
      navigate('/');
      return;
    }
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const session = getVaultSession();
      if (!session.key || !id) return;

      const enc = await getEncryptedCases();
      const target = enc.find(c => c.id === id);
      if (!target) {
        navigate('/home');
        return;
      }

      const decrypted = await decryptData(session.key, target.ciphertext, target.iv);
      setCaseRecord(decrypted.caseRecord);
      const items: EvidenceItem[] = decrypted.items || [];

      setOcrRunning(true);
      for (const item of items) {
        if (item.type === 'screenshot' && item.content.startsWith('data:image')) {
          const ocrText = await runOcrOnImage(item.content);
          if (ocrText) {
            item.note = `${item.note || ''} [OCR: ${ocrText}]`;
          }
        }
      }
      setOcrRunning(false);

      const extracted = extractSuspectDetails(items);
      setSuspects(extracted);
    } catch (err) {
      console.error('Error extracting suspect details:', err);
      setOcrRunning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (value: string, id: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleIgnore = (id: string) => {
    setSuspects(prev => prev.map(s => s.id === id ? { ...s, ignored: !s.ignored } : s));
  };

  if (loading || !caseRecord) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-ivory)]">Extracting suspect details & running OCR...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/case/${id}`)}
            className="flex items-center gap-2 text-xs font-semibold text-[#C9A24B] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to case</span>
          </button>
          {ocrRunning && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#C9A24B] animate-pulse">
              <Sparkles className="w-4 h-4" /> Running Tesseract OCR on images...
            </span>
          )}
        </div>

        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A24B]">Evidence Intelligence</span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-ivory)]">Suspect Extractor & Authority Details</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Automatically extracted phone numbers, UPI IDs, social handles, URLs, and payment amounts from your evidence and OCR.
          </p>
        </div>

        {suspects.length === 0 ? (
          <div className="rounded-3xl bg-[var(--bg-raised)] p-12 text-center border border-[#C9A24B]/20 space-y-3">
            <FileSearch className="w-10 h-10 text-[#C9A24B] mx-auto opacity-75" />
            <h3 className="text-base font-serif font-bold text-[var(--text-ivory)]">No suspect identifiers found</h3>
            <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
              Add more chat text or screenshots containing phone numbers or UPI IDs to see them extracted here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl bg-[var(--bg-raised)] shadow-sm border border-[#C9A24B]/25">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#C9A24B]/10 text-[var(--text-ivory)] font-semibold border-b border-[#C9A24B]/20">
                <tr>
                  <th className="p-4">Type</th>
                  <th className="p-4">Identifier / Value</th>
                  <th className="p-4">Source Context</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9A24B]/10">
                {suspects.map(s => (
                  <tr key={s.id} className={s.ignored ? 'opacity-40 bg-[var(--bg-base)]' : 'hover:bg-[var(--bg-cards)]/50'}>
                    <td className="p-4 uppercase font-semibold text-[#C9A24B]">{s.type}</td>
                    <td className="p-4 font-mono font-bold text-[var(--text-ivory)]">{s.value}</td>
                    <td className="p-4 text-[var(--text-muted)] truncate max-w-xs">{s.sourceText}</td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => handleCopy(s.value, s.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[#C9A24B]/15 px-3 py-1.5 font-medium text-[#C9A24B] hover:bg-[#C9A24B]/25 transition border border-[#C9A24B]/30"
                      >
                        {copiedId === s.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId === s.id ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={() => toggleIgnore(s.id)}
                        className="inline-flex items-center gap-1 rounded-xl bg-[var(--bg-cards)] px-3 py-1.5 font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20"
                        title={s.ignored ? 'Mark as relevant' : 'Mark as not relevant'}
                      >
                        {s.ignored ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{s.ignored ? 'Include' : 'Ignore'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
