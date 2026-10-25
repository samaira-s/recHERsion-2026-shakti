/**
 * In-memory vault session management. Keeps CryptoKey purely in memory.
 */

export interface HelperSession {
  caseId: string;
  startedAt: number;
  expiresAt: number;
  helperLabel: string;
}

let activeKey: CryptoKey | null = null;
let isDuressMode = false;
let isHelperModeSession = false;
let currentHelperSession: HelperSession | null = null;

export function setVaultSession(key: CryptoKey, duress: boolean = false, helper: boolean = false) {
  activeKey = key;
  isDuressMode = duress;
  isHelperModeSession = helper;
}

export function getVaultSession(): { key: CryptoKey | null; isDuress: boolean; isHelper: boolean } {
  // Check if helper session expired
  if (currentHelperSession && Date.now() > currentHelperSession.expiresAt) {
    currentHelperSession = null;
    isHelperModeSession = false;
  }
  return {
    key: activeKey,
    isDuress: isDuressMode,
    isHelper: isHelperModeSession || !!currentHelperSession,
  };
}

export function setHelperSession(session: HelperSession | null) {
  currentHelperSession = session;
  if (session) {
    isHelperModeSession = true;
  }
}

export function getHelperSession(): HelperSession | null {
  if (currentHelperSession && Date.now() > currentHelperSession.expiresAt) {
    currentHelperSession = null;
    isHelperModeSession = false;
    return null;
  }
  return currentHelperSession;
}

export function clearVaultSession() {
  activeKey = null;
  isDuressMode = false;
  isHelperModeSession = false;
  currentHelperSession = null;
}
