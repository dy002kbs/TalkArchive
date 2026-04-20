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

// zh는 당분간 UI에서 숨김 (데이터/기존 카드 호환을 위해 타입/코드에는 유지)
const LANG_OPTIONS: { key: Language; label: string }[] = [
  { key: "ja", label: "日本語" },
  { key: "en", label: "EN" },
];

const SOURCE_LABEL: Record<Direction, string> = {
  ko2zh: "한", zh2ko: "中",
  ko2ja: "한", ja2ko: "日",
  ko2en: "한", en2ko: "En",
};
const TARGET_LABEL: Record<Direction, string> = {
  ko2zh: "中", zh2ko: "한",
  ko2ja: "日", ja2ko: "한",
  ko2en: "En", en2ko: "한",
};

const SPEECH_LANG: Record<Direction, string> = {
  ko2zh: "ko-KR", zh2ko: "zh-CN",
  ko2ja: "ko-KR", ja2ko: "ja-JP",
  ko2en: "ko-KR", en2ko: "en-US",
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
    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
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
        .map((r: any) => r[0].transcript)
        .join("");
      setText(transcript);
      if (event.results[event.results.length - 1].isFinal) {
        onSend(transcript.trim());
        setText("");
      }
    };
    recognition.onend = () => { setIsListening(false); recognitionRef.current = null; };
    recognition.onerror = () => { setIsListening(false); recognitionRef.current = null; };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div
      className="bg-white px-4 pt-3 pb-2"
      style={{ borderTop: "1px solid var(--c-border)" }}
    >
      {/* 언어 선택 + 방향 전환 */}
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="flex rounded-xl p-0.5 flex-1"
          style={{ background: "var(--c-bg)" }}
        >
          {LANG_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onChangeLanguage(opt.key)}
              className="flex-1 py-1.5 rounded-[10px] text-xs font-medium transition-colors"
              style={{
                background: language === opt.key ? "var(--c-surface)" : "transparent",
                color: language === opt.key ? "var(--c-text)" : "var(--c-muted)",
                boxShadow: language === opt.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={onToggleDirection}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors active:opacity-70 shrink-0"
          style={{
            background: "var(--c-indigo-l)",
            color: "var(--c-indigo)",
          }}
        >
          <span>{SOURCE_LABEL[direction]}→{TARGET_LABEL[direction]}</span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="var(--c-indigo)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M7 16V4m0 0L3 8m4-4 4 4"/>
            <path d="M17 8v12m0 0 4-4m-4 4-4-4"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleListening}
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: isListening ? "var(--c-red)" : "var(--c-bg)",
          }}
        >
          {isListening ? (
            <span className="w-2.5 h-2.5 rounded-sm bg-white animate-pulse" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24"
              fill="var(--c-muted)">
              <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z"/>
              <path d="M6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.93V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A8 8 0 0 0 20 11a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z"/>
            </svg>
          )}
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isListening ? "듣고 있어요..." : PLACEHOLDERS[direction]}
          className="flex-1 min-w-0 h-11 px-4 rounded-xl text-[15px] focus:outline-none transition-colors"
          style={{
            background: "var(--c-bg)",
            border: "1.5px solid var(--c-border)",
            color: "var(--c-text)",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--c-indigo-m)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--c-border)";
          }}
        />

        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-opacity"
          style={{
            background: "var(--c-indigo)",
            opacity: text.trim() ? 1 : 0.35,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
