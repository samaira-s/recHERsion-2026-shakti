import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases, saveEncryptedCase } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData, encryptData } from '../lib/crypto';
import { computeItemHashes } from '../lib/hashChain';
import { CaseRecord, EvidenceItem, EvidencePlatform } from '../types';
import {
  Shield, Plus, Upload, FileText, Link as LinkIcon, Mic, MicOff,
  CheckCircle, ArrowRight, Lock, Sparkles, AlertTriangle, Trash2
} from 'lucide-react';

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [activeTab, setActiveTab] = useState<'screenshot' | 'text' | 'link'>('text');

  // Form state
  const [platform, setPlatform] = useState<EvidencePlatform>('WhatsApp');
  const [textContent, setTextContent] = useState('');
  const [note, setNote] = useState('');
  const [screenshotData, setScreenshotData] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
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

  const loadCaseData = async () => {
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
    } catch (err) {
      console.error('Error loading case detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveUpdatedCase = async (updatedItems: EvidenceItem[]) => {
    const session = getVaultSession();
    if (!session.key || !caseRecord || !id) return;

    const updatedCase: CaseRecord = {
      ...caseRecord,
      updatedAt: new Date().toISOString(),
    };

    const enc = await encryptData(session.key, { caseRecord: updatedCase, items: updatedItems });
    await saveEncryptedCase(id, enc.ciphertext, enc.iv, session.isDuress);
    setCaseRecord(updatedCase);
    setItems(updatedItems);
  };

  const handleAddEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    let content = '';
    if (activeTab === 'text') content = textContent.trim();
    else if (activeTab === 'screenshot') content = screenshotData;
    else if (activeTab === 'link') content = linkUrl.trim();

    if (!content) return;

    const timestamp = new Date().toISOString();
    const prevHash = items.length > 0 ? items[items.length - 1].chainHash : 'GENESIS';

    const { contentHash, chainHash } = await computeItemHashes(prevHash, content, timestamp);

    const newItem: EvidenceItem = {
      id: `item_${Date.now()}`,
      caseId: id!,
      type: activeTab,
      platform,
      content,
      timestamp,
      note: note.trim() || undefined,
      contentHash,
      prevChainHash: prevHash,
      chainHash,
    };

    const updated = [...items, newItem];
    await saveUpdatedCase(updated);

    setTextContent('');
    setNote('');
    setScreenshotData('');
    setLinkUrl('');
    setShowAddSheet(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotData(reader.result as string);
    };
    reader.readAsDataURL(file);
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
            onClick={() => setShowAddSheet(true)}
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
              {items.map((item, index) => (
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
                <button onClick={() => setShowAddSheet(false)} className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-ivory)]">Cancel</button>
              </div>

              {/* Tabs */}
              <div className="flex rounded-2xl bg-[var(--bg-cards)] p-1 mb-6 border border-[#C9A24B]/20">
                <button
                  type="button"
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${activeTab === 'text' ? 'bg-[#C9A24B] text-[#17101F] shadow-xs font-semibold' : 'text-[var(--text-muted)]'}`}
                >
                  Paste Chat Text
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('screenshot')}
                  className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${activeTab === 'screenshot' ? 'bg-[#C9A24B] text-[#17101F] shadow-xs font-semibold' : 'text-[var(--text-muted)]'}`}
                >
                  Upload Screenshot
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('link')}
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
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Telegram">Telegram</option>
                    <option value="Snapchat">Snapchat</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {activeTab === 'text' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-[var(--text-muted)]">Chat Text Content</label>
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
                      required
                    />
                  </div>
                )}

                {activeTab === 'screenshot' && (
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Upload Screenshot</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#C9A24B]/20 file:text-[#C9A24B]"
                      required
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
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">URL / Link</label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={e => setLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                      required
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
