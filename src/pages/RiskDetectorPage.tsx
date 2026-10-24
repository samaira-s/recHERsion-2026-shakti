import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getEncryptedCases } from '../lib/storage';
import { getVaultSession } from '../lib/vaultSession';
import { decryptData } from '../lib/crypto';
import { CaseRecord, EvidenceItem, RiskAnalysisResult, SeverityLevel } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Shield, Sparkles, ArrowLeft, CheckCircle2, XCircle, BookOpen } from 'lucide-react';

export const RiskDetectorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [items, setItems] = useState<EvidenceItem[]>([]);
  const [analysis, setAnalysis] = useState<RiskAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [language, setLanguage] = useState<'en' | 'hi' | 'kn' | 'mr'>('en');

  useEffect(() => {
    const session = getVaultSession();
    if (!session.key) {
      navigate('/');
      return;
    }
    loadData();
  }, [id, aiEnabled, language]);

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

      const allText = evItems.map(i => `${i.platform}: ${i.content}`).join('\n');

      if (!aiEnabled || !allText.trim()) {
        setAnalysis(getFallbackAnalysis(evItems));
      } else {
        try {
          const res = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textContent: allText, language }),
          });
          const data = await res.json();
          if (data.error) throw new Error(data.error);
          setAnalysis(data);
        } catch (err) {
          console.error('AI analysis failed, falling back to rule-based:', err);
          setAnalysis(getFallbackAnalysis(evItems));
        }
      }
    } catch (err) {
      console.error('Error loading risk analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFallbackAnalysis = (evItems: EvidenceItem[]): RiskAnalysisResult => {
    const messages = evItems.map((item, index) => {
      const lower = item.content.toLowerCase();
      let stage: 'rapport' | 'platform_shift' | 'image_request' | 'pressure' | 'payment_demand' | 'benign' = 'benign';
      let risk = 15;

      if (lower.includes('whatsapp') || lower.includes('telegram') || lower.includes('snapchat')) {
        stage = 'platform_shift';
        risk = 35;
      }
      if (lower.includes('photo') || lower.includes('pic') || lower.includes('image') || lower.includes('casual')) {
        stage = 'image_request';
        risk = 60;
      }
      if (lower.includes('share') || lower.includes('family') || lower.includes('friends') || lower.includes('contacts')) {
        stage = 'pressure';
        risk = 85;
      }
      if (lower.includes('pay') || lower.includes('upi') || lower.includes('₹') || lower.includes('rs') || lower.includes('rupees') || lower.includes('amount')) {
        stage = 'payment_demand';
        risk = 95;
      }

      return {
        index: index + 1,
        stage,
        risk,
        explanation: `Detected heuristic stage: ${stage}`,
      };
    });

    const maxRisk = Math.max(0, ...messages.map(m => m.risk));
    let overall_severity: SeverityLevel = 'keep_an_eye';
    if (maxRisk >= 80) overall_severity = 'act_soon';
    else if (maxRisk >= 50) overall_severity = 'take_care';

    return {
      messages,
      overall_severity,
      summary: 'Analysis based on local heuristic rules (No-AI mode active or API offline). Shows progressive pressure patterns.',
      do_now: [
        'Save all chat screenshots and evidence securely in your Saakshi sanctuary.',
        'Do not pay any money under any circumstances; payment does not stop extortion.',
        'Block the account/number on the platform without deleting chats.',
      ],
      dont_do: [
        'Do not delete or clear the chat history; keep them as proof.',
        'Do not panic or engage in negotiation with the abuser.',
        'Do not forward morphed images or respond to threats.',
      ],
      confidence_note: 'Rule-based local fallback analysis.',
    };
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

        {/* Notice */}
        <div className="rounded-2xl bg-[var(--bg-raised)] p-4 border border-[#C9A24B]/20 text-xs text-[var(--text-muted)]">
          Using AI sends the text you choose to a secure third-party service (Gemini). You can switch this off anytime with the No-AI mode toggle.
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
        </div>

        {/* Risk Over Time Chart */}
        {chartData.length > 0 && (
          <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-4">
            <h3 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Risk Progression Over Time</h3>
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

        {/* Response Playbook for Morphed Images / Deepfakes */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[#C9A24B]/25 space-y-3">
          <div className="flex items-center gap-2 text-[#C9A24B]">
            <BookOpen className="w-5 h-5" />
            <h3 className="font-serif font-bold text-base text-[var(--text-ivory)]">Response Playbook for Morphed Images / Media</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            If you are facing morphed images or impersonation: preserve evidence in your Saakshi sanctuary, do not forward or share the morphed content, report directly to the platform using official takedown forms, and report to the National Cyber Crime Portal (cybercrime.gov.in or helpline 1930).
          </p>
        </div>
      </main>
    </div>
  );
};
