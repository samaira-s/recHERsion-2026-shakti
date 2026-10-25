import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases, saveEncryptedCase } from '../lib/storage';
import { getVaultSession, setHelperSession } from '../lib/vaultSession';
import { decryptData, encryptData } from '../lib/crypto';
import { CaseRecord } from '../types';
import { Shield, CheckCircle2, ArrowLeft, Heart, Sparkles, Clock, Users } from 'lucide-react';

export const HelperModePage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'consent' | 'configure'>( 'consent' );
  const [consented, setConsented] = useState(false);
  const [helperLabel, setHelperLabel] = useState('');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const session = getVaultSession();
    if (!session.key) {
      navigate('/');
      return;
    }
    loadExistingCases(session.key);
  }, []);

  const loadExistingCases = async (key: CryptoKey) => {
    try {
      const encryptedList = await getEncryptedCases();
      const decryptedCases: CaseRecord[] = [];
      for (const enc of encryptedList) {
        try {
          const decrypted = await decryptData(key, enc.ciphertext, enc.iv);
          if (decrypted && decrypted.caseRecord) {
            decryptedCases.push(decrypted.caseRecord);
          }
        } catch (err) {
          console.error('Failed decrypting case:', err);
        }
      }
      setCases(decryptedCases);
      if (decryptedCases.length > 0) {
        setSelectedCaseId(decryptedCases[0].id);
      }
    } catch (err) {
      console.error('Error loading cases for helper mode:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartHelperSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const session = getVaultSession();
      if (!session.key) {
        navigate('/');
        return;
      }

      if (!helperLabel.trim()) {
        setErrorMsg('Please enter a helper name or role.');
        return;
      }

      let targetCaseId = selectedCaseId;

      // If creating a new case for the helper session
      if (selectedCaseId === 'new') {
        if (!newCaseTitle.trim()) {
          setErrorMsg('Please provide a title for the new case.');
          return;
        }
        const newId = `case_${Date.now()}`;
        const newRecord: CaseRecord = {
          id: newId,
          title: newCaseTitle.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          severity: 'take_care',
          summary: `Case initiated with support from ${helperLabel.trim()}.`,
        };
        const enc = await encryptData(session.key, { caseRecord: newRecord, items: [] });
        await saveEncryptedCase(newId, enc.ciphertext, enc.iv, session.isDuress);
        targetCaseId = newId;
      }

      if (!targetCaseId) {
        setErrorMsg('Please select or create a case to share with the helper.');
        return;
      }

      // Start 30 minute helper session
      const startedAt = Date.now();
      const expiresAt = startedAt + 30 * 60 * 1000; // 30 minutes

      setHelperSession({
        caseId: targetCaseId,
        startedAt,
        expiresAt,
        helperLabel: helperLabel.trim(),
      });

      navigate(`/case/${targetCaseId}`);
    } catch (err: any) {
      console.error('Error starting helper session:', err);
      setErrorMsg(err?.message || 'Failed to start helper session.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)]">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-xs font-semibold text-[#C9A24B] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to sanctuary</span>
          </button>
        </div>

        {/* Header Title */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A24B]">Supportive Partnership</span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-ivory)]">Help Someone Else (Helper Mode)</h1>
          <p className="text-xs text-[var(--text-muted)]">
            Designed for trusted counselors, family, or support advocates to assist a survivor with informed consent and strict session isolation.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-[#F0B27A]/20 p-4 border border-[#F0B27A]/50 text-xs text-[var(--text-ivory)]">
            {errorMsg}
          </div>
        )}

        {step === 'consent' ? (
          /* Step 1: Calm Explainer & Survivor Consent Screen */
          <div className="rounded-3xl bg-[var(--bg-raised)] p-8 shadow-sm border border-[#C9A24B]/25 space-y-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#C9A24B]/15 p-3 text-[#C9A24B]">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Informed Survivor Consent</h2>
                <p className="text-xs text-[var(--text-muted)]">Please review before handing the device to the helper.</p>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--bg-base)] p-5 border border-[#C9A24B]/20 text-sm text-[var(--text-ivory)] leading-relaxed space-y-3 font-medium">
              <p>
                "You are about to share ONE case with a helper. They will be able to view and add to it for this session only. They cannot see your other cases. You can end this at any time."
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 cursor-pointer rounded-2xl bg-[var(--bg-cards)] p-4 border border-[#C9A24B]/20">
                <input
                  type="checkbox"
                  checked={consented}
                  onChange={e => setConsented(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#C9A24B] text-[#C9A24B] focus:ring-[#C9A24B] bg-[var(--bg-base)]"
                />
                <span className="text-xs font-medium text-[var(--text-ivory)] leading-relaxed">
                  I give my explicit consent as the survivor to share this single case for the duration of this helper session.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="flex-1 rounded-2xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20"
                >
                  Not now
                </button>
                <button
                  type="button"
                  disabled={!consented}
                  onClick={() => setStep('configure')}
                  className="flex-1 rounded-2xl bg-[#C9A24B] py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition disabled:opacity-50"
                >
                  I agree
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Step 2: Helper Label & Case Selection */
          <form onSubmit={handleStartHelperSession} className="rounded-3xl bg-[var(--bg-raised)] p-8 shadow-sm border border-[#C9A24B]/25 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Configure Helper Session</h2>
              <p className="text-xs text-[var(--text-muted)]">
                Enter your role or first name and select the case to open. No personal data is stored beyond this session label.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Helper Label (Name or Role) *</label>
              <input
                type="text"
                value={helperLabel}
                onChange={e => setHelperLabel(e.target.value)}
                placeholder="e.g. Counsellor, college cell / Sunita (ASHA)"
                className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Select Case to Share *</label>
              <select
                value={selectedCaseId}
                onChange={e => setSelectedCaseId(e.target.value)}
                className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
              >
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
                <option value="new">+ Create a new case for this session</option>
              </select>
            </div>

            {selectedCaseId === 'new' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">New Case Title *</label>
                <input
                  type="text"
                  value={newCaseTitle}
                  onChange={e => setNewCaseTitle(e.target.value)}
                  placeholder="e.g. Online Harassment Record"
                  className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                />
              </div>
            )}

            <div className="rounded-2xl bg-[#7FC4A3]/15 p-4 border border-[#7FC4A3]/30 flex items-center gap-3 text-xs text-[var(--text-ivory)]">
              <Clock className="w-5 h-5 text-[#7FC4A3] shrink-0" />
              <span>Session lasts 30 minutes. You can end it at any time.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep('consent')}
                className="flex-1 rounded-2xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 rounded-2xl bg-[#C9A24B] py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition"
              >
                Start Helper Session
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
