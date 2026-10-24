import React, { useState } from 'react';
import { Shield, Lock, FileText, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);

  const cards = [
    {
      icon: Shield,
      title: "Private by design",
      desc: "Everything you save stays 100% on your device. Encrypted securely with your PIN in a luxury digital sanctuary. Nothing leaves your phone unless you choose.",
    },
    {
      icon: Lock,
      title: "Keep your proof safe",
      desc: "Add chat screenshots, text, and links into a tamper-evident timeline. Each piece of evidence is chained securely so you can verify integrity anytime.",
    },
    {
      icon: FileText,
      title: "Prepare your report",
      desc: "Understand the situation, extract suspect phone numbers and UPI IDs instantly, and generate an assistive report draft following portal guidelines.",
    },
  ];

  const current = cards[step];
  const IconComponent = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-[var(--bg-raised)] p-6 shadow-2xl border border-[#C9A24B]/30 text-[var(--text-ivory)]">
        <div className="mb-6 flex justify-center">
          <div className="rounded-3xl bg-[#C9A24B]/15 p-5 text-[#C9A24B] border border-[#C9A24B]/30">
            <IconComponent className="w-10 h-10" />
          </div>
        </div>

        <div className="text-center mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9A24B]">Step {step + 1} of 3</span>
          <h2 className="text-2xl font-serif font-bold text-[var(--text-ivory)] mt-1">{current.title}</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">{current.desc}</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${i === step ? 'w-6 bg-[#C9A24B]' : 'w-2 bg-[#C9A24B]/30'}`}
            />
          ))}
        </div>

        <div className="flex gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 rounded-2xl bg-[var(--bg-cards)] py-3 text-sm font-medium text-[var(--text-ivory)] hover:bg-[#382b4f] transition border border-[#C9A24B]/20"
            >
              Back
            </button>
          )}
          <button
            onClick={() => {
              if (step < cards.length - 1) {
                setStep(s => s + 1);
              } else {
                onComplete();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-[#C9A24B] py-3 text-sm font-medium text-[#17101F] shadow-md hover:bg-[#b8913e] transition"
          >
            <span>{step === cards.length - 1 ? "Let's begin" : "Next"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
