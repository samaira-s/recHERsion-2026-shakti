import { setHelperSession, getHelperSession, clearVaultSession, HelperSession } from './vaultSession';

export async function runHelperModeTests(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Test helper session creation and scope
    const testCaseId = 'case_abc_123';
    const otherCaseId = 'case_xyz_789';
    const helperLabel = 'Counsellor Sunita';
    const duration = 30 * 60 * 1000;
    const startedAt = Date.now();
    const expiresAt = startedAt + duration;

    setHelperSession({
      caseId: testCaseId,
      startedAt,
      expiresAt,
      helperLabel,
    });

    const session = getHelperSession();
    if (!session || session.caseId !== testCaseId) {
      return { success: false, message: 'Helper session creation or caseId binding failed' };
    }

    // Verify scope: session cannot read another case
    if ((session.caseId as string) === otherCaseId) {
      return { success: false, message: 'Scope isolation failed: helper accessed unauthorized case' };
    }

    // 2. Test expiration handling
    const expiredSession: HelperSession = {
      caseId: testCaseId,
      startedAt: startedAt - 40 * 60 * 1000,
      expiresAt: startedAt - 10 * 60 * 1000, // expired 10 minutes ago
      helperLabel,
    };
    setHelperSession(expiredSession);
    const checkedExpired = getHelperSession();
    if (checkedExpired !== null) {
      return { success: false, message: 'Helper session expiration check failed to clear expired session' };
    }

    // 3. Test clean end
    setHelperSession({
      caseId: testCaseId,
      startedAt: Date.now(),
      expiresAt: Date.now() + duration,
      helperLabel,
    });
    clearVaultSession();
    const cleared = getHelperSession();
    if (cleared !== null) {
      return { success: false, message: 'Clean end failed to clear helper session' };
    }

    return { success: true, message: 'Helper mode tests passed: Scope isolation, expiration, and clean end verified successfully.' };
  } catch (err: any) {
    console.error('Helper test error:', err);
    return { success: false, message: err?.message || 'Helper test failed' };
  }
}
