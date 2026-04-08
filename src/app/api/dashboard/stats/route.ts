import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LightMessage = { direction: string; created_at: string };

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const periodDays = parseInt(searchParams.get("period") || "7", 10);
  const validPeriod = [7, 14, 30].includes(periodDays) ? periodDays : 7;

  // 통계용 쿼리 — 가벼운 컬럼만, 모두 병렬
  const [convResult, messagesResult, totalFcResult, masteredFcResult] =
    await Promise.all([
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      // 통계만 필요하니 direction + created_at만
      supabase
        .from("messages")
        .select("direction, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("flashcards").select("*", { count: "exact", head: true }),
      supabase
        .from("flashcards")
        .select("*", { count: "exact", head: true })
        .eq("mastered", true),
    ]);

  const totalConversations = convResult.count || 0;
  const messages = (messagesResult.data || []) as LightMessage[];
  const totalMessages = messages.length;
  const totalFlashcards = totalFcResult.count || 0;
  const masteredFlashcards = masteredFcResult.count || 0;

  // 통계 집계
  const langStats: Record<string, number> = {};
  const now = new Date();
  const periodStart = new Date(now.getTime() - validPeriod * 24 * 60 * 60 * 1000);
  const prevPeriodStart = new Date(
    now.getTime() - validPeriod * 2 * 24 * 60 * 60 * 1000
  );
  let currentPeriodCount = 0;
  let prevPeriodCount = 0;

  const dailyActivity: Record<string, number> = {};
  for (let i = validPeriod - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyActivity[key] = 0;
  }

  messages.forEach((m) => {
    const lang = m.direction.includes("zh")
      ? "zh"
      : m.direction.includes("ja")
        ? "ja"
        : "en";
    langStats[lang] = (langStats[lang] || 0) + 1;

    const created = new Date(m.created_at);
    if (created >= periodStart) currentPeriodCount++;
    if (created >= prevPeriodStart && created < periodStart) prevPeriodCount++;

    if (created >= periodStart) {
      const key = `${created.getMonth() + 1}/${created.getDate()}`;
      if (dailyActivity[key] !== undefined) {
        dailyActivity[key]++;
      }
    }
  });

  const periodChange =
    prevPeriodCount > 0
      ? Math.round(((currentPeriodCount - prevPeriodCount) / prevPeriodCount) * 100)
      : currentPeriodCount > 0
        ? 100
        : 0;

  return NextResponse.json(
    {
      totalConversations,
      totalMessages,
      langStats,
      periodDays: validPeriod,
      currentPeriodCount,
      periodChange,
      dailyActivity,
      totalFlashcards,
      masteredFlashcards,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
