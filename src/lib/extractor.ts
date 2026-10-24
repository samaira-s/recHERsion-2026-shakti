import { createWorker } from 'tesseract.js';
import { SuspectDetail, EvidenceItem } from '../types';

export async function runOcrOnImage(imageBase64: string): Promise<string> {
  try {
    const worker = await createWorker(['eng', 'hin']);
    const ret = await worker.recognize(imageBase64);
    await worker.terminate();
    return ret.data.text || '';
  } catch (err) {
    console.error('OCR error:', err);
    return '';
  }
}

export function extractSuspectDetails(evidenceList: EvidenceItem[]): SuspectDetail[] {
  const details: SuspectDetail[] = [];
  let idCounter = 1;

  // Regex patterns
  const phoneRegex = /(?:\+91[\-\s]?)?[6-9]\d{9}/g;
  const upiRegex = /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g;
  const handleRegex = /@[a-zA-Z0-9_.]{3,30}/g;
  const urlRegex = /https?:\/\/[^\s]+/g;
  const amountRegex = /(?:rs\.?|inr|₹)\s*[\d,]+(?:\.\d{2})?/gi;

  for (const item of evidenceList) {
    const text = item.content || '';
    if (item.type !== 'text' && item.type !== 'link' && !item.content.startsWith('data:image')) {
      // If it's an image without explicit OCR text stored, skip or use note
    }

    const searchStr = `${item.note || ''} ${text}`;

    // Phones
    const phones = searchStr.match(phoneRegex) || [];
    for (const phone of phones) {
      if (!details.some(d => d.value === phone && d.type === 'phone')) {
        details.push({
          id: `suspect_${idCounter++}`,
          caseId: item.caseId,
          type: 'phone',
          value: phone.trim(),
          sourceMessageId: item.id,
          sourceText: item.note || item.content.slice(0, 60),
          ignored: false,
        });
      }
    }

    // UPI IDs
    const upis = searchStr.match(upiRegex) || [];
    for (const upi of upis) {
      // Filter out emails if possible or keep as UPI
      if (!upi.endsWith('.com') && !upi.endsWith('.org') && !details.some(d => d.value === upi && d.type === 'upi')) {
        details.push({
          id: `suspect_${idCounter++}`,
          caseId: item.caseId,
          type: 'upi',
          value: upi.trim(),
          sourceMessageId: item.id,
          sourceText: item.note || item.content.slice(0, 60),
          ignored: false,
        });
      }
    }

    // Handles
    const handles = searchStr.match(handleRegex) || [];
    for (const handle of handles) {
      if (!details.some(d => d.value === handle && d.type === 'handle')) {
        details.push({
          id: `suspect_${idCounter++}`,
          caseId: item.caseId,
          type: 'handle',
          value: handle.trim(),
          sourceMessageId: item.id,
          sourceText: item.note || item.content.slice(0, 60),
          ignored: false,
        });
      }
    }

    // URLs
    const urls = searchStr.match(urlRegex) || [];
    for (const url of urls) {
      if (!details.some(d => d.value === url && d.type === 'url')) {
        details.push({
          id: `suspect_${idCounter++}`,
          caseId: item.caseId,
          type: 'url',
          value: url.trim(),
          sourceMessageId: item.id,
          sourceText: item.note || item.content.slice(0, 60),
          ignored: false,
        });
      }
    }

    // Amounts
    const amounts = searchStr.match(amountRegex) || [];
    for (const amt of amounts) {
      if (!details.some(d => d.value === amt && d.type === 'amount')) {
        details.push({
          id: `suspect_${idCounter++}`,
          caseId: item.caseId,
          type: 'amount',
          value: amt.trim(),
          sourceMessageId: item.id,
          sourceText: item.note || item.content.slice(0, 60),
          ignored: false,
        });
      }
    }
  }

  return details;
}
