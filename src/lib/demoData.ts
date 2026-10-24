import { CaseRecord, EvidenceItem } from '../types';
import { computeItemHashes } from './hashChain';

export const DEMO_CASE_ID = 'demo-sextortion-case-01';

export async function createDemoCaseData(): Promise<{ caseRecord: CaseRecord; items: EvidenceItem[] }> {
  const caseRecord: CaseRecord = {
    id: DEMO_CASE_ID,
    title: 'Demo Case: Online Chat & Extortion Concern',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    isDemo: true,
    severity: 'act_soon',
    summary: 'Synthetic demo case showing progressive pressure, platform shift, and monetary demand.',
  };

  const rawMessages = [
    { sender: 'Other', text: 'Hi! Saw your profile on Instagram. We share common design interests.', platform: 'Instagram' as const },
    { sender: 'User', text: 'Hello! Thank you, nice to connect.', platform: 'Instagram' as const },
    { sender: 'Other', text: 'Let us chat on WhatsApp for faster coordination. Here is my number: +91 9823456721', platform: 'WhatsApp' as const },
    { sender: 'User', text: 'Okay, I messaged you on WhatsApp.', platform: 'WhatsApp' as const },
    { sender: 'Other', text: 'Can you share a casual photo? Want to know you better before collaborating.', platform: 'WhatsApp' as const },
    { sender: 'User', text: 'Shared a photo.', platform: 'WhatsApp' as const },
    { sender: 'Other', text: 'Thanks! Now I have your photos and contacts list.', platform: 'WhatsApp' as const },
    { sender: 'Other', text: 'If you do not send ₹15,000 right now, I will send this photo to all your family and Instagram followers.', platform: 'WhatsApp' as const },
    { sender: 'Other', text: 'Send payment immediately to UPI ID: rahul.verma92@okaxis or else!', platform: 'WhatsApp' as const },
    { sender: 'User', text: 'Please do not do this. Why are you doing this?', platform: 'WhatsApp' as const },
    { sender: 'Other', text: 'You have 1 hour. Pay ₹15000 to rahul.verma92@okaxis or watch what happens.', platform: 'WhatsApp' as const },
    { sender: 'Other', text: 'Call me at +91 9823456721 immediately.', platform: 'WhatsApp' as const },
    { sender: 'User', text: 'Blocked the number and saved screenshots here.', platform: 'WhatsApp' as const },
    { sender: 'System', text: 'Evidence saved safely in Saakshi sanctuary. Remember: Do not pay, keep evidence, report on cybercrime.gov.in (Helpline 1930).', platform: 'Other' as const },
  ];

  const items: EvidenceItem[] = [];
  let prevHash = 'GENESIS';

  for (let i = 0; i < rawMessages.length; i++) {
    const msg = rawMessages[i];
    const timestamp = new Date(Date.now() - 86400000 * 2 + i * 3600000).toISOString();
    const content = `[${msg.sender}] ${msg.text}`;
    const { contentHash, chainHash } = await computeItemHashes(prevHash, content, timestamp);

    items.push({
      id: `demo_item_${i + 1}`,
      caseId: DEMO_CASE_ID,
      type: i === 5 ? 'screenshot' : 'text',
      platform: msg.platform,
      content,
      timestamp,
      note: `Demo chat message #${i + 1} on ${msg.platform}`,
      contentHash,
      prevChainHash: prevHash,
      chainHash,
    });

    prevHash = chainHash;
  }

  return { caseRecord, items };
}
