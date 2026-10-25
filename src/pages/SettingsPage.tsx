import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { getVaultMeta, saveVaultMeta } from '../lib/storage';
import { generateSalt, deriveKeyFromPin, encryptData } from '../lib/crypto';
import { ArrowLeft, Info, Sun, Moon } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [aiEnabled, setAiEnabled] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [showDuressModal, setShowDuressModal] = useState(false);
  const [duressPin, setDuressPin] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('shakti_theme');
    if (savedTheme === 'light') {
      setIsDarkTheme(false);
      document.body.classList.add('light-theme');
    } else {
      setIsDarkTheme(true);
      document.body.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (isDarkTheme) {
      setIsDarkTheme(false);
      document.body.classList.add('light-theme');
      localStorage.setItem('shakti_theme', 'light');
    } else {
      setIsDarkTheme(true);
      document.body.classList.remove('light-theme');
      localStorage.setItem('shakti_theme', 'dark');
    }
  };

  const handleSetDuressPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (duressPin.length < 4 || duressPin.length > 6) {
      setErrorMsg('Duress PIN must be 4 to 6 digits.');
      return;
    }

    try {
      const meta = await getVaultMeta();
      if (!meta) {
        setErrorMsg('Vault not set up yet.');
        return;
      }

      const duressSalt = await generateSalt();
      const duressKey = await deriveKeyFromPin(duressPin, duressSalt);
      const enc = await encryptData(duressKey, { test: 'duress-ok' });

      meta.duressSalt = btoa(String.fromCharCode(...duressSalt));
      meta.duressCheckCiphertext = enc.ciphertext;
      meta.duressCheckIv = enc.iv;

      await saveVaultMeta(meta);
      setSuccessMsg('Duress PIN successfully configured. When entered, it opens a decoy sanctuary.');
      setShowDuressModal(false);
      setDuressPin('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to set duress PIN');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-ivory)]">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 text-xs font-semibold text-[#9B8EDB] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to sanctuary</span>
          </button>
        </div>

        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[var(--border-color)] space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9B8EDB]">Preferences & Security</span>
          <h1 className="text-2xl font-serif font-bold text-[var(--text-ivory)]">Settings</h1>
          <p className="text-xs text-[var(--text-muted)]">Manage security options, appearance theme, and duress protection.</p>
        </div>

        {successMsg && (
          <div className="rounded-2xl bg-[#88C4A5]/20 p-4 text-xs font-semibold text-[#88C4A5] border border-[#88C4A5]/30">
            {successMsg}
          </div>
        )}

        {/* Security & Appearance Settings */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[var(--border-color)] space-y-4">
          <h2 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Security & Appearance</h2>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-ivory)]">Sanctuary Theme</h3>
              <p className="text-xs text-[var(--text-muted)]">Switch between dark midnight plum and light ivory theme.</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-xl bg-[var(--bg-cards)] px-4 py-2 text-xs font-medium text-[var(--text-ivory)] border border-[var(--border-color)] hover:bg-[#EAE6F8]/30 transition"
            >
              {isDarkTheme ? <Sun className="w-4 h-4 text-[#9B8EDB]" /> : <Moon className="w-4 h-4 text-[#9B8EDB]" />}
              <span>{isDarkTheme ? 'Light Theme' : 'Dark Theme'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-ivory)]">Duress PIN</h3>
              <p className="text-xs text-[var(--text-muted)]">Set a second PIN that opens a decoy sanctuary with harmless dummy cases.</p>
            </div>
            <button
              onClick={() => setShowDuressModal(true)}
              className="rounded-xl bg-[#9B8EDB] px-4 py-2 text-xs font-medium text-white shadow-xs hover:bg-[#867bc7] transition"
            >
              Configure Duress PIN
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-ivory)]">AI Analysis Feature</h3>
              <p className="text-xs text-[var(--text-muted)]">Enable or disable sending chat text to Gemini for situation risk analysis.</p>
            </div>
            <button
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`rounded-xl px-4 py-2 text-xs font-medium transition ${aiEnabled ? 'bg-[#88C4A5] text-[#17101F] font-semibold' : 'bg-[var(--bg-cards)] text-[var(--text-ivory)] border border-[var(--border-color)]'}`}
            >
              {aiEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Limits & Plain Language Notice */}
        <div className="rounded-3xl bg-[var(--bg-raised)] p-6 shadow-sm border border-[var(--border-color)] space-y-3">
          <div className="flex items-center gap-2 text-[#9B8EDB]">
            <Info className="w-5 h-5" />
            <h2 className="text-lg font-serif font-bold text-[var(--text-ivory)]">Limits & Plain Language Notice</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Shakti runs 100% locally in your browser with AES-GCM encryption. While cryptographic hash chains verify that your saved files have not been tampered with since creation, Shakti cannot prove the original authenticity of incoming screenshots or third-party messages. Always exercise caution and consult authorities or trusted counselors.
          </p>
        </div>

        {/* Duress Modal */}
        {showDuressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-raised)] p-6 shadow-2xl border border-[var(--border-color)] text-[var(--text-ivory)]">
              <h3 className="text-lg font-serif font-bold mb-2">Set Duress PIN</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Enter a 4-6 digit PIN different from your main PIN. Entering this PIN will open a decoy sanctuary with harmless dummy notes.
              </p>

              <form onSubmit={handleSetDuressPin} className="space-y-4">
                <input
                  type="password"
                  maxLength={6}
                  value={duressPin}
                  onChange={e => setDuressPin(e.target.value)}
                  placeholder="••••"
                  className="w-full rounded-xl bg-[var(--bg-cards)] border border-[var(--border-color)] p-3 text-center text-lg tracking-widest text-[var(--text-ivory)] focus:outline-none focus:ring-2 focus:ring-[#9B8EDB]"
                  required
                />
                {errorMsg && <p className="text-xs text-[#C77D65] font-medium">{errorMsg}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDuressModal(false)}
                    className="flex-1 rounded-xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#EAE6F8]/30 transition border border-[var(--border-color)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-[#9B8EDB] py-3 text-sm font-medium text-white shadow-md hover:bg-[#867bc7] transition"
                  >
                    Save Duress PIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
