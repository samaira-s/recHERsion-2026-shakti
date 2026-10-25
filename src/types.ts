export type SeverityLevel = 'keep_an_eye' | 'take_care' | 'act_soon';

export type EvidencePlatform = 'Instagram' | 'WhatsApp' | 'Telegram' | 'Snapchat' | 'Facebook' | 'Other';

export interface EvidenceItem {
  id: string;
  caseId: string;
  type: 'screenshot' | 'text' | 'link';
  platform: EvidencePlatform;
  content: string; // text content or base64 image data or URL
  fileName?: string;
  timestamp: string; // ISO string when added
  note?: string;
  contentHash: string; // sha256 of content
  prevChainHash: string; // 'GENESIS' or prev item's chainHash
  chainHash: string; // sha256(prevChainHash + contentHash + timestamp)
  tampered?: boolean;
}

export interface SuspectDetail {
  id: string;
  caseId: string;
  type: 'phone' | 'upi' | 'handle' | 'url' | 'amount';
  value: string;
  sourceMessageId?: string;
  sourceText: string;
  ignored: boolean;
}

export type CaseType = 
  | 'not_sure'
  | 'sextortion'
  | 'financial_fraud'
  | 'impersonation_or_fake_profile'
  | 'stalking_or_harassment'
  | 'morphed_or_deepfake_image'
  | 'other';

export interface RiskMessageAnalysis {
  index: number;
  stage: string;
  risk: number; // 0-100
  explanation: string;
}

export interface RiskAnalysisResult {
  suggested_type: CaseType;
  type_confidence: number; // 0-100
  stages: string[];
  messages: RiskMessageAnalysis[];
  overall_severity: SeverityLevel;
  summary: string;
  do_now: string[];
  dont_do: string[];
  complaint_draft: string;
  ncrp_category: string;
  confidence_note: string;
  evidenceHash: string;
}

export interface CaseRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
  severity: SeverityLevel;
  summary?: string;
  caseType?: CaseType;
  riskAnalysis?: RiskAnalysisResult;
}

export interface UserSettings {
  language: 'en' | 'hi' | 'kn' | 'mr';
  aiEnabled: boolean;
  hasDuressPin: boolean;
  duressPinHash?: string;
  pinIterations: number;
}


