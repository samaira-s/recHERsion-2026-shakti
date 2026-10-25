import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases, saveEncryptedCase } from '../lib/storage';
import { getVaultSession, getHelperSession, clearVaultSession } from '../lib/vaultSession';
import { decryptData, encryptData, sha256Buffer } from '../lib/crypto';
import { computeItemHashes } from '../lib/hashChain';
import { CaseRecord, EvidenceItem, EvidencePlatform } from '../types';
import {
  Shield, Plus, Upload, FileText, Link as LinkIcon, Mic, MicOff,
  CheckCircle2, ArrowRight, Sparkles, AlertTriangle, RefreshCw
} from 'lucide-react';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'screenshot' | 'text' | 'link'>('text');

  // Form state & feedback
  const [platform, setPlatform] = useState<EvidencePlatform>('Other');
  const [textContent, setTextContent] = useState('');
  const [note, setNote] = useState('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');

  const helper = getHelperSession();

  useEffect(() => {
    const helperSession = getHelperSession();
    if (helperSession) {
      if (id !== helperSession.caseId) {
        navigate(`/case/${helperSession.caseId}`);
        return;
      }
    }

    const session = getVaultSession();
    if (!session.key) {
      navigate('/');
      return;
    }
    loadCaseData();

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, [id]);

  useEffect(() => {
    if (!helper) return;
    const interval = setInterval(() => {
      const remaining = helper.expiresAt - Date.now();
      if (remaining <= 0) {
        clearVaultSession();
        navigate('/');
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [helper]);

  const loadCaseData = async () => {
    try {
      const session = getVaultSession();
      if (!session.key) {
        navigate('/');
        return;
      }
      if (!id) return;

      const enc = await getEncryptedCases();
      const target = enc.find(c => c.id === id);
      if (!target) {
        navigate('/home');
        return;
      }

      const decrypted = await decryptData(session.key, target.ciphertext, target.iv);
      setCaseRecord(decrypted.caseRecord);
      setItems(decrypted.items || []);
    } catch (err) {
      console.error('Error loading case detail:', err);
      setErrorMsg('Failed to decrypt case data. Please unlock your vault again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      const session = getVaultSession();
      if (!session.key) {
        navigate('/');
        return;
      }

      let content = '';
      if (activeTab === 'text') {
        content = textContent.trim();
      } else if (activeTab === 'screenshot') {
        content = screenshotData;
      } else if (activeTab === 'link') {
        content = linkUrl.trim();
      }

      if (!content) {
        setErrorMsg('Please provide content for this evidence item before saving.');
        return;
      }

      const timestamp = new Date().toISOString();
      const prevHash = items.length > 0 ? items[items.length - 1].chainHash : 'GENESIS';

      let contentHash = '';
      if (activeTab === 'screenshot' && screenshotData.startsWith('data:')) {
        // If image, we can compute sha256 or use base64 bytes
        const base64Part = screenshotData.split(',')[1];
        if (base64Part) {
          const binaryStr = atob(base64Part);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          contentHash = await sha256Buffer(bytes);
        } else {
          const hashes = await computeItemHashes(prevHash, content, timestamp);
          contentHash = hashes.contentHash;
        }
      } else {
        const hashes = await computeItemHashes(prevHash, content, timestamp);
        contentHash = hashes.contentHash;
      }

      const chainInput = prevHash + contentHash + timestamp;
      const { sha256 } = await import('../lib/crypto');
      const chainHash = await sha256(chainInput);

      const newItem: EvidenceItem = {
        id: `item_${Date.now()}`,
        caseId: id!,
        type: activeTab,
        platform: platform || 'Other',
        content,
        timestamp,
        note: note.trim() || undefined,
        contentHash,
        prevChainHash: prevHash,
        chainHash,
      };

      const updatedItems = [...items, newItem];

      const updatedCase: CaseRecord = {
        ...caseRecord!,
        updatedAt: new Date().toISOString(),
      };

      const enc = await encryptData(session.key, { caseRecord: updatedCase, items: updatedItems });
      await saveEncryptedCase(id!, enc.ciphertext, enc.iv, session.isDuress);

      setCaseRecord(updatedCase);
      setItems(updatedItems);

      // Reset form
      setTextContent('');
      setNote('');
      setScreenshotData('');
      setLinkUrl('');
      setPlatform('Other');
      setShowAddSheet(false);
      setSuccessMsg('Saved and sealed securely.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Error saving evidence:', err);
      setErrorMsg(err?.message || 'Failed to save evidence. Please try again.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size must be under 5 MB. Please choose a smaller file.');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:${file.type || 'image/png'};base64,${base64}`;
      setScreenshotData(dataUrl);
    } catch (err) {
      console.error('Error reading image file:', err);
      setErrorMsg('Could not read image file. Please try another image.');
    }
  };

  const startVoiceInput = (lang: string = 'en-IN') => {
    if (!speechSupported) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTextContent(prev => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.start();
  };

  if (loading || !caseRecord) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-ivory)]">Loading sanctuary case...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)]">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {successMsg && (
          <div className="rounded-2xl bg-[#7FC4A3]/20 border border-[#7FC4A3]/40 p-4 flex items-center gap-3 text-sm text-[var(--text-ivory)]">
            <CheckCircle2 className="w-5 h-5 text-[#7FC4A3]" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-2xl bg-[#F0B27A]/20 border border-[#F0B27A]/50 p-4 flex items-center gap-3 text-sm text-[var(--text-ivory)]">
            <AlertTriangle className="w-5 h-5 text-[#F0B27A]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {helper && (
          <div className="rounded-3xl bg-[var(--bg-raised)] p-4 border border-[#C9A24B]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C9A24B]/20 px-3.5 py-1 text-xs font-semibold text-[#C9A24B]">
                Helper Session Active ({helper.helperLabel})
              </span>
              <span className="text-xs text-[var(--text-muted)] font-mono">
                Expires in {timeLeft || '30:00'}
              </span>
            </div>
            <button
              onClick={() => {
                clearVaultSession();
                navigate('/');
              }}
              className="rounded-xl bg-[#D9778F]/20 px-4 py-2 text-xs font-medium text-[#D9778F] hover:bg-[#D9778F]/30 transition border border-[#D9778F]/40"
            >
              End session
            </button>
          </div>
        )}

        {helper && (
          <div className="rounded-3xl bg-[var(--bg-raised)] p-6 border border-[#C9A24B]/30 space-y-3">
            <h3 className="text-sm font-serif font-bold text-[#C9A24B] uppercase tracking-wider">Helper Guidance</h3>
            <p className="text-xs text-[var(--text-ivory)] leading-relaxed font-medium">
              "Listen first. Don't pressure her. Never ask her to pay. Keep the original messages. You can prepare, she decides."
            </p>
            <div className="text-[11px] text-[var(--text-muted)] pt-2 border-t border-[#C9A24B]/15">
              Support & Referrals: Cyber Helpline <a href="tel:1930" className="underline font-bold">1930</a> · Portal <a href="https://cybercrime.gov.in" target="_blank" rel="noreferrer" className="underline font-bold">cybercrime.gov.in</a> · Emergency <a href="tel:112" className="underline font-bold">112</a>
            </div>
          </div>
        )}

        {/* Case Header */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A24B]">Sanctuary Case</span>
            <h1 className="text-2xl font-serif font-bold text-[var(--text-ivory)] mt-1">{caseRecord.title}</h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Created {new Date(caseRecord.createdAt).toLocaleDateString()} · {items.length} evidence items saved securely
            </p>
          </div>

          <button
            onClick={() => { setErrorMsg(null); setShowAddSheet(true); }}
            className="flex items-center gap-2 rounded-2xl bg-[#C9A24B] px-5 py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add evidence</span>
          </button>
        </div>

        {/* Action Hub / Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate(`/case/${id}/integrity`)}
            className="rounded-2xl bg-[var(--bg-raised)] p-4 shadow-xs border border-[#C9A24B]/20 hover:border-[#C9A24B] hover:shadow-md transition text-left space-y-2 group"
          >
            <Shield className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-semibold text-sm text-[var(--text-ivory)]">Integrity Chain</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Verify hashes & tampering</p>
          </button>

          <button
            onClick={() => navigate(`/case/${id}/risk`)}
            className="rounded-2xl bg-[var(--bg-raised)] p-4 shadow-xs border border-[#C9A24B]/20 hover:border-[#C9A24B] hover:shadow-md transition text-left space-y-2 group"
          >
            <Sparkles className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-semibold text-sm text-[var(--text-ivory)]">Risk & Stage</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Understand situation via AI</p>
          </button>

          <button
            onClick={() => navigate(`/case/${id}/suspects`)}
            className="rounded-2xl bg-[var(--bg-raised)] p-4 shadow-xs border border-[#C9A24B]/20 hover:border-[#C9A24B] hover:shadow-md transition text-left space-y-2 group"
          >
            <FileText className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-semibold text-sm text-[var(--text-ivory)]">Suspect Extractor</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Phones, UPIs, handles</p>
          </button>

          <button
            onClick={() => navigate(`/case/${id}/report`)}
            className="rounded-2xl bg-[var(--bg-raised)] p-4 shadow-xs border border-[#C9A24B]/20 hover:border-[#C9A24B] hover:shadow-md transition text-left space-y-2 group"
          >
            <ArrowRight className="w-5 h-5 text-[#C9A24B]" />
            <h3 className="font-semibold text-sm text-[var(--text-ivory)]">Prepare Report</h3>
            <p className="text-[11px] text-[var(--text-muted)]">NCRP guide & PDF download</p>
          </button>
        </div>

        {/* Evidence Timeline */}
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-[var(--text-ivory)]">Chronological Evidence Timeline</h2>

          {items.length === 0 ? (
            <div className="rounded-3xl bg-[var(--bg-raised)] p-12 text-center border border-[#C9A24B]/20 space-y-3">
              <FileText className="w-10 h-10 text-[#C9A24B] mx-auto opacity-75" />
              <h3 className="text-base font-serif font-bold text-[var(--text-ivory)]">No evidence added yet</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                Tap "Add evidence" above to securely record chat screenshots, pasted messages, or links.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-[#C9A24B]/30 ml-4 space-y-6 pl-6">
              {items.map((item) => (
                <div key={item.id} className="relative rounded-3xl bg-[var(--bg-raised)] p-5 shadow-xs border border-[#C9A24B]/20 space-y-3">
                  <div className="absolute -left-[31px] top-5 flex h-4 w-4 items-center justify-center rounded-full bg-[#C9A24B] ring-4 ring-[var(--bg-base)]" />

                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C9A24B]/15 px-3 py-1 text-xs font-semibold text-[#C9A24B] border border-[#C9A24B]/30">
                      {item.platform}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {item.note && <p className="text-xs font-semibold text-[var(--text-ivory)]">{item.note}</p>}

                  {item.type === 'screenshot' ? (
                    <div className="overflow-hidden rounded-2xl border border-[#C9A24B]/20 bg-[var(--bg-base)] p-2">
                      <img src={item.content} alt="Evidence screenshot" className="max-h-60 w-full object-contain rounded-xl" />
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-[var(--bg-base)] p-4 text-sm text-[var(--text-ivory)] font-mono whitespace-pre-wrap border border-[#C9A24B]/10">
                      {item.content}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#C9A24B]/10 text-[10px] font-mono text-[var(--text-muted)]">
                    <span>Hash: {item.contentHash.slice(0, 12)}...</span>
                    <span>Chain: {item.chainHash.slice(0, 12)}...</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Evidence Sheet Modal */}
        {showAddSheet && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-[var(--bg-raised)] p-6 shadow-2xl border border-[#C9A24B]/30 text-[var(--text-ivory)] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-serif font-bold">Add Evidence</h3>
                <button type="button" onClick={() => setShowAddSheet(false)} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-ivory)]">Cancel</button>
              </div>

              {errorMsg && (
                <div className="mb-4 rounded-xl bg-[#F0B27A]/20 p-3 border border-[#F0B27A]/40 text-xs text-[var(--text-ivory)]">
                  {errorMsg}
                </div>
              )}

              {/* Tabs */}
              <div className="flex rounded-2xl bg-[var(--bg-cards)] p-1 mb-6 border border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => { setActiveTab('text'); setErrorMsg(null); }}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${activeTab === 'text' ? 'bg-[#C9A24B] text-[#17101F] shadow-xs font-semibold' : 'text-[var(--text-muted)]'}`}
                >
                  Paste Chat Text
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('screenshot'); setErrorMsg(null); }}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${activeTab === 'screenshot' ? 'bg-[#C9A24B] text-[#17101F] shadow-xs font-semibold' : 'text-[var(--text-muted)]'}`}
                >
                  Upload Screenshot
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('link'); setErrorMsg(null); }}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${activeTab === 'link' ? 'bg-[#C9A24B] text-[#17101F] shadow-xs font-semibold' : 'text-[var(--text-muted)]'}`}
                >
                  Add Link
                </button>
              </div>

              <form onSubmit={handleAddEvidence} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Platform</label>
                  <select
                    value={platform}
                    onChange={e => setPlatform(e.target.value as EvidencePlatform)}
                    className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                  >
                    <option value="Other">Other</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Snapchat">Snapchat</option>
                    <option value="Facebook">Facebook</option>
                  </select>
                </div>

                {activeTab === 'text' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)]">Chat Text Content *</label>
                      {speechSupported && (
                        <button
                          type="button"
                          onClick={() => startVoiceInput('en-IN')}
                          className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${isListening ? 'bg-[#F0B27A] text-[#17101F] animate-pulse' : 'bg-[#C9A24B]/15 text-[#C9A24B] border border-[#C9A24B]/30'}`}
                        >
                          {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          <span>{isListening ? "Listening..." : "Voice Input"}</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={4}
                      value={textContent}
                      onChange={e => setTextContent(e.target.value)}
                      placeholder="Paste messages or notes here..."
                      className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                    />
                  </div>
                )}

                {activeTab === 'screenshot' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Upload Screenshot (Max 5 MB) *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#C9A24B]/20 file:text-[#C9A24B]"
                    />
                    {screenshotData && (
                      <div className="mt-2 h-32 overflow-hidden rounded-xl border border-[#C9A24B]/20 bg-[var(--bg-base)] p-2">
                        <img src={screenshotData} alt="Preview" className="h-full w-full object-contain" />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'link' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">URL / Link *</label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Optional Note / Context</label>
                  <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Message received after refusing demand..."
                    className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSheet(false)}
                    className="flex-1 rounded-xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#C9A24B] py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition"
                  >
                    Save Evidence
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
