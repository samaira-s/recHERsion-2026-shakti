import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { OnboardingModal } from '../components/OnboardingModal';
import { getEncryptedCases, saveEncryptedCase } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData, encryptData } from '../lib/crypto';
import { createDemoCaseData, DEMO_CASE_ID } from '../lib/demoData';
import { CaseRecord, SeverityLevel } from '../types';
import { Shield, Plus, Sparkles, FolderLock, ArrowRight, Heart, FileText } from 'lucide-react';

export const Home: React.FC = () => {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const session = getVaultSession();
    if (!session.key) {
      navigate('/');
      return;
    }

    loadCases();

    const onboardingDone = localStorage.getItem('shakti_onboarding_done');
    if (!onboardingDone) {
      setShowOnboarding(true);
    }
  }, []);

  const loadCases = async () => {
    try {
      const session = getVaultSession();
      if (!session.key) return;

      const encryptedList = await getEncryptedCases();
      const filtered = encryptedList.filter(c => !!c.isDuress === session.isDuress);

      const decryptedCases: CaseRecord[] = [];
      for (const enc of filtered) {
        try {
          const decrypted = await decryptData(session.key, enc.ciphertext, enc.iv);
          if (decrypted && decrypted.caseRecord) {
            decryptedCases.push(decrypted.caseRecord);
          }
        } catch (err) {
          console.error('Failed to decrypt case:', enc.id, err);
        }
      }

      setCases(decryptedCases.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (err) {
      console.error('Error loading cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseTitle.trim()) return;

    try {
      const session = getVaultSession();
      if (!session.key) return;

      const newId = `case_${Date.now()}`;
      const caseRecord: CaseRecord = {
        id: newId,
        title: newCaseTitle.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        severity: 'keep_an_eye',
        summary: 'New private case sanctuary initialized.',
      };

      const enc = await encryptData(session.key, { caseRecord, items: [] });
      await saveEncryptedCase(newId, enc.ciphertext, enc.iv, session.isDuress);

      setNewCaseTitle('');
      setShowNewModal(false);
      navigate(`/case/${newId}`);
    } catch (err) {
      console.error('Error creating case:', err);
    }
  };

  const handleLoadDemo = async () => {
    try {
      const session = getVaultSession();
      if (!session.key) return;

      const { caseRecord, items } = await createDemoCaseData();
      const enc = await encryptData(session.key, { caseRecord, items });
      await saveEncryptedCase(caseRecord.id, enc.ciphertext, enc.iv, session.isDuress);

      loadCases();
      navigate(`/case/${DEMO_CASE_ID}`);
    } catch (err) {
      console.error('Error loading demo case:', err);
    }
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'keep_an_eye':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7FC4A3]/15 px-3 py-1 text-xs font-semibold text-[#7FC4A3] border border-[#7FC4A3]/30">Keep an eye</span>;
      case 'take_care':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0B27A]/15 px-3 py-1 text-xs font-semibold text-[#F0B27A] border border-[#F0B27A]/30">Take care</span>;
      case 'act_soon':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0B27A]/25 px-3 py-1 text-xs font-semibold text-[#F0B27A] border border-[#F0B27A]/50">Act soon, we'll help</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)] pb-16">
      <Header />

      {showOnboarding && (
        <OnboardingModal
          onComplete={() => {
            localStorage.setItem('shakti_onboarding_done', 'true');
            setShowOnboarding(false);
          }}
        />
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Pinterest-esque Hero Section without unnecessary images */}
        <div className="relative overflow-hidden rounded-3xl bg-[var(--bg-raised)] shadow-xl border border-[var(--border-color)] p-8 sm:p-12">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAE6F8] px-3.5 py-1 text-xs font-semibold text-[#9B8EDB] border border-[#9B8EDB]/30">
              <Heart className="w-3.5 h-3.5" />
              <span>You're safe here. Take your time.</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[var(--text-ivory)] tracking-tight leading-tight">
              Your Private Digital Sanctuary
            </h1>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              Everything stays 100% on your device, encrypted with your private PIN. Quiet clarity, tamper-evident evidence chains, and calm preparation for what comes next.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setShowNewModal(true)}
                className="flex items-center gap-2 rounded-2xl bg-[#9B8EDB] px-6 py-3.5 text-sm font-medium text-white shadow-md hover:bg-[#867bc7] transition"
              >
                <Plus className="w-4 h-4" />
                <span>Start a new case</span>
              </button>
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 rounded-2xl bg-[var(--bg-cards)] px-6 py-3.5 text-sm font-medium text-[var(--text-ivory)] border border-[var(--border-color)] hover:bg-[#EAE6F8]/30 transition"
              >
                <Sparkles className="w-4 h-4 text-[#9B8EDB]" />
                <span>Load demo case</span>
              </button>
            </div>
          </div>
        </div>

        {/* Support Resources Notice */}
        <div className="rounded-2xl bg-[#88C4A5]/15 p-4 border border-[#88C4A5]/30 flex items-center gap-3 text-xs text-[var(--text-ivory)]">
          <Shield className="w-5 h-5 text-[#88C4A5] shrink-0" />
          <div>
            <strong className="font-semibold text-[#88C4A5]">Support Resources:</strong> National Cyber Crime Helpline: <a href="tel:1930" className="underline font-bold">1930</a> | Portal: <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="underline font-bold">cybercrime.gov.in</a> | Emergency: <a href="tel:112" className="underline font-bold">112</a>
          </div>
        </div>

        {/* Case List Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-serif font-bold text-[var(--text-ivory)]">Your Cases</h2>
            <span className="text-xs font-semibold text-[var(--text-muted)] bg-[var(--bg-raised)] px-3 py-1 rounded-full border border-[var(--border-color)]">{cases.length} saved securely</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[var(--text-muted)]">Loading sanctuary...</div>
          ) : cases.length === 0 ? (
            <div className="rounded-3xl bg-[var(--bg-raised)] p-12 text-center border border-[var(--border-color)] space-y-4 shadow-sm">
              <FolderLock className="w-12 h-12 text-[#9B8EDB] mx-auto opacity-75" />
              <h3 className="text-lg font-serif font-bold text-[var(--text-ivory)]">No cases yet</h3>
              <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
                Start a new case or load the demo case to see how Shakti helps you organize evidence and prepare reports safely.
              </p>
              <button
                onClick={handleLoadDemo}
                className="inline-flex items-center gap-2 rounded-xl bg-[#9B8EDB] px-5 py-3 text-xs font-medium text-white shadow-md hover:bg-[#867bc7] transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>Load demo case</span>
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cases.map(c => (
                <div
                  key={c.id}
                  onClick={() => navigate(`/case/${c.id}`)}
                  className="group cursor-pointer rounded-3xl bg-[var(--bg-raised)] p-6 shadow-md border border-[var(--border-color)] hover:border-[#9B8EDB] hover:shadow-xl transition-all duration-300 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="rounded-xl bg-[#EAE6F8] p-2.5 text-[#9B8EDB] border border-[#9B8EDB]/30">
                        <FileText className="w-5 h-5" />
                      </div>
                      {getSeverityBadge(c.severity)}
                    </div>
                    <h3 className="text-lg font-serif font-bold text-[var(--text-ivory)] group-hover:text-[#9B8EDB] transition">
                      {c.title}
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                      {c.summary || 'Encrypted case folder containing chat evidence, integrity hashes, and report drafts.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                    <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1 font-semibold text-[#9B8EDB] group-hover:translate-x-1 transition">
                      Open case <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Case Modal */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-raised)] p-6 shadow-2xl border border-[var(--border-color)] text-[var(--text-ivory)] space-y-4">
              <h3 className="text-lg font-serif font-bold">Start a New Case</h3>
              <p className="text-xs text-[var(--text-muted)]">Give your case folder a private title (e.g. "Instagram Concern").</p>

              <form onSubmit={handleStartNewCase} className="space-y-4">
                <input
                  type="text"
                  value={newCaseTitle}
                  onChange={e => setNewCaseTitle(e.target.value)}
                  placeholder="Case title..."
                  className="w-full rounded-xl bg-[var(--bg-cards)] border border-[var(--border-color)] p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#9B8EDB]"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 rounded-xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#EAE6F8]/30 transition border border-[var(--border-color)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#9B8EDB] py-3 text-sm font-medium text-white shadow-md hover:bg-[#867bc7] transition"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
