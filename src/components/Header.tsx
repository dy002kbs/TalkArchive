"use client";

import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onNewConversation?: () => void;
}

export default function Header({
  title = "TalkArchive",
  showBack = false,
  onBack,
  onNewConversation,
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  return (
    <header
      className="bg-white flex items-center justify-between px-5 py-3.5"
      style={{ borderBottom: "1px solid var(--c-border)" }}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors active:opacity-60"
            style={{ background: "var(--c-bg)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
        )}
        <h1
          className="text-lg font-bold tracking-tight"
          style={{ color: "var(--c-text)" }}
        >
          {title}
        </h1>
        {!showBack && (
          <span className="text-[10px]" style={{ color: "var(--c-subtle)" }}>
            v0.4.1
          </span>
        )}
      </div>

      {!showBack && onNewConversation && (
        <button
          onClick={onNewConversation}
          className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors active:opacity-70"
          style={{ background: "var(--c-indigo-l)" }}
          title="새 대화"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="var(--c-indigo)" strokeWidth="2.2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      )}
    </header>
  );
}
