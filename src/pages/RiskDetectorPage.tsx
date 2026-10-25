import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases, saveEncryptedCase } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData, encryptData } from '../lib/crypto';
import { CaseRecord, EvidenceItem, RiskAnalysisResult, SeverityLevel, CaseType } from '../types';
import { computeEvidenceHash, getFallbackAnalysis } from '../lib/analysisHelper';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Sparkles, ArrowLeft, CheckCircle2, XCircle, BookOpen, FileText } from 'lucide-react';

export const RiskDetectorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [analysis, setAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn' | 'mr'>('en');
  const [selectedType, setSelectedType] = useState<CaseType>('not_sure');

  useEffect(() => {
    const session = getVaultSession();
    if (!session.key) {
      navigate('/');
      return;
    }
    loadData();
  }, [id, aiEnabled, language, selectedType]);

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
      const cRec = decrypted.caseRecord as CaseRecord;
      const evItems: EvidenceItem[] = decrypted.items || [];
      
      setCaseRecord(cRec);
      setItems(evItems);
      const currentCaseType = selectedType !== 'not_sure' ? selectedType : (cRec.caseType || 'not_sure');
      setSelectedType(currentCaseType);

      const currentEvHash = computeEvidenceHash(evItems);

      // Check cache in cRec.riskAnalysis
      if (cRec.riskAnalysis && cRec.riskAnalysis.evidenceHash === currentEvHash && cRec.caseType === currentCaseType) {
        setAnalysis(cRec.riskAnalysis);
        setLoading(false);
        return;
      }

      const allText = evItems.map(i => `${i.platform}: ${i.content}`).join('\n');

      let computedAnalysis: RiskAnalysisResult;

      if (!aiEnabled || !allText.trim()) {
        computedAnalysis = getFallbackAnalysis(evItems, currentCaseType);
      } else {
        try {
          const res = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textContent: allText, chosenType: currentCaseType, language }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          computedAnalysis = {
            ...data,
            evidenceHash: currentEvHash,
          };
        } catch (err) {
          console.error('AI analysis failed, falling back to rule-based:', err);
          computedAnalysis = getFallbackAnalysis(evItems, currentCaseType);
        }
      }

      setAnalysis(computedAnalysis);

      // Save analysis and caseType back to encrypted storage
      const updatedCase: CaseRecord = {
        ...cRec,
        caseType: computedAnalysis.suggested_type || currentCaseType,
        riskAnalysis: computedAnalysis,
        updatedAt: new Date().toISOString(),
      };

      const encrypted = await encryptData(session.key, { caseRecord: updatedCase, items: evItems });
      await saveEncryptedCase(id, encrypted.ciphertext, encrypted.iv, session.isDuress);
      setCaseRecord(updatedCase);

    } catch (err) {
      console.error('Error loading risk analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = async (newType: CaseType) => {
    setSelectedType(newType);
    setLoading(true);
  };

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case 'keep_an_eye':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#7FC4A3]/15 px-4 py-1.5 text-xs font-semibold text-[#7FC4A3] border border-[#7FC4A3]/30">Keep an eye</span>;
      case 'take_care':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0B27A]/15 px-4 py-1.5 text-xs font-semibold text-[#F0B27A] border border-[#F0B27A]/30">Take care</span>;
      case 'act_soon':
        return <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F0B27A]/25 px-4 py-1.5 text-xs font-semibold text-[#F0B27A] border border-[#F0B27A]/50">Act soon, we'll help</span>;
    }
  };

  const chartData = analysis?.messages.map(m => ({
    name: `Msg #${m.index}`,
    risk: m.risk,
    stage: m.stage,
  })) || [];

  if (loading || !caseRecord) {
    return <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center text-[var(--text-ivory)]">Analyzing situation...</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)] pb-16">
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

          {/* AI Toggle & Language */}
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              className="rounded-xl border border-[#C9A24B]/30 bg-[var(--bg-cards)] px-3 py-1.5 text-xs font-medium text-[var(--text-ivory)] focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="kn">ಕನ್ನಡ (Kannada)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>

            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${aiEnabled ? 'bg-[#C9A24B] text-[#17101F] font-semibold' : 'bg-[var(--bg-cards)] border border-[#C9A24B]/30 text-[var(--text-ivory)]'}`}
            >
              {aiEnabled ? 'AI Enabled' : 'No-AI Mode'}
            </button>
          </div>
        </div>

        {/* Case Type Selector */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-3">
          <label className="block text-sm font-serif font-bold text-[var(--text-ivory)]">What kind of situation is this?</label>
          <p className="text-xs text-[var(--text-muted)]">Select the situation type or let Shakti suggest it based on your evidence.</p>
          <select
            value={selectedType}
            onChange={e => handleTypeChange(e.target.value as CaseType)}
            className="w-full rounded-xl bg-[var(--bg-cards)] border border-[#C9A24B]/30 p-3 text-sm text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
          >
            <option value="not_sure">Not sure, let Shakti suggest</option>
            <option value="sextortion">Sextortion / Photo Blackmail</option>
            <option value="financial_fraud">Financial Fraud (UPI / KYC / Refund / Job / Loan)</option>
            <option value="impersonation_or_fake_profile">Impersonation or Fake Profile</option>
            <option value="stalking_or_harassment">Stalking or Harassment</option>
            <option value="morphed_or_deepfake_image">Morphed or Deepfake Image</option>
            <option value="other">Other Incident</option>
          </select>

          {analysis && (
            <div className="flex items-center justify-between text-xs text-[#C9A24B] pt-2 border-t border-[#C9A24B]/15">
              <span>Suggested Type: <strong className="uppercase">{analysis.suggested_type.replace(/_/g, ' ')}</strong> ({analysis.type_confidence}% confidence)</span>
              <span>NCRP Category: {analysis.ncrp_category}</span>
            </div>
          )}
        </div>

        {/* Severity & Summary Card */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A24B]">Situation Assessment</span>
              <h1 className="text-2xl font-serif font-bold text-[var(--text-ivory)] mt-1">Escalation & Risk Timeline</h1>
            </div>
            {analysis && getSeverityBadge(analysis.overall_severity)}
          </div>

          <p className="text-sm text-[var(--text-muted)] leading-relaxed">
            {analysis?.summary || 'Analyzing conversation progression...'}
          </p>

          {analysis?.confidence_note && (
            <div className="text-xs text-[#C9A24B] bg-[#C9A24B]/10 p-3 rounded-2xl border border-[#C9A24B]/20">
              {analysis.confidence_note}
            </div>
          )}
        </div>

        {/* Risk Over Time Chart */}
        {chartData.length > 0 && (
          <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-4">
            <h3 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Risk Progression Over Time ({selectedType !== 'not_sure' ? selectedType : (analysis?.suggested_type || 'General')} Stages)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A24B" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F0B27A" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#B9AEC9" opacity={0.8} fontSize={12} />
                  <YAxis stroke="#B9AEC9" opacity={0.8} fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ backgroundColor: '#211830', borderColor: '#C9A24B', borderRadius: '12px', color: '#F6EFE4' }} />
                  <Area type="monotone" dataKey="risk" stroke="#C9A24B" strokeWidth={3} fillOpacity={1} fill="url(#riskGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Do Now & Don't Do Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-[#7FC4A3]/10 p-6 border border-[#7FC4A3]/30 space-y-4">
            <div className="flex items-center gap-2 text-[#7FC4A3]">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-serif font-bold text-base text-[var(--text-ivory)]">Do Now</h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              {analysis?.do_now.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-[#7FC4A3]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl bg-[#F0B27A]/10 p-6 border border-[#F0B27A]/30 space-y-4">
            <div className="flex items-center gap-2 text-[#F0B27A]">
              <XCircle className="w-5 h-5" />
              <h3 className="font-serif font-bold text-base text-[var(--text-ivory)]">Please Avoid</h3>
            </div>
            <ul className="space-y-2 text-xs text-[var(--text-muted)]">
              {analysis?.dont_do.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-[#F0B27A]">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Complaint Draft Preview */}
        {analysis?.complaint_draft && (
          <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#C9A24B]">
                <FileText className="w-5 h-5" />
                <h3 className="font-serif font-bold text-base text-[var(--text-ivory)]">Generated Complaint Draft Preview</h3>
              </div>
              <button
                onClick={() => navigate(`/case/${id}/report`)}
                className="text-xs font-semibold text-[#C9A24B] hover:underline"
              >
                View full report & PDF →
              </button>
            </div>
            <pre className="rounded-2xl bg-[var(--bg-base)] p-4 text-xs font-mono text-[var(--text-ivory)] whitespace-pre-wrap border border-[#C9A24B]/15 max-h-48 overflow-y-auto">
              {analysis.complaint_draft}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
};
