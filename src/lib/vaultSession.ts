/**
 * In-memory vault session management. Keeps CryptoKey purely in memory.
 */

let activeKey: CryptoKey | null = null;
let isDuressMode = false;
let isHelperModeSession = false;

export function setVaultSession(key: CryptoKey, duress: boolean = false, helper: boolean = false) {
  activeKey = key;
  isDuressMode = duress;
  isHelperModeSession = helper;
}

export function getVaultSession(): { key: CryptoKey | null; isDuress: boolean; isHelper: boolean } {
  return {
    key: activeKey,
    isDuress: isDuressMode,
    isHelper: isHelperModeSession,
  };
}

export function clearVaultSession() {
  activeKey = null;
  isDuressMode = false;
  isHelperModeSession = false;
}
