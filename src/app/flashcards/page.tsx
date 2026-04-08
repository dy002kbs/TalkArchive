"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import FlashcardDetailModal from "@/components/FlashcardDetailModal";

interface EnrichedData {
  natural?: string;
  naturalPronunciation?: string;
  wordBreakdown?: { word: string; reading: string; meaning: string }[];
  nuance?: string;
  example?: { text: string; reading?: string; translation: string };
  alternatives?: { text: string; reading?: string; note: string }[];
  related?: { text: string; reading?: string; meaning: string }[];
}

interface Flashcard {
  id: string;
  message_id: string;
  mastered: boolean;
  direction: string;
  original_text: string;
  translated_text: string;
  pronunciation: string;
  pinyin_text: string;
  conversation_title: string;
  enriched_data: EnrichedData | null;
}

const MAX_FREE_FLASHCARDS = 20;

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [langFilter, setLangFilter] = useState<"all" | "zh" | "ja" | "en">("all");
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    const { data, error } = await supabase
      .from("flashcards")
      .select(`
        id, message_id, mastered, enriched_data,
        messages!inner(
          direction, original_text, translated_text, pronunciation, pinyin_text,
          conversations!inner(title)
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const mapped = (data || []).map((fc) => {
      const msg = fc.messages as unknown as {
        direction: string;
        original_text: string;
        translated_text: string;
        pronunciation: string;
        pinyin_text: string;
        conversations: { title: string };
      };
      return {
        id: fc.id,
        message_id: fc.message_id,
        mastered: fc.mastered,
        direction: msg.direction,
        original_text: msg.original_text,
        translated_text: msg.translated_text,
        pronunciation: msg.pronunciation,
        pinyin_text: msg.pinyin_text,
        conversation_title: msg.conversations.title,
        enriched_data: (fc as { enriched_data?: EnrichedData | null }).enriched_data || null,
      };
    });

    setCards(mapped);
    setLoading(false);
  };

  const toggleMasteredById = async (cardId: string) => {
    const target = cards.find((c) => c.id === cardId);
    if (!target) return;
    const newMastered = !target.mastered;
    await supabase
      .from("flashcards")
      .update({ mastered: newMastered })
      .eq("id", cardId);

    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, mastered: newMastered } : c
      )
    );
  };

  const deleteCardById = async (cardId: string) => {
    await supabase.from("flashcards").delete().eq("id", cardId);
    const newCards = cards.filter((c) => c.id !== cardId);
    setCards(newCards);
    if (currentIndex >= newCards.length && newCards.length > 0) {
      setCurrentIndex(newCards.length - 1);
    }
    setIsFlipped(false);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : filteredCards.length - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < filteredCards.length - 1 ? prev + 1 : 0));
  };

  const filteredCards = langFilter === "all"
    ? cards
    : cards.filter((c) => c.direction.includes(langFilter));

  const handleLangFilter = (lang: "all" | "zh" | "ja" | "en") => {
    setLangFilter(lang);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
        <Header title="플래시카드" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          로딩 중...
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
        <Header title="플래시카드" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
          <p>저장된 플래시카드가 없습니다</p>
          <p className="text-xs">대화 기록에서 문장을 탭하면 추가됩니다</p>
        </div>
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, Math.max(filteredCards.length - 1, 0));
  const card = filteredCards[safeIndex];
  const isKoSource = card?.direction.startsWith("ko");

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header title="플래시카드" showBack onBack={() => router.push("/")} />

      {/* 언어 필터 + 모드 전환 */}
      <div className="px-4 pt-3 space-y-2">
        <div className="flex items-center bg-gray-100 rounded-full p-0.5">
          {(
            [
              { value: "all", label: "전체" },
              { value: "zh", label: "🇨🇳 중국어" },
              { value: "ja", label: "🇯🇵 일본어" },
              { value: "en", label: "🇺🇸 영어" },
            ] as const
          ).map((lang) => (
            <button
              key={lang.value}
              onClick={() => handleLangFilter(lang.value)}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${
                langFilter === lang.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center bg-gray-100 rounded-full p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${
                viewMode === "card"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              카드
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-1 rounded-full text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              목록
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {filteredCards.length}개 / 최대 {MAX_FREE_FLASHCARDS}개
            {langFilter !== "all" && ` (전체 ${cards.length})`}
          </p>
        </div>
      </div>

      {viewMode === "card" ? (
        /* 카드 모드 */
        <div className="flex-1 flex flex-col items-center justify-center px-6 page-safe-bottom">
          {!card ? (
            <p className="text-sm text-gray-400">이 언어의 카드가 없습니다</p>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-4">
                {safeIndex + 1} / {filteredCards.length}
              </p>

              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className={`w-full relative rounded-2xl shadow-md border p-8 min-h-[200px] flex flex-col items-center justify-center cursor-pointer active:shadow-lg transition-shadow ${
                  card.mastered
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-white border-gray-100"
                }`}
              >
                {isFlipped && card.enriched_data && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailCard(card);
                    }}
                    className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium active:bg-blue-100 transition-colors"
                  >
                    📖 상세
                  </button>
                )}
                {!isFlipped ? (
                  <>
                    <p className="text-xl text-gray-900 text-center font-medium">
                      {isKoSource ? card.original_text : card.translated_text}
                    </p>
                    <p className="text-sm text-gray-400 mt-6">탭해서 뒤집기</p>
                  </>
                ) : (
                  <div className="w-full">
                    {card.enriched_data?.natural ? (
                      <>
                        <p className="text-xs text-gray-400 text-center mb-1">✨ AI 추천 표현</p>
                        <p className="text-lg text-blue-600 text-center font-medium">
                          {card.enriched_data.natural}
                        </p>
                        {card.enriched_data.naturalPronunciation && (
                          <p className="text-sm text-gray-500 mt-1 text-center">
                            {card.enriched_data.naturalPronunciation}
                          </p>
                        )}
                        {card.enriched_data.wordBreakdown && card.enriched_data.wordBreakdown.length > 0 && (
                          <div className="mt-3 px-2 text-left">
                            <p className="text-[10px] text-gray-400 mb-1">📝 단어</p>
                            {card.enriched_data.wordBreakdown.map((w, i) => (
                              <p key={i} className="text-xs text-gray-600">
                                <span className="font-medium">{w.word}</span>
                                {w.reading && <span className="text-gray-400"> ({w.reading})</span>}
                                <span className="text-gray-500"> — {w.meaning}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {card.enriched_data.nuance && (
                          <div className="mt-3 px-2 text-left">
                            <p className="text-[10px] text-gray-400 mb-1">💡 뉘앙스</p>
                            <p className="text-xs text-gray-500">
                              {card.enriched_data.nuance}
                            </p>
                          </div>
                        )}
                        {card.enriched_data.example?.text && (
                          <div className="mt-3 px-2 text-left">
                            <p className="text-[10px] text-gray-400 mb-0.5">📖 예문</p>
                            <p className="text-xs text-gray-700">{card.enriched_data.example.text}</p>
                            {card.enriched_data.example.reading && (
                              <p className="text-xs text-gray-400">{card.enriched_data.example.reading}</p>
                            )}
                            <p className="text-xs text-gray-500">{card.enriched_data.example.translation}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-xl text-blue-600 text-center font-medium">
                          {isKoSource ? card.translated_text : card.original_text}
                        </p>
                        {card.pronunciation && (
                          <p className="text-base text-gray-500 mt-2 text-center">
                            {card.pronunciation}
                          </p>
                        )}
                        {card.pinyin_text && (
                          <p className="text-sm text-gray-400 mt-1 text-center italic">
                            {card.pinyin_text}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-4">
                📍 {card.conversation_title}
              </p>
              {card.mastered && (
                <p className="text-xs text-yellow-600 mt-1">⭐ 암기 완료</p>
              )}

              <div className="flex items-center gap-6 mt-8">
                <button
                  onClick={handlePrev}
                  className="px-5 py-2.5 rounded-full bg-gray-200 text-gray-600 text-sm font-medium active:bg-gray-300 transition-colors"
                >
                  ◀ 이전
                </button>
                <button
                  onClick={() => toggleMasteredById(card.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    card.mastered
                      ? "bg-yellow-200 text-yellow-800 active:bg-yellow-300"
                      : "bg-yellow-100 text-yellow-700 active:bg-yellow-200"
                  }`}
                >
                  ⭐
                </button>
                <button
                  onClick={() => deleteCardById(card.id)}
                  className="px-4 py-2.5 rounded-full bg-red-50 text-red-500 text-sm font-medium active:bg-red-100 transition-colors"
                >
                  🗑️
                </button>
                <button
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-full bg-gray-200 text-gray-600 text-sm font-medium active:bg-gray-300 transition-colors"
                >
                  다음 ▶
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        /* 목록 모드 */
        <div className="flex-1 overflow-y-auto px-4 py-2 page-safe-bottom">
          {filteredCards.length === 0 && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              이 언어의 카드가 없습니다
            </div>
          )}
          {filteredCards.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 p-3 mb-2 rounded-xl border shadow-sm ${
                c.mastered
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-white border-gray-100"
              }`}
            >
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  {c.mastered && "⭐ "}
                  {c.original_text}
                </p>
                <p className="text-sm text-blue-600">{c.translated_text}</p>
                {c.pronunciation && (
                  <p className="text-xs text-gray-400">{c.pronunciation}</p>
                )}
                <p className="text-xs text-gray-300 mt-0.5">
                  📍 {c.conversation_title}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {c.enriched_data && (
                  <button
                    onClick={() => setDetailCard(c)}
                    className="p-1.5 rounded-full bg-blue-50 text-blue-600 active:bg-blue-100 transition-colors text-xs"
                  >
                    📖
                  </button>
                )}
                <button
                  onClick={() => toggleMasteredById(c.id)}
                  className={`p-1.5 rounded-full text-xs transition-colors ${
                    c.mastered
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  ⭐
                </button>
                <button
                  onClick={() => deleteCardById(c.id)}
                  className="p-1.5 rounded-full bg-gray-100 text-gray-400 active:bg-red-100 active:text-red-500 transition-colors text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailCard && detailCard.enriched_data && (
        <FlashcardDetailModal
          originalText={detailCard.original_text}
          translatedText={detailCard.translated_text}
          pronunciation={detailCard.pronunciation}
          enriched={detailCard.enriched_data}
          onClose={() => setDetailCard(null)}
        />
      )}
    </div>
  );
}
