"use client";

export type Direction = "ko2zh" | "zh2ko" | "ko2ja" | "ja2ko" | "ko2en" | "en2ko";

export interface Message {
  id: string;
  direction: Direction;
  originalText: string;
  translatedText: string;
  pronunciation: string;
  pinyinText: string;
  createdAt: Date;
}

const FLAG_MAP: Record<Direction, string> = {
  ko2zh: "🇰🇷→🇨🇳",
  zh2ko: "🇨🇳→🇰🇷",
  ko2ja: "🇰🇷→🇯🇵",
  ja2ko: "🇯🇵→🇰🇷",
  ko2en: "🇰🇷→🇺🇸",
  en2ko: "🇺🇸→🇰🇷",
};

export default function MessageBubble({ message }: { message: Message }) {
  const flag = FLAG_MAP[message.direction] || "";

  return (
    <div className="px-4 py-2">
      <div className="text-xs text-gray-400 mb-1">{flag}</div>
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
        <p className="text-base text-gray-900">{message.originalText}</p>
        <p className="text-base text-blue-600 mt-1">{message.translatedText}</p>
        {message.pronunciation && (
          <p className="text-sm text-gray-500 mt-0.5">{message.pronunciation}</p>
        )}
        {message.pinyinText && (
          <p className="text-xs text-gray-400 mt-0.5 italic">{message.pinyinText}</p>
        )}
      </div>
    </div>
  );
}
