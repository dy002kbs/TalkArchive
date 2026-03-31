"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

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
      <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
        <Header title="피드백" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <p className="text-4xl">🙏</p>
          <p className="text-lg font-medium text-gray-900">감사합니다!</p>
          <p className="text-sm text-gray-500 text-center">
            소중한 피드백이 전달되었습니다.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-2.5 rounded-full bg-blue-500 text-white text-sm font-medium active:bg-blue-600 transition-colors"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header title="피드백" showBack onBack={() => router.push("/")} />

      <div className="flex-1 px-4 pt-6">
        <p className="text-sm text-gray-500 mb-4">
          사용 중 불편한 점이나 개선 의견을 알려주세요.
        </p>

        {/* 유형 선택 */}
        <p className="text-xs font-semibold text-gray-400 mb-2">유형 선택</p>
        <div className="flex gap-2 mb-6">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
                type === t.value
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 active:bg-gray-50"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        {/* 내용 입력 */}
        <p className="text-xs font-semibold text-gray-400 mb-2">내용</p>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="자유롭게 입력해주세요..."
          rows={5}
          className="w-full p-4 rounded-xl border border-gray-300 text-base resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {/* 제출 */}
        <button
          onClick={handleSubmit}
          disabled={!type || !content.trim() || submitting}
          className="w-full mt-6 py-3 rounded-full bg-blue-500 text-white text-base font-medium disabled:opacity-40 active:bg-blue-600 transition-colors"
        >
          {submitting ? "제출 중..." : "제출하기"}
        </button>
      </div>
    </div>
  );
}
