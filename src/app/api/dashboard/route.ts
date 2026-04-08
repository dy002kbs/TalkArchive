import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type MessageRow = {
  id: string;
  direction: string;
  created_at: string;
  original_text: string;
  translated_text: string;
  pronunciation: string;
};

type FlashcardRow = {
  message_id: string;
  mastered: boolean;
  enriched_data: {
    wordBreakdown?: { word: string; reading: string; meaning: string }[];
  } | null;
};

export async function GET(request: NextRequest) {
  // TODO: 로그인 추가 시 user_id 필터링 추가

  const { searchParams } = new URL(request.url);
  const periodDays = parseInt(searchParams.get("period") || "7", 10);
  const validPeriod = [7, 14, 30].includes(periodDays) ? periodDays : 7;

  // 모든 쿼리를 병렬로 실행 (단 3개 쿼리)
  const [convResult, messagesResult, flashcardsResult] = await Promise.all([
    // 1. 대화 수만 카운트
    supabase.from("conversations").select("*", { count: "exact", head: true }),

    // 2. 모든 메시지를 한 번에 가져오기 (필요한 모든 컬럼 포함)
    supabase
      .from("messages")
      .select("id, direction, created_at, original_text, translated_text, pronunciation")
      .order("created_at", { ascending: false }),

    // 3. 모든 플래시카드 한 번에 (direction은 message에서 join)
    supabase
      .from("flashcards")
      .select("message_id, mastered, enriched_data"),
  ]);

  const totalConversations = convResult.count || 0;
  const messages = (messagesResult.data || []) as MessageRow[];
  const flashcards = (flashcardsResult.data || []) as FlashcardRow[];

  const totalMessages = messages.length;
  const totalFlashcards = flashcards.length;
  const masteredFlashcards = flashcards.filter((f) => f.mastered).length;

  // 메시지 단일 순회로 모든 통계 계산
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

  // 메시지 ID → direction 맵 (단어 추천에서 사용)
  const messageDirectionMap = new Map<string, string>();

  messages.forEach((m) => {
    messageDirectionMap.set(m.id, m.direction);

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

  // 플래시카드 message_id 집합 (문장 추천 필터링용)
  const flashcardMessageIds = new Set(flashcards.map((f) => f.message_id));

  // 문장 추천: 빈도순
  const freqMap = new Map<
    string,
    { count: number; message: MessageRow }
  >();
  messages.forEach((m) => {
    if (flashcardMessageIds.has(m.id)) return;
    if (m.original_text.length < 2 || m.original_text.length > 30) return;
    const key = m.translated_text;
    const existing = freqMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      freqMap.set(key, { count: 1, message: m });
    }
  });

  const recommendations = Array.from(freqMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)
    .map((item) => ({
      id: item.message.id,
      original_text: item.message.original_text,
      translated_text: item.message.translated_text,
      direction: item.message.direction,
      pronunciation: item.message.pronunciation,
      frequency: item.count,
    }));

  // 단어 추천: wordBreakdown 빈도 집계
  type WordEntry = {
    word: string;
    reading: string;
    meaning: string;
    direction: string;
    count: number;
  };

  const wordFreqMap = new Map<string, WordEntry>();

  flashcards.forEach((fc) => {
    const enriched = fc.enriched_data;
    if (!enriched?.wordBreakdown) return;
    const direction = messageDirectionMap.get(fc.message_id) || "";

    enriched.wordBreakdown.forEach((w) => {
      const key = `${direction}::${w.word}`;
      const existing = wordFreqMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        wordFreqMap.set(key, {
          word: w.word,
          reading: w.reading,
          meaning: w.meaning,
          direction,
          count: 1,
        });
      }
    });
  });

  const wordRecommendations = Array.from(wordFreqMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  return NextResponse.json({
    totalConversations,
    totalMessages,
    langStats,
    periodDays: validPeriod,
    currentPeriodCount,
    periodChange,
    dailyActivity,
    totalFlashcards,
    masteredFlashcards,
    recommendations,
    wordRecommendations,
  });
}
