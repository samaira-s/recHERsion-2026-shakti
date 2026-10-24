import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVaultMeta, saveVaultMeta, saveEncryptedCase } from '../lib/storage';
import { generateSalt, deriveKeyFromPin, encryptData, decryptData } from '../lib/crypto';
import { setVaultSession } from '../lib/vaultSession';
import { createDemoCaseData } from '../lib/demoData';
import { Shield } from 'lucide-react';

export const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [calcInput, setCalcInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getVaultMeta().then(meta => {
      setHasVault(!!meta);
    }).catch(() => {
      setHasVault(false);
    });
  }, []);

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setInterval(() => setLockoutTime(t => Math.max(0, t - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleDigit = (digit: string) => {
    if (display === '0' || display === 'Error') {
      setDisplay(digit);
    } else {
      setDisplay(display + digit);
    }
    setCalcInput(prev => prev + digit);
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
    setCalcInput('');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setCalcInput('');
    setErrorMsg('');
  };

  const triggerUnlockReveal = () => {
    setUnlocking(true);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReduced ? 200 : 700;
    setTimeout(() => {
      navigate('/home');
    }, duration);
  };

  const handleCalculate = async () => {
    if (lockoutTime > 0) {
      setErrorMsg(`Too many failed attempts. Please wait ${lockoutTime}s.`);
      return;
    }

    try {
      const meta = await getVaultMeta();
      if (!meta) {
        try {
          const result = eval(equation + display);
          setDisplay(String(result));
        } catch {
          setDisplay('Error');
        }
        setCalcInput('');
        return;
      }

      const pinAttempt = calcInput;
      const saltBytes = Uint8Array.from(atob(meta.salt), c => c.charCodeAt(0));
      const key = await deriveKeyFromPin(pinAttempt, saltBytes);

      try {
        await decryptData(key, meta.checkCiphertext, meta.checkIv);
        setVaultSession(key, false, false);
        triggerUnlockReveal();
        return;
      } catch (err) {
        if (meta.duressSalt && meta.duressCheckCiphertext && meta.duressCheckIv) {
          try {
            const duressSaltBytes = Uint8Array.from(atob(meta.duressSalt), c => c.charCodeAt(0));
            const duressKey = await deriveKeyFromPin(pinAttempt, duressSaltBytes);
            await decryptData(duressKey, meta.duressCheckCiphertext, meta.duressCheckIv);
            setVaultSession(duressKey, true, false);
            triggerUnlockReveal();
            return;
          } catch (duressErr) {
            // Not duress
          }
        }

        const nextAttempts = failedAttempts + 1;
        setFailedAttempts(nextAttempts);
        const delay = Math.min(30, Math.pow(2, nextAttempts));
        setLockoutTime(delay);

        try {
          const result = eval(equation + display);
          setDisplay(String(result));
        } catch {
          setDisplay('Error');
        }
      }
      setCalcInput('');
    } catch (err) {
      setDisplay('Error');
      setCalcInput('');
    }
  };

  const handleSetupVaultSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!window.crypto || !window.crypto.subtle) {
      const errStr = 'Web Crypto API (crypto.subtle) is not available in this browser environment.';
      console.error(errStr);
      setErrorMsg(errStr);
      return;
    }

    if (setupPin.length < 4 || setupPin.length > 6) {
      setErrorMsg('PIN must be 4 to 6 digits.');
      return;
    }
    if (setupPin !== confirmPin) {
      setErrorMsg('PINs do not match.');
      return;
    }

    try {
      const salt = await generateSalt();
      const key = await deriveKeyFromPin(setupPin, salt);
      const checkPayload = { test: 'saakshi-vault-ok' };
      const encryptedCheck = await encryptData(key, checkPayload);

      const meta = {
        salt: btoa(String.fromCharCode(...salt)),
        checkCiphertext: encryptedCheck.ciphertext,
        checkIv: encryptedCheck.iv,
      };

      await saveVaultMeta(meta);

      const { caseRecord, items } = await createDemoCaseData();
      const encCase = await encryptData(key, { caseRecord, items });
      await saveEncryptedCase(caseRecord.id, encCase.ciphertext, encCase.iv);

      setVaultSession(key, false, false);
      setShowSetup(false);
      navigate('/home');
    } catch (err: any) {
      console.error('Vault creation error:', err);
      setErrorMsg(err.message || 'Vault creation failed. Please try again.');
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#F8F6F2] p-4 text-[#3D3846] overflow-hidden">
      {/* Ordinary Phone Calculator Container (Pastel Theme) */}
      <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-xl border border-[#EAE3D9]">
        <div className="mb-6 text-right px-2">
          <div className="text-4xl font-light text-[#3D3846] tracking-tight">{display}</div>
        </div>

        {/* Standard Calculator Keypad (Pastel Neutrals & Soft Lavender Accent) */}
        <div className="grid grid-cols-4 gap-2.5">
          <button onClick={handleClear} className="col-span-2 rounded-2xl bg-[#F4F1EC] py-3.5 text-sm font-medium text-[#7A728A] hover:bg-[#EBE5DC] transition">AC</button>
          <button onClick={() => handleOperator('/')} className="rounded-2xl bg-[#F4F1EC] py-3.5 text-sm font-medium text-[#9B8EDB] hover:bg-[#EBE5DC] transition">÷</button>
          <button onClick={() => handleOperator('*')} className="rounded-2xl bg-[#F4F1EC] py-3.5 text-sm font-medium text-[#9B8EDB] hover:bg-[#EBE5DC] transition">×</button>

          <button onClick={() => handleDigit('7')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">7</button>
          <button onClick={() => handleDigit('8')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">8</button>
          <button onClick={() => handleDigit('9')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">9</button>
          <button onClick={() => handleOperator('-')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#9B8EDB] hover:bg-[#EBE5DC] transition">-</button>

          <button onClick={() => handleDigit('4')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">4</button>
          <button onClick={() => handleDigit('5')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">5</button>
          <button onClick={() => handleDigit('6')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">6</button>
          <button onClick={() => handleOperator('+')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#9B8EDB] hover:bg-[#EBE5DC] transition">+</button>

          <button onClick={() => handleDigit('1')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">1</button>
          <button onClick={() => handleDigit('2')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">2</button>
          <button onClick={() => handleDigit('3')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">3</button>
          <button onClick={handleCalculate} className="row-span-2 rounded-2xl bg-[#9B8EDB] py-4 text-lg font-medium text-white shadow-md hover:bg-[#867bc7] transition flex items-center justify-center">=</button>

          <button onClick={() => handleDigit('0')} className="col-span-2 rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">0</button>
          <button onClick={() => handleDigit('.')} className="rounded-2xl bg-[#F4F1EC] py-4 text-lg font-medium text-[#3D3846] hover:bg-[#EBE5DC] transition">.</button>
        </div>

        {hasVault === false && (
          <div className="mt-6 pt-3 text-center">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSetupPin('');
                setConfirmPin('');
                setShowSetup(true);
              }}
              className="min-h-[48px] w-full py-2 px-4 text-xs font-normal text-[#7A728A] hover:text-[#3D3846] transition focus:outline-none focus:ring-1 focus:ring-[#9B8EDB] rounded-lg"
            >
              About
            </button>
          </div>
        )}
      </div>

      {/* Setup Vault Bottom Sheet Modal (Pastel Theme) */}
      {showSetup && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl border-t border-[#EAE3D9] text-[#3D3846] animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-2xl bg-[#EAE6F8] p-3 text-[#9B8EDB] border border-[#9B8EDB]/30">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-serif font-bold text-[#3D3846]">Set up your private sanctuary</h2>
                <p className="text-xs text-[#7A728A]">Encrypted locally with soft pastel privacy standards.</p>
              </div>
            </div>

            <form onSubmit={handleSetupVaultSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#7A728A] mb-1">Create PIN (4 to 6 digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={setupPin}
                  onChange={e => setSetupPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full rounded-xl bg-[#F8F6F2] border border-[#EAE3D9] p-3 text-center text-lg tracking-widest text-[#3D3846] focus:outline-none focus:ring-2 focus:ring-[#9B8EDB]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7A728A] mb-1">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full rounded-xl bg-[#F8F6F2] border border-[#EAE3D9] p-3 text-center text-lg tracking-widest text-[#3D3846] focus:outline-none focus:ring-2 focus:ring-[#9B8EDB]"
                  required
                />
              </div>

              <p className="text-[11px] text-[#7A728A] bg-[#F8F6F2] p-3 rounded-xl border border-[#EAE3D9] leading-relaxed">
                Remember this PIN. It can't be recovered, and nothing leaves your device.
              </p>

              {errorMsg && (
                <div className="rounded-xl bg-[#FCEADE] p-3 text-xs font-medium text-[#C77D65] text-center border border-[#E8A598]/40">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSetup(false)}
                  className="flex-1 rounded-xl bg-[#F4F1EC] py-3 text-sm font-medium text-[#7A728A] hover:bg-[#EBE5DC] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#9B8EDB] py-3 text-sm font-medium text-white shadow-md hover:bg-[#867bc7] transition"
                >
                  Create sanctuary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unlock Transition Overlay (Pastel Lavender) */}
      {unlocking && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          <div className="w-1/2 h-full bg-[#FAF6F0] border-r border-[#EAE3D9] animate-arch-left flex items-center justify-end">
            <div className="w-2 h-full bg-gradient-to-l from-[#9B8EDB]/20 to-transparent" />
          </div>
          <div className="w-1/2 h-full bg-[#FAF6F0] border-l border-[#EAE3D9] animate-arch-right flex items-center justify-start">
            <div className="w-2 h-full bg-gradient-to-r from-[#9B8EDB]/20 to-transparent" />
          </div>
        </div>
      )}
    </div>
  );
};
