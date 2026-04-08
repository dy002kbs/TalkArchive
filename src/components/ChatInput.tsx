"use client";

import { useState, useRef } from "react";
import { Direction } from "@/components/MessageBubble";

type Language = "zh" | "ja" | "en";

interface ChatInputProps {
  direction: Direction;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  onToggleDirection: () => void;
  onSend: (text: string) => void;
}

const DIRECTION_LABELS: Record<Direction, string> = {
  ko2zh: "한국어 → 中文",
  zh2ko: "中文 → 한국어",
  ko2ja: "한국어 → 日本語",
  ja2ko: "日本語 → 한국어",
  ko2en: "한국어 → English",
  en2ko: "English → 한국어",
};

const SPEECH_LANG: Record<Direction, string> = {
  ko2zh: "ko-KR",
  zh2ko: "zh-CN",
  ko2ja: "ko-KR",
  ja2ko: "ja-JP",
  ko2en: "ko-KR",
  en2ko: "en-US",
};

const PLACEHOLDERS: Record<Direction, string> = {
  ko2zh: "한국어를 입력하세요...",
  zh2ko: "中文输入...",
  ko2ja: "한국어를 입력하세요...",
  ja2ko: "日本語を入力...",
  ko2en: "한국어를 입력하세요...",
  en2ko: "Type in English...",
};

export default function ChatInput({
  direction,
  language,
  onChangeLanguage,
  onToggleDirection,
  onSend,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME(한글/중국어/일본어) 조합 중인 경우 Enter 무시
    // nativeEvent.isComposing 또는 keyCode 229로 체크
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("이 브라우저에서는 음성 입력을 지원하지 않습니다.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = SPEECH_LANG[direction];
    recognition.interimResults = true;
    recognition.continuous = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(event.results as ArrayLike<any>)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((result: any) => result[0].transcript)
        .join("");
      setText(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        onSend(transcript.trim());
        setText("");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 safe-bottom">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="flex items-center bg-gray-100 rounded-full p-0.5 shrink-0">
          <button
            onClick={() => onChangeLanguage("zh")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              language === "zh"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            🇨🇳 中文
          </button>
          <button
            onClick={() => onChangeLanguage("ja")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              language === "ja"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            🇯🇵 日本語
          </button>
          <button
            onClick={() => onChangeLanguage("en")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              language === "en"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            🇺🇸 English
          </button>
        </div>
        <button
          onClick={onToggleDirection}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-700 active:bg-gray-200 transition-colors whitespace-nowrap shrink-0"
        >
          {DIRECTION_LABELS[direction]}
          <span className="text-sm">🔄</span>
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleListening}
          className={`p-2.5 rounded-full transition-colors ${
            isListening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-gray-100 text-gray-600 active:bg-gray-200"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
            <path d="M6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.93V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A8 8 0 0 0 20 11a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z" />
          </svg>
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "듣고 있어요..." : PLACEHOLDERS[direction]}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-full border border-gray-300 text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="px-4 py-2.5 rounded-full bg-blue-500 text-white text-sm font-medium disabled:opacity-40 active:bg-blue-600 transition-colors whitespace-nowrap shrink-0"
        >
          전송
        </button>
      </div>
    </div>
  );
}
