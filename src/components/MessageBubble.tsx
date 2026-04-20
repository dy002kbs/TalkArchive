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

export default function MessageBubble({ message }: { message: Message }) {
  return (
    <div className="px-4 py-1.5 flex justify-start">
      <div
        className="max-w-[85%] px-4 py-3 rounded-[18px] rounded-tl-[4px]"
        style={{
          background: "var(--c-indigo)",
          boxShadow: "var(--c-shadow-sm)",
        }}
      >
        <p className="text-[15px] font-medium leading-relaxed text-white">
          {message.originalText}
        </p>
        <p className="text-[15px] font-medium leading-relaxed text-white mt-1" style={{ opacity: 0.95 }}>
          {message.translatedText}
        </p>
        {message.pronunciation && (
          <p className="text-[13px] mt-1 leading-snug text-white" style={{ opacity: 0.8 }}>
            {message.pronunciation}
          </p>
        )}
        {message.pinyinText && (
          <p className="text-[11px] mt-0.5 italic text-white" style={{ opacity: 0.7 }}>
            {message.pinyinText}
          </p>
        )}
      </div>
    </div>
  );
}
