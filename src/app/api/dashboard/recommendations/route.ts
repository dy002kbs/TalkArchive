import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type MessageRow = {
  id: string;
  direction: string;
  original_text: string;
  translated_text: string;
  pronunciation: string;
};

type FlashcardRow = {
  message_id: string;
  enriched_data: {
    wordBreakdown?: { word: string; reading: string; meaning: string }[];
  } | null;
};

export async function GET() {
  // 추천만 가져오기 — 최근 데이터 위주, limit 적용
  const [messagesResult, flashcardsResult] = await Promise.all([
    supabase
      .from("messages")
      .select("id, direction, original_text, translated_text, pronunciation")
      .order("created_at", { ascending: false })
      .limit(150),
    supabase.from("flashcards").select("message_id, enriched_data").limit(100),
  ]);

  const messages = (messagesResult.data || []) as MessageRow[];
  const flashcards = (flashcardsResult.data || []) as FlashcardRow[];

  // message_id → direction 맵 (단어 추천에서 사용)
  const messageDirectionMap = new Map<string, string>();
  messages.forEach((m) => messageDirectionMap.set(m.id, m.direction));

  // 플래시카드 message_id 집합 (필터링용)
  const flashcardMessageIds = new Set(flashcards.map((f) => f.message_id));

  // 문장 추천: 빈도순
  const freqMap = new Map<string, { count: number; message: MessageRow }>();
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

  return NextResponse.json(
    { recommendations, wordRecommendations },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
