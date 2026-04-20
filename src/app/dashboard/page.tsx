"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import AddFlashcardModal from "@/components/AddFlashcardModal";
import { EnrichedData } from "@/components/EnrichModal";

interface WordRecommendation {
  word: string;
  reading: string;
  meaning: string;
  direction: string;
  count: number;
}

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
  wordRecommendations: WordRecommendation[];
}

type Period = 7 | 14 | 30;
// zh는 UI 숨김 — 필터/라벨에서 제외 (데이터는 유지)
type RecLangFilter = "all" | "ja" | "en";

const LANG_LABELS: Record<string, string> = {
  zh: "🇨🇳 중국어",
  ja: "🇯🇵 일본어",
  en: "🇺🇸 영어",
};

const LANG_COLORS: Record<string, string> = {
  zh: "var(--c-indigo)",
  ja: "var(--c-teal)",
  en: "oklch(56% 0.17 85)",
};

const MAX_FREE_FLASHCARDS = 20;

function StatCard({ value, label, sub, color }: { value: string; label: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow-sm)" }}>
      <p className="text-[28px] font-bold leading-none" style={{ color: color ?? "var(--c-text)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1 font-medium" style={{ color: "oklch(56% 0.17 145)" }}>{sub}</p>
      )}
      <p className="text-xs mt-2" style={{ color: "var(--c-muted)" }}>{label}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recLoading, setRecLoading] = useState(true);
  const [enrichTarget, setEnrichTarget] = useState<DashboardData["recommendations"][number] | null>(null);
  const [recLangFilter, setRecLangFilter] = useState<RecLangFilter>("all");
  const [period, setPeriod] = useState<Period>(7);
  const [recType, setRecType] = useState<"sentence" | "word">("sentence");

  useEffect(() => { loadStats(period); }, [period]);
  useEffect(() => { loadRecommendations(); }, []);

  const loadStats = async (periodDays: Period) => {
    const cacheKey = `dashboard_stats_${periodDays}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setData((prev) => ({ ...(prev || {} as DashboardData), ...JSON.parse(cached) }));
        setLoading(false);
      } else {
        setLoading(true);
      }
    } catch { setLoading(true); }

    try {
      const res = await fetch(`/api/dashboard/stats?period=${periodDays}`);
      const json = await res.json();
      setData((prev) => ({ ...(prev || {} as DashboardData), ...json }));
      setLoading(false);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(json)); } catch {}
    } catch { setLoading(false); }
  };

  const loadRecommendations = async () => {
    const cacheKey = "dashboard_recommendations";
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setData((prev) => ({ ...(prev || {} as DashboardData), ...JSON.parse(cached) }));
        setRecLoading(false);
      }
    } catch {}
    try {
      const res = await fetch("/api/dashboard/recommendations");
      const json = await res.json();
      setData((prev) => ({ ...(prev || {} as DashboardData), ...json }));
      setRecLoading(false);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(json)); } catch {}
    } catch { setRecLoading(false); }
  };

  const startAddToFlashcard = (rec: DashboardData["recommendations"][number]) => {
    if (!data) return;
    if (data.totalFlashcards >= MAX_FREE_FLASHCARDS) {
      alert(`무료 플래시카드는 최대 ${MAX_FREE_FLASHCARDS}개까지 가능합니다.`);
      return;
    }
    setEnrichTarget(rec);
  };

  const startAddWord = async (w: WordRecommendation) => {
    if (!data) return;
    if (data.totalFlashcards >= MAX_FREE_FLASHCARDS) {
      alert(`무료 플래시카드는 최대 ${MAX_FREE_FLASHCARDS}개까지 가능합니다.`);
      return;
    }
    let conversationId: string;
    const { data: existingConv } = await supabase
      .from("conversations").select("id").eq("title", "단어장").maybeSingle();
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: convErr } = await supabase
        .from("conversations").insert({ title: "단어장" }).select("id").single();
      if (convErr || !newConv) { alert("단어 추가에 실패했습니다."); return; }
      conversationId = newConv.id;
    }
    const { data: newMsg, error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        direction: w.direction,
        original_text: w.meaning,
        translated_text: w.word,
        pronunciation: w.reading,
        pinyin_text: "",
      })
      .select("id, original_text, translated_text, direction, pronunciation")
      .single();
    if (msgErr || !newMsg) { alert("단어 추가에 실패했습니다."); return; }
    setEnrichTarget({
      id: newMsg.id,
      original_text: newMsg.original_text,
      translated_text: newMsg.translated_text,
      direction: newMsg.direction,
      pronunciation: newMsg.pronunciation,
      frequency: w.count,
    });
  };

  const saveFlashcard = async (enriched: EnrichedData | null) => {
    if (!enrichTarget) return;
    const { error } = await supabase.from("flashcards").insert({
      message_id: enrichTarget.id,
      enriched_data: enriched,
    });
    if (error) { alert("추가에 실패했습니다."); return; }
    setData((prev) => prev ? {
      ...prev,
      totalFlashcards: prev.totalFlashcards + 1,
      recommendations: prev.recommendations.filter((r) => r.id !== enrichTarget.id),
    } : prev);
    setEnrichTarget(null);
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
        <Header title="대시보드" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--c-subtle)" }}>
          로딩 중...
        </div>
        <BottomNav />
      </div>
    );
  }

  const maxDaily = Math.max(...Object.values(data.dailyActivity), 1);

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
      <Header title="대시보드" showBack onBack={() => router.push("/")} />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 page-safe-bottom">
        {/* 통계 카드 — 2×2 그리드 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard value={String(data.totalConversations)} label="대화 세션" />
          <StatCard value={String(data.totalMessages)} label="번역 문장" />
          <StatCard
            value={String(data.currentPeriodCount)}
            label={`최근 ${data.periodDays}일`}
            color="var(--c-indigo)"
            sub={data.periodChange !== 0
              ? `${data.periodChange > 0 ? "+" : ""}${data.periodChange}%`
              : undefined}
          />
          <StatCard
            value={`${data.masteredFlashcards}/${data.totalFlashcards}`}
            label="플래시카드 암기"
            color="oklch(56% 0.17 85)"
          />
        </div>

        {/* 활동 차트 */}
        <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow-sm)" }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>
              최근 {data.periodDays}일 활동
            </p>
            <div className="flex rounded-xl p-0.5" style={{ background: "var(--c-bg)" }}>
              {([7, 14, 30] as Period[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-3 py-1 rounded-[10px] text-xs font-medium transition-colors"
                  style={{
                    background: period === p ? "var(--c-surface)" : "transparent",
                    color: period === p ? "var(--c-text)" : "var(--c-subtle)",
                    boxShadow: period === p ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}>
                  {p}일
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-1" style={{ height: 80 }}>
            {Object.entries(data.dailyActivity).map(([date, count]) => {
              const isHighest = count === maxDaily && count > 0;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max((count / maxDaily) * 64, count > 0 ? 4 : 0)}px`,
                      background: isHighest ? "var(--c-indigo)" : "var(--c-indigo-l)",
                    }}
                  />
                  {data.periodDays <= 14 && (
                    <p className="text-[9px] truncate" style={{ color: "var(--c-subtle)" }}>
                      {date.slice(-2)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {data.periodDays > 14 && (
            <p className="text-[10px] text-center mt-2" style={{ color: "var(--c-subtle)" }}>
              {Object.keys(data.dailyActivity)[0]} ~ {Object.keys(data.dailyActivity).at(-1)}
            </p>
          )}
        </div>

        {/* 언어별 사용량 — zh 데이터는 있어도 표시 */}
        <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow-sm)" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--c-text)" }}>언어별 사용량</p>
          {Object.entries(data.langStats)
            .filter(([lang]) => lang !== "zh")
            .sort(([, a], [, b]) => b - a)
            .map(([lang, count]) => {
              const pct = Math.round((count / data.totalMessages) * 100);
              return (
                <div key={lang} className="mb-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span style={{ color: "var(--c-text)" }}>{LANG_LABELS[lang] || lang}</span>
                    <span style={{ color: "var(--c-muted)" }}>{count}개 ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--c-bg)" }}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: LANG_COLORS[lang] ?? "var(--c-indigo)" }} />
                  </div>
                </div>
              );
            })}
        </div>

        {/* 플래시카드 바로가기 */}
        {data.totalFlashcards > 0 && (
          <button
            onClick={() => router.push("/flashcards")}
            className="w-full rounded-2xl p-4 flex items-center justify-between active:opacity-80 transition-opacity"
            style={{ background: "var(--c-indigo)" }}
          >
            <div className="text-left">
              <p className="text-sm font-semibold text-white">플래시카드 복습하기</p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                {data.totalFlashcards}개 카드 · {data.masteredFlashcards}개 암기 완료
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </div>
          </button>
        )}

        {/* 플래시카드 추천 */}
        <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow-sm)" }}>
          <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--c-text)" }}>플래시카드 추천</p>
          <p className="text-xs mb-3" style={{ color: "var(--c-subtle)" }}>
            {recType === "sentence"
              ? "자주 번역한 문장이에요."
              : "AI 카드에서 자주 등장한 단어예요."}
          </p>

          {/* 문장/단어 토글 */}
          <div className="flex rounded-xl p-0.5 mb-2" style={{ background: "var(--c-bg)" }}>
            {(["sentence", "word"] as const).map((t) => (
              <button key={t} onClick={() => setRecType(t)}
                className="flex-1 py-1.5 rounded-[10px] text-xs font-medium transition-colors"
                style={{
                  background: recType === t ? "var(--c-surface)" : "transparent",
                  color: recType === t ? "var(--c-text)" : "var(--c-muted)",
                  boxShadow: recType === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}>
                {t === "sentence" ? "문장" : "단어"}
              </button>
            ))}
          </div>

          {/* 언어 필터 — zh 제외 */}
          <div className="flex rounded-xl p-0.5 mb-3" style={{ background: "var(--c-bg)" }}>
            {(["all","ja","en"] as const).map((l) => (
              <button key={l} onClick={() => setRecLangFilter(l)}
                className="flex-1 py-1.5 rounded-[10px] text-xs font-medium transition-colors"
                style={{
                  background: recLangFilter === l ? "var(--c-surface)" : "transparent",
                  color: recLangFilter === l ? "var(--c-text)" : "var(--c-muted)",
                  boxShadow: recLangFilter === l ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                }}>
                {l === "all" ? "모두" : l === "ja" ? "🇯🇵" : "🇺🇸"}
              </button>
            ))}
          </div>

          {/* 추천 목록 */}
          {recLoading && !data.recommendations ? (
            <div className="space-y-2 py-2">
              {[1,2,3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 rounded animate-pulse w-3/4" style={{ background: "var(--c-bg)" }} />
                    <div className="h-3 rounded animate-pulse w-1/2" style={{ background: "var(--c-bg)" }} />
                  </div>
                  <div className="h-7 w-14 rounded-xl animate-pulse" style={{ background: "var(--c-bg)" }} />
                </div>
              ))}
            </div>
          ) : recType === "sentence" ? (
            (() => {
              const recs = data.recommendations || [];
              // zh 카드는 항상 숨김
              const base = recs.filter((r) => !r.direction.includes("zh"));
              const filtered = recLangFilter === "all"
                ? base.slice(0, 10)
                : base.filter((r) => r.direction.includes(recLangFilter)).slice(0, 10);
              if (filtered.length === 0)
                return <p className="text-sm text-center py-4" style={{ color: "var(--c-subtle)" }}>이 언어의 추천 문장이 없습니다</p>;
              return filtered.map((rec) => (
                <div key={rec.id} className="flex items-center gap-3 py-2.5"
                  style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <div className="flex-1">
                    <p className="text-sm" style={{ color: "var(--c-text)" }}>{rec.original_text}</p>
                    <p className="text-sm" style={{ color: "var(--c-teal)" }}>{rec.translated_text}</p>
                    {rec.pronunciation && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--c-subtle)" }}>{rec.pronunciation}</p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: "var(--c-subtle)" }}>{rec.frequency}회 사용</p>
                  </div>
                  <button onClick={() => startAddToFlashcard(rec)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors active:opacity-70 shrink-0"
                    style={{ background: "var(--c-indigo-l)", color: "var(--c-indigo)" }}>
                    + 추가
                  </button>
                </div>
              ));
            })()
          ) : (
            (() => {
              const words = data.wordRecommendations || [];
              const base = words.filter((w) => !w.direction.includes("zh"));
              const filtered = recLangFilter === "all"
                ? base.slice(0, 10)
                : base.filter((w) => w.direction.includes(recLangFilter)).slice(0, 10);
              if (filtered.length === 0)
                return <p className="text-sm text-center py-4" style={{ color: "var(--c-subtle)" }}>AI 카드를 추가하면 단어 추천이 나타나요</p>;
              return filtered.map((w, i) => (
                <div key={`${w.direction}::${w.word}::${i}`} className="flex items-center gap-3 py-2.5"
                  style={{ borderBottom: "1px solid var(--c-border)" }}>
                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: "var(--c-text)" }}>{w.word}</p>
                    {w.reading && <p className="text-xs" style={{ color: "var(--c-muted)" }}>{w.reading}</p>}
                    <p className="text-xs" style={{ color: "var(--c-muted)" }}>{w.meaning}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--c-subtle)" }}>{w.count}개 카드에 등장</p>
                  </div>
                  <button onClick={() => startAddWord(w)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors active:opacity-70 shrink-0"
                    style={{ background: "var(--c-indigo-l)", color: "var(--c-indigo)" }}>
                    + 추가
                  </button>
                </div>
              ));
            })()
          )}
        </div>
      </div>

      <BottomNav />

      {enrichTarget && (
        <AddFlashcardModal
          originalText={enrichTarget.original_text}
          translatedText={enrichTarget.translated_text}
          pronunciation={enrichTarget.pronunciation}
          direction={enrichTarget.direction}
          onClose={() => setEnrichTarget(null)}
          onSave={saveFlashcard}
        />
      )}
    </div>
  );
}
