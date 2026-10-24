import React from 'react';
import { QuickExit } from './QuickExit';
import { PWAInstallButton } from './PWAInstallButton';
import { User, Settings as SettingsIcon, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-raised)]/90 px-6 py-4 backdrop-blur-md shadow-xs">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/home')}>
        <div className="rounded-2xl bg-[#EAE6F8] p-2.5 text-[#9B8EDB] border border-[#9B8EDB]/30 shadow-xs">
          <User className="w-5 h-5" />
        </div>
        <div>
          <span className="text-lg font-serif font-bold tracking-tight text-[var(--text-ivory)]">Shakti</span>
          <p className="text-[10px] text-[var(--text-muted)] hidden sm:block">Private Digital Sanctuary</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PWAInstallButton />
        <button
          onClick={() => navigate('/helper')}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--bg-base)] px-3.5 py-2 text-xs font-medium text-[var(--text-ivory)] border border-[var(--border-color)] hover:bg-[#EAE6F8]/30 transition"
          title="Helper / Counselor Mode"
        >
          <Users className="w-4 h-4 text-[#9B8EDB]" />
          <span className="hidden md:inline">Helper Mode</span>
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--bg-base)] px-3.5 py-2 text-xs font-medium text-[var(--text-ivory)] border border-[var(--border-color)] hover:bg-[#EAE6F8]/30 transition"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4 text-[#9B8EDB]" />
          <span className="hidden md:inline">Settings</span>
        </button>
        <QuickExit />
      </div>
    </header>
  );
};
