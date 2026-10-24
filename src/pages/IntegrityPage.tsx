import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData } from '../lib/crypto';
import { verifyChain } from '../lib/hashChain';
import { CaseRecord, EvidenceItem } from '../types';
import { Shield, CheckCircle2, AlertTriangle, RefreshCw, ArrowLeft, Info } from 'lucide-react';

export const IntegrityPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [tamperedItems, setTamperedItems] = useState<EvidenceItem[]>([]);
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; firstTamperedId?: string; affectedIds: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

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
      setItems(decrypted.items || []);
      setTamperedItems(JSON.parse(JSON.stringify(decrypted.items || [])));

      const res = await verifyChain(decrypted.items || []);
      setVerificationResult(res);
    } catch (err) {
      console.error('Error loading integrity data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateTamper = async () => {
    if (items.length === 0) return;
    const mutated = JSON.parse(JSON.stringify(tamperedItems));
    if (mutated.length > 0) {
      mutated[0].content = mutated[0].content + ' [ALTERED BY ATTACKER]';
    }
    setTamperedItems(mutated);
    const res = await verifyChain(mutated);
    setVerificationResult(res);
  };

  const handleRestore = () => {
    setTamperedItems(JSON.parse(JSON.stringify(items)));
    verifyChain(items).then(res => setVerificationResult(res));
  };

  if (loading || !caseRecord) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-ivory)]">Loading integrity verification...</div>;
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
          <div className="flex gap-2">
            <button
              onClick={handleSimulateTamper}
              className="rounded-xl bg-[#F0B27A]/20 px-3 py-1.5 text-xs font-medium text-[#F0B27A] hover:bg-[#F0B27A]/30 transition border border-[#F0B27A]/40"
            >
              Demo: Simulate tampering
            </button>
            <button
              onClick={handleRestore}
              className="rounded-xl bg-[var(--bg-cards)] px-3 py-1.5 text-xs font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20 flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#C9A24B]" />
              <span>Restore</span>
            </button>
          </div>
        </div>

        {/* Status Banner */}
        {verificationResult?.valid ? (
          <div className="rounded-3xl bg-[#7FC4A3]/15 p-6 border border-[#7FC4A3]/40 flex items-center gap-4">
            <div className="rounded-2xl bg-[#7FC4A3] p-3 text-[#17101F]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[var(--text-ivory)]">All items are unchanged since you saved them.</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Cryptographic hash chain verification passed successfully in your browser.</p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-[#F0B27A]/20 p-6 border border-[#F0B27A]/50 flex items-center gap-4">
            <div className="rounded-2xl bg-[#F0B27A] p-3 text-[#17101F]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Integrity Mismatch Detected</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">Some evidence items do not match what was originally saved in the cryptographic chain.</p>
            </div>
          </div>
        )}

        {/* Plain Language Note */}
        <div className="rounded-2xl bg-[var(--bg-raised)] p-4 border border-[#C9A24B]/20 flex items-start gap-3 text-xs text-[var(--text-muted)]">
          <Info className="w-5 h-5 text-[#C9A24B] shrink-0 mt-0.5" />
          <p>
            <strong className="text-[var(--text-ivory)]">Plain-language note:</strong> This shows whether your files changed after saving in Saakshi. It verifies that your evidence records haven't been altered on your device. It doesn't prove the original screenshots were genuine when received.
          </p>
        </div>

        {/* Evidence Hash List */}
        <div className="space-y-4">
          <h3 className="text-xl font-serif font-bold text-[var(--text-ivory)]">Cryptographic Chain List</h3>

          <div className="space-y-3">
            {tamperedItems.map((item, index) => {
              const isFirstTampered = verificationResult?.firstTamperedId === item.id;
              const isAffected = verificationResult?.affectedIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl p-5 border transition ${
                    isFirstTampered
                      ? 'bg-[#F0B27A]/20 border-[#F0B27A]'
                      : isAffected
                      ? 'bg-[#F0B27A]/10 border-[#F0B27A]/40'
                      : 'bg-[var(--bg-raised)] border-[#C9A24B]/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#C9A24B]">Item #{index + 1} · {item.platform}</span>
                    {isFirstTampered ? (
                      <span className="rounded-full bg-[#F0B27A] px-3 py-0.5 text-xs font-medium text-[#17101F]">This item doesn't match what was saved</span>
                    ) : isAffected ? (
                      <span className="rounded-full bg-[#F0B27A]/40 px-3 py-0.5 text-xs font-medium text-[#17101F]">Affected by prior change</span>
                    ) : (
                      <span className="rounded-full bg-[#7FC4A3]/20 px-3 py-0.5 text-xs font-medium text-[#7FC4A3] border border-[#7FC4A3]/30">Verified intact</span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-muted)] font-mono truncate mb-3">{item.content}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-base)] p-3 rounded-2xl border border-[#C9A24B]/10">
                    <div>Content Hash: {item.contentHash}</div>
                    <div>Chain Hash: {item.chainHash}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
