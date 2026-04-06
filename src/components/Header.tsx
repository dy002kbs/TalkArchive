"use client";

import Link from "next/link";

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
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            onClick={onBack}
            className="text-gray-600 text-lg p-1"
          >
            ←
          </button>
        )}
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {!showBack && (
          <span className="text-xs text-gray-400 ml-1">v0.2.0</span>
        )}
      </div>
      {!showBack && (
        <div className="flex items-center gap-2">
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-full active:bg-blue-100 transition-colors"
            >
              + 새 대화
            </button>
          )}
          <Link
            href="/history"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
          >
            기록
          </Link>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
          >
            대시보드
          </Link>
          <Link
            href="/flashcards"
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-full active:bg-gray-200 transition-colors"
          >
            학습
          </Link>
          <Link
            href="/feedback"
            className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-full active:bg-orange-100 transition-colors"
          >
            QA
          </Link>
        </div>
      )}
    </header>
  );
}
