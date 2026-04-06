"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

interface DashboardData {
  totalConversations: number;
  totalMessages: number;
  langStats: Record<string, number>;
  periodDays: number;
  currentPeriodCount: number;
  periodChange: number;
  dailyActivity: Record<string, number>;
  totalFlashcards: number;
  masteredFlashcards: number;
  recommendations: {
    id: string;
    original_text: string;
    translated_text: string;
    direction: string;
    pronunciation: string;
    frequency: number;
  }[];
}

type Period = 7 | 14 | 30;

const LANG_LABELS: Record<string, string> = {
  zh: "🇨🇳 중국어",
  ja: "🇯🇵 일본어",
  en: "🇺🇸 영어",
};

const MAX_FREE_FLASHCARDS = 20;

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [recLangFilter, setRecLangFilter] = useState<"all" | "zh" | "ja" | "en">("all");
  const [period, setPeriod] = useState<Period>(7);

  useEffect(() => {
    loadDashboard(period);
  }, [period]);

  const loadDashboard = async (periodDays: Period) => {
    setLoading(true);
    const res = await fetch(`/api/dashboard?period=${periodDays}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  const addToFlashcard = async (messageId: string) => {
    if (!data) return;
    if (data.totalFlashcards >= MAX_FREE_FLASHCARDS) {
      alert(`무료 플래시카드는 최대 ${MAX_FREE_FLASHCARDS}개까지 가능합니다.`);
      return;
    }

    setAddingId(messageId);
    const { error } = await supabase
      .from("flashcards")
      .insert({ message_id: messageId });

    if (error) {
      alert("추가에 실패했습니다.");
    } else {
      // 추천 목록에서 제거 + 카운트 업데이트
      setData((prev) =>
        prev
          ? {
              ...prev,
              totalFlashcards: prev.totalFlashcards + 1,
              recommendations: prev.recommendations.filter(
                (r) => r.id !== messageId
              ),
            }
          : prev
      );
    }
    setAddingId(null);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
        <Header title="학습 대시보드" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          로딩 중...
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(...Object.values(data.dailyActivity), 1);

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header title="학습 대시보드" showBack onBack={() => router.push("/")} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {data.totalConversations}
            </p>
            <p className="text-xs text-gray-400 mt-1">총 대화 세션</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {data.totalMessages}
            </p>
            <p className="text-xs text-gray-400 mt-1">총 번역 문장</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.currentPeriodCount}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              최근 {data.periodDays}일 번역{" "}
              {data.periodChange !== 0 && (
                <span
                  className={
                    data.periodChange > 0 ? "text-green-500" : "text-red-500"
                  }
                >
                  ({data.periodChange > 0 ? "+" : ""}
                  {data.periodChange}%)
                </span>
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
            <p className="text-sm font-bold text-yellow-600 mt-1">
              총 {data.totalFlashcards}개 카드중
            </p>
            <p className="text-sm font-bold text-yellow-600">
              {data.masteredFlashcards}개 암기 완료
            </p>
            <p className="text-xs text-gray-400 mt-1">플래시카드</p>
          </div>
        </div>

        {/* 언어별 통계 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            언어별 사용량
          </p>
          {Object.entries(data.langStats)
            .sort(([, a], [, b]) => b - a)
            .map(([lang, count]) => {
              const percentage = Math.round(
                (count / data.totalMessages) * 100
              );
              return (
                <div key={lang} className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      {LANG_LABELS[lang] || lang}
                    </span>
                    <span className="text-gray-400">
                      {count}개 ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div
                      className="h-2 bg-blue-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>

        {/* 일별 활동 차트 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              최근 {data.periodDays}일 활동
            </p>
            <div className="flex items-center bg-gray-100 rounded-full p-0.5">
              {([7, 14, 30] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    period === p
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500"
                  }`}
                >
                  {p}일
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end justify-between gap-0.5 h-24">
            {Object.entries(data.dailyActivity).map(([date, count]) => (
              <div key={date} className="flex-1 flex flex-col items-center min-w-0">
                <div
                  className="w-full bg-blue-400 rounded-t-sm transition-all"
                  style={{
                    height: `${Math.max((count / maxDaily) * 80, count > 0 ? 4 : 0)}px`,
                  }}
                />
                {data.periodDays <= 14 && (
                  <p className="text-[9px] text-gray-400 mt-1 truncate">{date}</p>
                )}
              </div>
            ))}
          </div>
          {data.periodDays > 14 && (
            <p className="text-[10px] text-gray-400 text-center mt-1">
              {Object.keys(data.dailyActivity)[0]} ~{" "}
              {Object.keys(data.dailyActivity)[Object.keys(data.dailyActivity).length - 1]}
            </p>
          )}
        </div>

        {/* 플래시카드 바로가기 */}
        {data.totalFlashcards > 0 && (
          <button
            onClick={() => router.push("/flashcards")}
            className="w-full bg-blue-500 text-white rounded-xl p-4 shadow-sm text-center active:bg-blue-600 transition-colors"
          >
            <p className="text-base font-medium">플래시카드 복습하기</p>
            <p className="text-xs text-blue-200 mt-1">
              {data.totalFlashcards}개 카드 | {data.masteredFlashcards}개 암기
            </p>
          </button>
        )}

        {/* 플래시카드 추천 */}
        {data.recommendations.length > 0 && (() => {
          const filteredRecs =
            recLangFilter === "all"
              ? data.recommendations.slice(0, 5)
              : data.recommendations
                  .filter((r) => r.direction.includes(recLangFilter))
                  .slice(0, 5);

          return (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">
                플래시카드 추천
              </p>
              <p className="text-xs text-gray-400 mb-3">
                자주 번역한 문장이에요. 플래시카드에 추가해보세요.
              </p>

              {/* 언어 필터 */}
              <div className="flex items-center bg-gray-100 rounded-full p-0.5 mb-3">
                {(
                  [
                    { value: "all", label: "모두" },
                    { value: "zh", label: "🇨🇳" },
                    { value: "ja", label: "🇯🇵" },
                    { value: "en", label: "🇺🇸" },
                  ] as const
                ).map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => setRecLangFilter(lang.value)}
                    className={`flex-1 py-1 rounded-full text-xs font-medium transition-colors ${
                      recLangFilter === lang.value
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {filteredRecs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  이 언어의 추천 문장이 없습니다
                </p>
              ) : (
                filteredRecs.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{rec.original_text}</p>
                      <p className="text-sm text-blue-600">{rec.translated_text}</p>
                      {rec.pronunciation && (
                        <p className="text-xs text-gray-400">{rec.pronunciation}</p>
                      )}
                      <p className="text-xs text-gray-300 mt-0.5">{rec.frequency}회 사용</p>
                    </div>
                    <button
                      onClick={() => addToFlashcard(rec.id)}
                      disabled={addingId === rec.id}
                      className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium active:bg-blue-100 transition-colors disabled:opacity-40"
                    >
                      {addingId === rec.id ? "..." : "+ 추가"}
                    </button>
                  </div>
                ))
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
