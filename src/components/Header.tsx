"use client";

import Link from "next/link";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  onNewConversation?: () => void;
  showFlashcardLink?: boolean;
}

export default function Header({
  title = "TalkArchive",
  showBack = false,
  onBack,
  onNewConversation,
  showFlashcardLink = false,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-3 py-2.5 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0 shrink-0">
        {showBack && (
          <button
            onClick={onBack}
            className="text-gray-600 text-lg p-1 shrink-0"
          >
            ←
          </button>
        )}
        <h1 className="text-base sm:text-lg font-bold text-gray-900 whitespace-nowrap">
          {title}
        </h1>
        {!showBack && (
          <span className="text-[10px] text-gray-400 ml-0.5">v0.3.8</span>
        )}
      </div>
      {showBack && showFlashcardLink && (
        <Link
          href="/flashcards"
          className="px-2.5 py-1 text-xs sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors whitespace-nowrap"
        >
          학습
        </Link>
      )}
      {!showBack && (
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm font-medium text-blue-600 bg-blue-50 rounded-full active:bg-blue-100 transition-colors whitespace-nowrap"
            >
              + 새 대화
            </button>
          )}
          <Link
            href="/history"
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors whitespace-nowrap"
          >
            기록
          </Link>
          <Link
            href="/dashboard"
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors whitespace-nowrap"
          >
            대시보드
          </Link>
          <Link
            href="/flashcards"
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors whitespace-nowrap"
          >
            학습
          </Link>
          <Link
            href="/feedback"
            className="px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-sm font-medium text-orange-600 bg-orange-50 rounded-full active:bg-orange-100 transition-colors whitespace-nowrap"
          >
            QA
          </Link>
        </div>
      )}
    </header>
  );
}
