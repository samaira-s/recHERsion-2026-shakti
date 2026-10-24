import { sha256 } from './crypto';
import { EvidenceItem } from '../types';

export async function computeItemHashes(
  prevChainHash: string,
  content: string,
  timestamp: string
): Promise<{ contentHash: string; chainHash: string }> {
  const contentHash = await sha256(content);
  const chainInput = `${prevChainHash}:${contentHash}:${timestamp}`;
  const chainHash = await sha256(chainInput);
  return { contentHash, chainHash };
}

export async function verifyChain(items: EvidenceItem[]): Promise<{ valid: boolean; firstTamperedId?: string; affectedIds: string[] }> {
  let prevHash = 'GENESIS';
  let tamperedFound = false;
  let firstTamperedId: string | undefined = undefined;
  const affectedIds: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const { contentHash: expectedContentHash, chainHash: expectedChainHash } = await computeItemHashes(
      prevHash,
      item.content,
      item.timestamp
    );

    const isMatch = item.contentHash === expectedContentHash && item.chainHash === expectedChainHash;

    if (!isMatch || tamperedFound) {
      if (!tamperedFound) {
        tamperedFound = true;
        firstTamperedId = item.id;
      } else {
        affectedIds.push(item.id);
      }
      prevHash = item.chainHash; // continue chain propagation
    } else {
      prevHash = item.chainHash;
    }
  }

  return {
    valid: !tamperedFound,
    firstTamperedId,
    affectedIds,
  };
}
