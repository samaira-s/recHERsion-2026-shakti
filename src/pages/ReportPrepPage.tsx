import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData } from '../lib/crypto';
import { extractSuspectDetails } from '../lib/extractor';
import { CaseRecord, EvidenceItem, SuspectDetail } from '../types';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Shield, Download, ArrowLeft, Copy, Check, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

export const ReportPrepPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [suspects, setSuspects] = useState<SuspectDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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
      const evItems: EvidenceItem[] = decrypted.items || [];
      setItems(evItems);
      setSuspects(extractSuspectDetails(evItems));
    } catch (err) {
      console.error('Error loading report prep data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateComplaintDraft = () => {
    const phones = suspects.filter(s => s.type === 'phone' && !s.ignored).map(s => s.value).join(', ');
    const upis = suspects.filter(s => s.type === 'upi' && !s.ignored).map(s => s.value).join(', ');
    const handles = suspects.filter(s => s.type === 'handle' && !s.ignored).map(s => s.value).join(', ');

    return `Subject: Complaint regarding online harassment, extortion and impersonation.

To,
The Cyber Crime Cell / Authorities,
National Cyber Crime Reporting Portal (cybercrime.gov.in)

Respected Sir/Madam,

I am writing to formally report an incident of online harassment, extortion and threat.
- Case Title: ${caseRecord?.title}
- Incident Date / Timeline: Starting from ${new Date(caseRecord?.createdAt || '').toLocaleDateString()}
- Suspect Identifiers:
  · Phone Numbers: ${phones || 'None specified'}
  · UPI IDs: ${upis || 'None specified'}
  · Social Handles: ${handles || 'None specified'}

Incident Summary:
The perpetrator approached me online and progressively initiated pressure, demands for money (UPI: ${upis || 'N/A'}), and threats to distribute personal information or photos. I have securely preserved all chat logs, screenshots, and cryptographic integrity hashes as evidence.

I kindly request you to take urgent action against the above suspect accounts, block the associated UPI IDs and phone numbers, and help secure justice.

Sincerely,
[Complainant / Survivor]`;
  };

  const handleDownloadPdf = async () => {
    if (!caseRecord) return;
    setGeneratingPdf(true);

    try {
      const doc = new jsPDF();
      let y = 20;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(61, 56, 70);
      doc.text('Shakti — Evidence & Report Draft', 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(155, 142, 219);
      doc.text(`Case ID: ${caseRecord.id} · Generated: ${new Date().toLocaleString()}`, 20, y);
      y += 15;

      // Complaint Draft
      doc.setFontSize(14);
      doc.setTextColor(61, 56, 70);
      doc.text('1. Complaint Draft', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const draftText = generateComplaintDraft();
      const splitDraft = doc.splitTextToSize(draftText, 170);
      doc.text(splitDraft, 20, y);
      y += splitDraft.length * 5 + 10;

      // Evidence Summary
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.setTextColor(61, 56, 70);
      doc.text('2. Evidence Timeline & Cryptographic Hashes', 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      for (let i = 0; i < items.length; i++) {
        if (y > 270) { doc.addPage(); y = 20; }
        const item = items[i];
        doc.text(`[${i + 1}] ${item.platform} (${new Date(item.timestamp).toLocaleString()})`, 20, y);
        y += 5;
        doc.text(`Content Hash: ${item.contentHash}`, 25, y);
        y += 5;
        doc.text(`Chain Hash: ${item.chainHash}`, 25, y);
        y += 8;
      }

      let signatureTag = 'unsigned_fingerprint';
      const chainHead = items.length > 0 ? items[items.length - 1].chainHash : 'GENESIS';
      const timestamp = new Date().toISOString();
      try {
        const signRes = await fetch('/api/sign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseId: caseRecord.id, chainHead }),
        });
        const signData = await signRes.json();
        if (signData.signature) {
          signatureTag = `${caseRecord.id}.${chainHead}.${timestamp}.${signData.signature}`;
        }
      } catch (err) {
        console.error('Signing request failed, using unsigned format:', err);
      }

      if (y > 220) { doc.addPage(); y = 20; }
      const verifyUrl = `${window.location.origin}/verify#${signatureTag}`;
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 150 });
      doc.addImage(qrDataUrl, 'PNG', 20, y, 35, 35);

      doc.setFontSize(9);
      doc.setTextColor(61, 56, 70);
      doc.text('Scan QR code to verify cryptographic integrity on Shakti. Your witness. Your vault. Only yours.', 60, y + 15);
      y += 45;

      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text('Assistive draft prepared for legal review. Not legal advice.', 20, y);

      doc.save(`Shakti-Report-${caseRecord.id}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading || !caseRecord) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-ivory)]">Preparing report...</div>;
  }

  const complaintDraft = generateComplaintDraft();

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(`/case/${id}`)}
            className="flex items-center gap-2 text-xs font-semibold text-[#9B8EDB] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to case</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex items-center gap-2 rounded-2xl bg-[#9B8EDB] px-5 py-3 text-sm font-medium text-white shadow-md hover:bg-[#867bc7] transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{generatingPdf ? 'Generating PDF...' : 'Download evidence report (PDF)'}</span>
          </button>
        </div>

        {/* Notice */}
        <div className="rounded-2xl bg-[#88C4A5]/15 p-4 border border-[#88C4A5]/30 flex items-center gap-3 text-xs text-[var(--text-ivory)]">
          <Shield className="w-5 h-5 text-[#88C4A5] shrink-0" />
          <div>
            <strong className="text-[#88C4A5]">Important Notice:</strong> This follows the National Cyber Crime Reporting Portal's steps. Please check your details against the live form at <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="underline font-bold">cybercrime.gov.in</a>. Shakti is an assistive tool and does not claim official portal integration.
          </div>
        </div>

        {/* What Happens Next Card */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[var(--border-color)] space-y-4">
          <h2 className="text-xl font-serif font-bold text-[var(--text-ivory)]">What Happens Next</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
            <div className="rounded-2xl bg-[var(--bg-cards)] p-4 border border-[var(--border-color)] space-y-2">
              <h3 className="font-bold text-[var(--text-ivory)]">1. Report to Platform</h3>
              <p>Report the abusive profile or chats directly on Instagram, WhatsApp, or Telegram for swift removal.</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-cards)] p-4 border border-[var(--border-color)] space-y-2">
              <h3 className="font-bold text-[var(--text-ivory)]">2. Report Online</h3>
              <p>Submit formal complaint on cybercrime.gov.in or call helpline 1930 using your generated complaint draft.</p>
            </div>
            <div className="rounded-2xl bg-[var(--bg-cards)] p-4 border border-[var(--border-color)] space-y-2">
              <h3 className="font-bold text-[var(--text-ivory)]">3. Visit in Person</h3>
              <p>Visit your local cyber cell or women police station if you require urgent physical intervention or FIR registration.</p>
            </div>
          </div>
        </div>

        {/* Complaint Draft Card */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[var(--border-color)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-bold text-[var(--text-ivory)]">Complaint Draft</h2>
            <button
              onClick={() => handleCopyText(complaintDraft, 'draft')}
              className="flex items-center gap-1.5 rounded-xl bg-[#EAE6F8] px-3 py-1.5 text-xs font-medium text-[#9B8EDB] hover:bg-[#EAE6F8]/60 transition border border-[#9B8EDB]/30"
            >
              {copiedField === 'draft' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedField === 'draft' ? 'Copied' : 'Copy Draft'}</span>
            </button>
          </div>

          <div className="rounded-2xl bg-[var(--bg-base)] p-4 text-xs font-mono text-[var(--text-ivory)] whitespace-pre-wrap max-h-96 overflow-y-auto border border-[var(--border-color)]">
            {complaintDraft}
          </div>
        </div>
      </main>
    </div>
  );
};
