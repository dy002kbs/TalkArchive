"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

const TYPES = [
  { value: "mistranslation", label: "오역", emoji: "🔤" },
  { value: "bug", label: "기능 오류", emoji: "🐛" },
  { value: "suggestion", label: "기타 의견", emoji: "💡" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [type, setType] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!type || !content.trim()) return;
    setSubmitting(true);

    const { error } = await supabase
      .from("feedback")
      .insert({ type, content: content.trim() });

    setSubmitting(false);

    if (error) {
      alert("제출에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
        <Header title="피드백" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <p className="text-4xl">🙏</p>
          <p className="text-lg font-medium" style={{ color: "var(--c-text)" }}>감사합니다!</p>
          <p className="text-sm text-center" style={{ color: "var(--c-muted)" }}>
            소중한 피드백이 전달되었습니다.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setType("");
              setContent("");
            }}
            className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold active:opacity-70 transition-opacity"
            style={{ background: "var(--c-indigo)", color: "white" }}
          >
            다른 피드백 남기기
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
      <Header title="피드백" showBack onBack={() => router.push("/")} />

      <div className="flex-1 overflow-y-auto px-4 pt-6 page-safe-bottom">
        <p className="text-sm mb-4" style={{ color: "var(--c-muted)" }}>
          사용 중 불편한 점이나 개선 의견을 알려주세요.
        </p>

        <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>
          유형 선택
        </p>
        <div className="flex gap-2 mb-6">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{
                background: type === t.value ? "var(--c-indigo-l)" : "var(--c-surface)",
                color: type === t.value ? "var(--c-indigo)" : "var(--c-muted)",
                border: `1.5px solid ${type === t.value ? "var(--c-indigo-m)" : "var(--c-border)"}`,
              }}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <p className="text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>
          내용
        </p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="자유롭게 입력해주세요..."
          rows={5}
          className="w-full p-4 rounded-xl text-base resize-none focus:outline-none"
          style={{
            background: "var(--c-surface)",
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
          disabled={!type || !content.trim() || submitting}
          className="w-full mt-6 py-3 rounded-xl text-base font-semibold transition-opacity active:opacity-70"
          style={{
            background: "var(--c-indigo)",
            color: "white",
            opacity: !type || !content.trim() || submitting ? 0.4 : 1,
          }}
        >
          {submitting ? "제출 중..." : "제출하기"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
