import { getFallbackAnalysis, computeEvidenceHash } from './analysisHelper';
import { EvidenceItem } from '../types';

export async function runAnalysisTests(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Test financial fraud classification for UPI refund scam
    const financialItems: EvidenceItem[] = [
      {
        id: 'item_f1',
        caseId: 'test_case_fin',
        type: 'text',
        platform: 'WhatsApp',
        content: 'Your electricity bill refund of ₹4,850 is pending. Click link to claim via UPI: http://eb-refund.xyz',
        timestamp: new Date().toISOString(),
        contentHash: 'hash1',
        prevChainHash: 'GENESIS',
        chainHash: 'chain1'
      },
      {
        id: 'item_f2',
        caseId: 'test_case_fin',
        type: 'text',
        platform: 'WhatsApp',
        content: 'Enter UPI PIN to receive money. Account debited ₹25,000.',
        timestamp: new Date().toISOString(),
        contentHash: 'hash2',
        prevChainHash: 'chain1',
        chainHash: 'chain2'
      }
    ];

    const finAnalysis = getFallbackAnalysis(financialItems, 'not_sure');
    if (finAnalysis.suggested_type !== 'financial_fraud') {
      return { success: false, message: `Expected financial_fraud classification, got ${finAnalysis.suggested_type}` };
    }

    // 2. Test sextortion classification
    const sextortionItems: EvidenceItem[] = [
      {
        id: 'item_s1',
        caseId: 'test_case_sext',
        type: 'text',
        platform: 'Instagram',
        content: 'Send a casual photo or I will send this photo to your family and followers.',
        timestamp: new Date().toISOString(),
        contentHash: 'hashs1',
        prevChainHash: 'GENESIS',
        chainHash: 'chains1'
      }
    ];

    const sextAnalysis = getFallbackAnalysis(sextortionItems, 'not_sure');
    if (sextAnalysis.suggested_type !== 'sextortion') {
      return { success: false, message: `Expected sextortion classification, got ${sextAnalysis.suggested_type}` };
    }

    // 3. Test evidence hashing & caching consistency
    const hash1 = computeEvidenceHash(financialItems);
    const hash2 = computeEvidenceHash(financialItems);
    if (hash1 !== hash2) {
      return { success: false, message: 'Evidence hash calculation is not deterministic' };
    }

    return { success: true, message: 'Analysis tests passed: Non-sextortion classification (financial fraud), distinct case outputs, and evidence hashing verified successfully.' };
  } catch (err: any) {
    console.error('Analysis test error:', err);
    return { success: false, message: err?.message || 'Analysis test failed' };
  }
}
