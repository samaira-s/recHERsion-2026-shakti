import { EvidenceItem, CaseType, RiskAnalysisResult, SeverityLevel } from '../types';

export function computeEvidenceHash(items: EvidenceItem[]): string {
  const combined = items.map(i => `${i.id}:${i.contentHash}:${i.timestamp}`).join('|');
  // Simple deterministic hash or use crypto hash if sync/async
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

export function getFallbackAnalysis(items: EvidenceItem[], chosenType: CaseType = 'not_sure'): RiskAnalysisResult {
  const allText = items.map(i => i.content.toLowerCase()).join(' ');

  let detectedType: CaseType = chosenType !== 'not_sure' ? chosenType : 'not_sure';
  let confidence = 50;

  if (chosenType === 'not_sure') {
    if (allText.includes('refund') || allText.includes('upi') || allText.includes('kyc') || allText.includes('otp') || allText.includes('debited') || allText.includes('bank') || allText.includes('scam')) {
      detectedType = 'financial_fraud';
      confidence = 88;
    } else if (allText.includes('photo') || allText.includes('pic') || allText.includes('family') || allText.includes('instagram') || allText.includes('followers')) {
      detectedType = 'sextortion';
      confidence = 92;
    } else if (allText.includes('fake profile') || allText.includes('impersonat') || allText.includes('posing')) {
      detectedType = 'impersonation_or_fake_profile';
      confidence = 85;
    } else if (allText.includes('stalk') || allText.includes('harass') || allText.includes('following')) {
      detectedType = 'stalking_or_harassment';
      confidence = 80;
    } else if (allText.includes('morphed') || allText.includes('deepfake') || allText.includes('photoshop')) {
      detectedType = 'morphed_or_deepfake_image';
      confidence = 90;
    } else {
      detectedType = 'other';
      confidence = 45;
    }
  }

  const stagesForType: Record<CaseType, string[]> = {
    sextortion: ['rapport', 'platform_shift', 'image_request', 'pressure', 'payment_demand'],
    financial_fraud: ['contact', 'trust_building', 'urgency', 'payment_request', 'data_or_OTP_request', 'escalation'],
    impersonation_or_fake_profile: ['fake_profile', 'contact', 'request_for_money_or_data'],
    stalking_or_harassment: ['contact', 'persistence', 'intimidation', 'escalation'],
    morphed_or_deepfake_image: ['image_circulation', 'threat', 'demand'],
    other: ['initial_contact', 'escalation', 'dispute'],
    not_sure: ['initial_contact', 'escalation'],
  };

  const stages = stagesForType[detectedType] || stagesForType.other;

  const messages = items.map((item, index) => {
    const lower = item.content.toLowerCase();
    let stage = stages[0];
    let risk = 20;

    if (detectedType === 'financial_fraud') {
      if (lower.includes('link') || lower.includes('click')) { stage = stages[0]; risk = 30; }
      else if (lower.includes('verified') || lower.includes('official')) { stage = stages[1]; risk = 50; }
      else if (lower.includes('fast') || lower.includes('expires') || lower.includes('urgent')) { stage = stages[2]; risk = 70; }
      else if (lower.includes('pin') || lower.includes('otp')) { stage = stages[3] || stages[2]; risk = 90; }
      else if (lower.includes('debited') || lower.includes('fraud') || lower.includes('reverse')) { stage = stages[stages.length - 1]; risk = 95; }
    } else {
      if (lower.includes('whatsapp') || lower.includes('telegram')) { stage = stages[1] || stages[0]; risk = 35; }
      else if (lower.includes('photo') || lower.includes('pic')) { stage = stages[2] || stages[1]; risk = 65; }
      else if (lower.includes('pay') || lower.includes('₹') || lower.includes('amount')) { stage = stages[stages.length - 1]; risk = 95; }
    }

    return {
      index: index + 1,
      stage,
      risk,
      explanation: `Rule-based analysis stage: ${stage} (Risk score: ${risk})`,
    };
  });

  const maxRisk = Math.max(0, ...messages.map(m => m.risk));
  let overall_severity: SeverityLevel = 'keep_an_eye';
  if (maxRisk >= 80) overall_severity = 'act_soon';
  else if (maxRisk >= 50) overall_severity = 'take_care';

  let do_now: string[] = [];
  let dont_do: string[] = [];
  let ncrp_category = 'Cyber Crime Reporting';

  if (detectedType === 'financial_fraud') {
    ncrp_category = 'Financial Fraud / Cyber Financial Fraud';
    do_now = [
      'Do not share OTP, PIN, CVV, or banking passwords with anyone.',
      'Call your bank immediately to freeze your account, debit card, or credit card.',
      'Report urgently on National Cyber Crime Helpline 1930 or cybercrime.gov.in (early reporting increases chances of freezing funds).',
      'Keep transaction IDs, UPI reference numbers, and screenshots safe.'
    ];
    dont_do = [
      'Do not click unknown refund links or install screen-sharing apps (AnyDesk, TeamViewer).',
      'Do not panic or share personal identifiers with callers claiming to be bank officials.'
    ];
  } else {
    ncrp_category = 'Online Harassment / Women/Child-Related Cyber Crime';
    do_now = [
      'Save all chat screenshots and evidence securely in your Shakti sanctuary.',
      'Do not pay any money under any circumstances; payment does not stop extortion.',
      'Block the account/number on the platform without deleting chats.',
      'Report on cybercrime.gov.in and use platform reporting tools.'
    ];
    dont_do = [
      'Do not delete or clear the chat history; keep them as proof.',
      'Do not panic or engage in negotiation with the abuser.',
      'Do not forward morphed images or respond to threats.'
    ];
  }

  const complaint_draft = `Subject: Complaint regarding ${detectedType.replace(/_/g, ' ')}.

To,
The Cyber Crime Cell / Authorities,
National Cyber Crime Reporting Portal (cybercrime.gov.in)

Respected Sir/Madam,

I am writing to formally report an incident of online fraud / harassment.
- Incident Type: ${detectedType}
- Timeline Starting: ${new Date().toLocaleDateString()}
- Summary: The incident involves unauthorized pressure and fraudulent demands as documented in the evidence items.

I request urgent action against the perpetrators and blocking of associated accounts.

Sincerely,
[Complainant / Survivor]`;

  return {
    suggested_type: detectedType,
    type_confidence: confidence,
    stages,
    messages,
    overall_severity,
    summary: `Analysis for ${detectedType.replace(/_/g, ' ')} based on local rule-based fallback engine.`,
    do_now,
    dont_do,
    complaint_draft,
    ncrp_category,
    confidence_note: `Classified as ${detectedType} with ${confidence}% confidence (Rule-based fallback).`,
    evidenceHash: computeEvidenceHash(items),
  };
}
