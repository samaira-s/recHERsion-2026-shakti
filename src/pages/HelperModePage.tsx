import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { saveEncryptedCase } from '../lib/storage';
import { setVaultSession } from '../lib/vaultSession';
import { generateSalt, deriveKeyFromPin, encryptData } from '../lib/crypto';
import { CaseRecord } from '../types';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

export const HelperModePage: React.FC = () => {
  const navigate = useNavigate();
  const [consented, setConsented] = useState(false);
  const [helperName, setHelperName] = useState('');
  const [victimPin, setVictimPin] = useState('');
  const [caseTitle, setCaseTitle] = useState('');
  const [success, setSuccess] = useState(false);

  const handleCreateHelperCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consented || !victimPin || !caseTitle) return;

    try {
      const salt = await generateSalt();
      const key = await deriveKeyFromPin(victimPin, salt);

      const newId = `helper_case_${Date.now()}`;
      const caseRecord: CaseRecord = {
        id: newId,
        title: `${caseTitle} (Assisted by ${helperName || 'Counselor'})`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        severity: 'take_care',
        summary: 'Case initiated under Counselor / Helper Mode with survivor consent.',
      };

      const enc = await encryptData(key, { caseRecord, items: [] });
      await saveEncryptedCase(newId, enc.ciphertext, enc.iv);

      setVaultSession(key, false, true);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/case/${newId}`);
      }, 1500);
    } catch (err) {
      console.error('Helper case error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)]">
      <Header />

      <main className="max-w-xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-xs font-semibold text-[#C9A24B] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to sanctuary</span>
          </button>
        </div>

        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A24B]">Counselor & ASHA Support</span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-ivory)]">Helper Mode</h1>
          <p className="text-xs text-[var(--text-muted)]">Assist a survivor in setting up a secure case with informed consent and a dedicated victim-only PIN.</p>
        </div>

        {success ? (
          <div className="rounded-3xl bg-[#7FC4A3]/20 p-8 text-center border border-[#7FC4A3]/40 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#7FC4A3] mx-auto" />
            <h2 className="text-xl font-serif font-bold text-[var(--text-ivory)]">Case Created Successfully</h2>
            <p className="text-xs text-[var(--text-muted)]">Opening encrypted case with survivor's dedicated PIN session...</p>
          </div>
        ) : (
          <form onSubmit={handleCreateHelperCase} className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-6">
            <label className="flex items-start gap-3 cursor-pointer rounded-2xl bg-[var(--bg-cards)] p-4 border border-[#C9A24B]/20">
              <input
                type="checkbox"
                checked={consented}
                onChange={e => setConsented(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[#C9A24B] text-[#C9A24B] focus:ring-[#C9A24B] bg-[var(--bg-base)]"
                required
              />
              <span className="text-xs font-medium text-[var(--text-ivory)] leading-relaxed">
                "She explicitly agreed and gave informed consent to share this and create a secure case on her behalf."
              </span>
            </label>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Helper / Counselor Name (Optional)</label>
              <input
                type="text"
                value={helperName}
                onChange={e => setHelperName(e.target.value)}
                placeholder="e.g. ASHA Worker / Counselor Sunita"
                className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Case Title</label>
              <input
                type="text"
                value={caseTitle}
                onChange={e => setCaseTitle(e.target.value)}
                placeholder="e.g. Online Harassment Incident"
                className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Survivor's Dedicated PIN (4-6 digits)</label>
              <input
                type="password"
                maxLength={6}
                value={victimPin}
                onChange={e => setVictimPin(e.target.value)}
                placeholder="••••"
                className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-center text-lg tracking-widest text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                required
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                This ensures only the survivor holds the PIN to open and view the case in the future.
              </p>
            </div>

            <button
              type="submit"
              disabled={!consented}
              className="w-full rounded-2xl bg-[#C9A24B] py-3.5 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition disabled:opacity-50"
            >
              Create Assisted Case
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
