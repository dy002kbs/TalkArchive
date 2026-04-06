import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  // TODO: 로그인 추가 시 user_id 필터링 추가

  // 기간 파라미터 (기본 7일)
  const { searchParams } = new URL(request.url);
  const periodDays = parseInt(searchParams.get("period") || "7", 10);
  const validPeriod = [7, 14, 30].includes(periodDays) ? periodDays : 7;

  // 전체 대화 수
  const { count: totalConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true });

  // 전체 메시지 수
  const { count: totalMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true });

  // 언어별 메시지 수
  const { data: messages } = await supabase
    .from("messages")
    .select("direction, created_at");

  const langStats: Record<string, number> = {};
  const now = new Date();
  const periodStart = new Date(now.getTime() - validPeriod * 24 * 60 * 60 * 1000);
  const prevPeriodStart = new Date(
    now.getTime() - validPeriod * 2 * 24 * 60 * 60 * 1000
  );
  let currentPeriodCount = 0;
  let prevPeriodCount = 0;

  // 일별 활동 (선택 기간)
  const dailyActivity: Record<string, number> = {};
  for (let i = validPeriod - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyActivity[key] = 0;
  }

  (messages || []).forEach((m) => {
    // 언어별 집계
    const lang = m.direction.includes("zh")
      ? "zh"
      : m.direction.includes("ja")
        ? "ja"
        : "en";
    langStats[lang] = (langStats[lang] || 0) + 1;

    // 기간 비교
    const created = new Date(m.created_at);
    if (created >= periodStart) currentPeriodCount++;
    if (created >= prevPeriodStart && created < periodStart) prevPeriodCount++;

    // 일별 활동
    if (created >= periodStart) {
      const key = `${created.getMonth() + 1}/${created.getDate()}`;
      if (dailyActivity[key] !== undefined) {
        dailyActivity[key]++;
      }
    }
  });

  // 변화율
  const periodChange =
    prevPeriodCount > 0
      ? Math.round(((currentPeriodCount - prevPeriodCount) / prevPeriodCount) * 100)
      : currentPeriodCount > 0
        ? 100
        : 0;

  // 플래시카드 통계
  const { count: totalFlashcards } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true });

  const { count: masteredFlashcards } = await supabase
    .from("flashcards")
    .select("*", { count: "exact", head: true })
    .eq("mastered", true);

  // 번역 빈도 기반 추천
  const { data: allMessages } = await supabase
    .from("messages")
    .select("id, original_text, translated_text, direction, pronunciation");

  const { data: existingFlashcards } = await supabase
    .from("flashcards")
    .select("message_id");

  const flashcardMessageIds = new Set(
    (existingFlashcards || []).map((f) => f.message_id)
  );

  const freqMap = new Map<
    string,
    { count: number; message: typeof allMessages extends (infer T)[] | null ? T : never }
  >();
  (allMessages || []).forEach((m) => {
    if (flashcardMessageIds.has(m.id)) return;
    if (m.original_text.length < 2 || m.original_text.length > 30) return;
    const key = m.translated_text;
    const existing = freqMap.get(key);
    if (!existing || existing.count < 1) {
      freqMap.set(key, { count: (existing?.count || 0) + 1, message: m });
    } else {
      freqMap.set(key, { count: existing.count + 1, message: existing.message });
    }
  });

  const recommendations = Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map((item) => ({
      ...item.message,
      frequency: item.count,
    }));

  return NextResponse.json({
    totalConversations: totalConversations || 0,
    totalMessages: totalMessages || 0,
    langStats,
    periodDays: validPeriod,
    currentPeriodCount,
    periodChange,
    dailyActivity,
    totalFlashcards: totalFlashcards || 0,
    masteredFlashcards: masteredFlashcards || 0,
    recommendations,
  });
}
