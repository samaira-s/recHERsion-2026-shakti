import { deriveKeyFromPin, encryptData, decryptData, generateSalt, sha256 } from './crypto';
import { computeItemHashes, verifyChain } from './hashChain';
import { EvidenceItem } from '../types';

export async function runEvidenceTest(): Promise<{ success: boolean; message: string }> {
  try {
    const pin = '123456';
    const salt = await generateSalt();
    const key = await deriveKeyFromPin(pin, salt);

    // Initial items array
    const items: EvidenceItem[] = [];
    const timestamp1 = new Date().toISOString();
    const prevHash1 = 'GENESIS';
    const textContent = 'Test chat message threatening release of photos';

    const hashes1 = await computeItemHashes(prevHash1, textContent, timestamp1);

    const textItem: EvidenceItem = {
      id: `item_${Date.now()}_1`,
      caseId: 'test_case_1',
      type: 'text',
      platform: 'WhatsApp',
      content: textContent,
      timestamp: timestamp1,
      contentHash: hashes1.contentHash,
      prevChainHash: prevHash1,
      chainHash: hashes1.chainHash,
    };

    items.push(textItem);

    // Add image item
    const timestamp2 = new Date().toISOString();
    const prevHash2 = textItem.chainHash;
    const imgContent = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const contentHash2 = await sha256(imgContent);
    const chainInput2 = prevHash2 + contentHash2 + timestamp2;
    const chainHash2 = await sha256(chainInput2);

    const imageItem: EvidenceItem = {
      id: `item_${Date.now()}_2`,
      caseId: 'test_case_1',
      type: 'screenshot',
      platform: 'Instagram',
      content: imgContent,
      timestamp: timestamp2,
      contentHash: contentHash2,
      prevChainHash: prevHash2,
      chainHash: chainHash2,
    };

    items.push(imageItem);

    // Encrypt case payload (simulate storage)
    const caseRecord = {
      id: 'test_case_1',
      title: 'Test Evidence Case',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const enc = await encryptData(key, { caseRecord, items });

    // Reload vault: derive key again with same PIN & salt
    const reloadedKey = await deriveKeyFromPin(pin, salt);
    const decrypted = await decryptData(reloadedKey, enc.ciphertext, enc.iv);

    // Check both items are present
    if (!decrypted.items || decrypted.items.length !== 2) {
      return { success: false, message: 'Reloaded items count mismatch' };
    }

    // Verify chain
    const verification = await verifyChain(decrypted.items);
    if (!verification.valid) {
      return { success: false, message: 'Chain verification failed after reload' };
    }

    return { success: true, message: 'Test passed: Text and image added, vault reloaded, and chain verified successfully.' };
  } catch (err: any) {
    console.error('Evidence test error:', err);
    return { success: false, message: err?.message || 'Unknown test error' };
  }
}
