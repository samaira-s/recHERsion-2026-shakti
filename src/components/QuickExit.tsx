import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearVaultSession } from '../lib/vaultSession';
import { LogOut, AlertTriangle } from 'lucide-react';

export const QuickExit: React.FC = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleQuickExit = () => {
    clearVaultSession();
    navigate('/');
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="flex items-center gap-1.5 rounded-xl bg-[#F0B27A]/10 px-3 py-1.5 text-xs font-semibold text-[#F0B27A] hover:bg-[#F0B27A]/20 transition shadow-xs border border-[#F0B27A]/30"
        title="Quick exit & clear session"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Quick Exit</span>
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-raised)] p-6 shadow-2xl border border-[#F0B27A]/40 text-[var(--text-ivory)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-2xl bg-[#F0B27A]/20 p-3 text-[#F0B27A]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold">Quick Exit & Clear</h3>
                <p className="text-xs text-[var(--text-muted)]">Lock vault and clear session immediately.</p>
              </div>
            </div>

            <p className="text-sm text-[var(--text-muted)] mb-6">
              This will instantly clear your session memory and return you to the calculator. You can unlock again anytime with your PIN.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickExit}
                className="flex-1 rounded-xl bg-[#F0B27A] py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#d99b61] transition"
              >
                Confirm Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
