import React, { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) return null;

  if (deferredPrompt) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-[#C9A24B] px-3 py-1.5 text-xs font-medium text-[#17101F] shadow-xs hover:bg-[#b8913e] transition"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl bg-[#2C2140] px-3 py-1.5 text-xs font-medium text-[#C9A24B] border border-[#C9A24B]/30 hover:bg-[#382b4f] transition"
        >
          <Smartphone className="w-4 h-4" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-raised)] p-6 shadow-2xl border border-[#C9A24B]/30 text-[var(--text-ivory)]">
              <h3 className="text-lg font-serif font-bold mb-2">Install on iPhone / iPad</h3>
              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                1. Tap the <strong className="text-[#C9A24B]">Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-[#C9A24B]">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-[#C9A24B] py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
