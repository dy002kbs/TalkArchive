"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

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
}

const MAX_FREE_FLASHCARDS = 20;

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  useEffect(() => {
    loadFlashcards();
  }, []);

  const loadFlashcards = async () => {
    const { data, error } = await supabase
      .from("flashcards")
      .select(`
        id, message_id, mastered,
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
      };
    });

    setCards(mapped);
    setLoading(false);
  };

  const toggleMastered = async (index: number) => {
    const card = cards[index];
    const newMastered = !card.mastered;
    await supabase
      .from("flashcards")
      .update({ mastered: newMastered })
      .eq("id", card.id);

    setCards((prev) =>
      prev.map((c, i) =>
        i === index ? { ...c, mastered: newMastered } : c
      )
    );
  };

  const deleteCard = async (index: number) => {
    const card = cards[index];
    await supabase.from("flashcards").delete().eq("id", card.id);
    const newCards = cards.filter((_, i) => i !== index);
    setCards(newCards);
    if (currentIndex >= newCards.length && newCards.length > 0) {
      setCurrentIndex(newCards.length - 1);
    }
    setIsFlipped(false);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : cards.length - 1));
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < cards.length - 1 ? prev + 1 : 0));
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

  const card = cards[currentIndex];
  const isKoSource = card.direction.startsWith("ko");

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header title="플래시카드" showBack onBack={() => router.push("/")} />

      {/* 모드 전환 탭 */}
      <div className="px-4 pt-3">
        <div className="flex items-center bg-gray-100 rounded-full p-0.5">
          <button
            onClick={() => setViewMode("card")}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === "card"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            카드 모드
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex-1 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500"
            }`}
          >
            목록 모드
          </button>
        </div>
        <p className="text-xs text-gray-400 text-right mt-1">
          {cards.length}/{MAX_FREE_FLASHCARDS}개 사용
        </p>
      </div>

      {viewMode === "card" ? (
        /* 카드 모드 */
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="text-sm text-gray-400 mb-4">
            {currentIndex + 1} / {cards.length}
          </p>

          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`w-full rounded-2xl shadow-md border p-8 min-h-[200px] flex flex-col items-center justify-center cursor-pointer active:shadow-lg transition-shadow ${
              card.mastered
                ? "bg-yellow-50 border-yellow-200"
                : "bg-white border-gray-100"
            }`}
          >
            {!isFlipped ? (
              <>
                <p className="text-xl text-gray-900 text-center font-medium">
                  {isKoSource ? card.original_text : card.translated_text}
                </p>
                <p className="text-sm text-gray-400 mt-6">탭해서 뒤집기</p>
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

          <p className="text-xs text-gray-400 mt-4">
            📍 {card.conversation_title}
          </p>
          {card.mastered && (
            <p className="text-xs text-yellow-600 mt-1">⭐ 마스터 완료</p>
          )}

          <div className="flex items-center gap-6 mt-8">
            <button
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-full bg-gray-200 text-gray-600 text-sm font-medium active:bg-gray-300 transition-colors"
            >
              ◀ 이전
            </button>
            <button
              onClick={() => toggleMastered(currentIndex)}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                card.mastered
                  ? "bg-yellow-200 text-yellow-800 active:bg-yellow-300"
                  : "bg-yellow-100 text-yellow-700 active:bg-yellow-200"
              }`}
            >
              ⭐
            </button>
            <button
              onClick={() => deleteCard(currentIndex)}
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
        </div>
      ) : (
        /* 목록 모드 */
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cards.map((c, i) => (
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
                <button
                  onClick={() => toggleMastered(i)}
                  className={`p-1.5 rounded-full text-xs transition-colors ${
                    c.mastered
                      ? "bg-yellow-200 text-yellow-800"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  ⭐
                </button>
                <button
                  onClick={() => deleteCard(i)}
                  className="p-1.5 rounded-full bg-gray-100 text-gray-400 active:bg-red-100 active:text-red-500 transition-colors text-xs"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
