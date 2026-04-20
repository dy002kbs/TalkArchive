"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
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
// zh는 UI 숨김 (기존 zh 카드 데이터는 "전체"에는 포함되지 않고, 별도 필터도 없음)
type LangFilter = "all" | "ja" | "en";

export default function FlashcardsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [langFilter, setLangFilter] = useState<LangFilter>("all");
  const [detailCard, setDetailCard] = useState<Flashcard | null>(null);

  useEffect(() => { loadFlashcards(); }, []);

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

    if (error) { console.error(error); setLoading(false); return; }

    const mapped = (data || []).map((fc) => {
      const msg = fc.messages as unknown as {
        direction: string; original_text: string; translated_text: string;
        pronunciation: string; pinyin_text: string; conversations: { title: string };
      };
      return {
        id: fc.id, message_id: fc.message_id, mastered: fc.mastered,
        direction: msg.direction, original_text: msg.original_text,
        translated_text: msg.translated_text, pronunciation: msg.pronunciation,
        pinyin_text: msg.pinyin_text, conversation_title: msg.conversations.title,
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
    await supabase.from("flashcards").update({ mastered: newMastered }).eq("id", cardId);
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, mastered: newMastered } : c));
  };

  const deleteCardById = async (cardId: string) => {
    await supabase.from("flashcards").delete().eq("id", cardId);
    const newCards = cards.filter((c) => c.id !== cardId);
    setCards(newCards);
    if (currentIndex >= newCards.length && newCards.length > 0)
      setCurrentIndex(newCards.length - 1);
    setIsFlipped(false);
  };

  // zh 카드는 항상 숨김 (데이터는 보존)
  const visibleCards = cards.filter((c) => !c.direction.includes("zh"));
  const filteredCards = langFilter === "all"
    ? visibleCards
    : visibleCards.filter((c) => c.direction.includes(langFilter));

  const handleLangFilter = (lang: LangFilter) => {
    setLangFilter(lang);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => prev > 0 ? prev - 1 : filteredCards.length - 1);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => prev < filteredCards.length - 1 ? prev + 1 : 0);
  };

  const FilterBar = () => (
    <div className="bg-white px-4 pt-3 pb-3 space-y-2" style={{ borderBottom: "1px solid var(--c-border)" }}>
      <div className="flex rounded-xl p-0.5" style={{ background: "var(--c-bg)" }}>
        {([["all","전체"],["ja","🇯🇵"],["en","🇺🇸"]] as const).map(([k,l]) => (
          <button key={k} onClick={() => handleLangFilter(k)}
            className="flex-1 py-1.5 rounded-[10px] text-xs font-medium transition-colors"
            style={{
              background: langFilter === k ? "var(--c-surface)" : "transparent",
              color: langFilter === k ? "var(--c-text)" : "var(--c-muted)",
              boxShadow: langFilter === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex rounded-xl p-0.5" style={{ background: "var(--c-bg)" }}>
          {(["card","list"] as const).map((m) => (
            <button key={m} onClick={() => setViewMode(m)}
              className="px-4 py-1.5 rounded-[10px] text-xs font-medium transition-colors"
              style={{
                background: viewMode === m ? "var(--c-surface)" : "transparent",
                color: viewMode === m ? "var(--c-text)" : "var(--c-muted)",
                boxShadow: viewMode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}>
              {m === "card" ? "카드" : "목록"}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--c-subtle)" }}>
          {filteredCards.length}개 / 최대 {MAX_FREE_FLASHCARDS}개
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
        <Header title="플래시카드" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--c-subtle)" }}>로딩 중...</div>
        <BottomNav />
      </div>
    );
  }

  if (visibleCards.length === 0) {
    return (
      <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
        <Header title="플래시카드" showBack onBack={() => router.push("/")} />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--c-indigo-l)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="var(--c-indigo)" strokeWidth="1.6" strokeLinecap="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <p className="text-sm font-medium" style={{ color: "var(--c-muted)" }}>저장된 플래시카드가 없습니다</p>
          <p className="text-xs" style={{ color: "var(--c-subtle)" }}>대시보드에서 자주 쓴 문장을 추가해보세요</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, Math.max(filteredCards.length - 1, 0));
  const card = filteredCards[safeIndex];
  const isKoSource = card?.direction.startsWith("ko");

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
      <Header title="플래시카드" showBack onBack={() => router.push("/")} />
      <FilterBar />

      {viewMode === "card" ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
          {!card ? (
            <p className="text-sm" style={{ color: "var(--c-subtle)" }}>이 언어의 카드가 없습니다</p>
          ) : (
            <>
              <p className="text-xs mb-5" style={{ color: "var(--c-subtle)" }}>
                {safeIndex + 1} / {filteredCards.length}
              </p>

              <div
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full rounded-3xl p-6 cursor-pointer transition-shadow active:shadow-lg relative"
                style={{
                  background: card.mastered ? "oklch(98% 0.04 85)" : "var(--c-surface)",
                  border: `1.5px solid ${card.mastered ? "oklch(88% 0.08 85)" : "var(--c-border)"}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
                  minHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {card.enriched_data && (
                  <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: "var(--c-indigo-l)", color: "var(--c-indigo)" }}>
                    ✨ AI 카드
                  </div>
                )}

                {card.mastered && (
                  <div className="absolute top-4 left-4 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: "oklch(94% 0.08 85)", color: "oklch(50% 0.17 85)" }}>
                    ★ 암기 완료
                  </div>
                )}

                {!isFlipped ? (
                  <>
                    <p className="text-xl font-semibold text-center leading-relaxed" style={{ color: "var(--c-text)" }}>
                      {isKoSource ? card.original_text : card.translated_text}
                    </p>
                    <p className="text-xs mt-6" style={{ color: "var(--c-subtle)" }}>탭하여 뒤집기</p>
                  </>
                ) : (
                  <div className="w-full">
                    {card.enriched_data?.natural ? (
                      <>
                        <p className="text-[11px] text-center mb-1" style={{ color: "var(--c-subtle)" }}>AI 추천 표현</p>
                        <p className="text-xl font-semibold text-center leading-relaxed" style={{ color: "var(--c-teal)" }}>
                          {card.enriched_data.natural}
                        </p>
                        {card.enriched_data.naturalPronunciation && (
                          <p className="text-sm text-center mt-1" style={{ color: "var(--c-muted)" }}>
                            {card.enriched_data.naturalPronunciation}
                          </p>
                        )}
                        {card.enriched_data.wordBreakdown && card.enriched_data.wordBreakdown.length > 0 && (
                          <div className="mt-4 rounded-xl p-3" style={{ background: "var(--c-bg)" }}>
                            <p className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>단어 분석</p>
                            {card.enriched_data.wordBreakdown.map((w, i) => (
                              <p key={i} className="text-xs mb-1" style={{ color: "var(--c-muted)" }}>
                                <span className="font-semibold" style={{ color: "var(--c-text)" }}>{w.word}</span>
                                {w.reading && <span style={{ color: "var(--c-subtle)" }}> ({w.reading})</span>}
                                <span> — {w.meaning}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        {card.enriched_data.nuance && (
                          <div className="mt-3 rounded-xl p-3" style={{ background: "var(--c-bg)" }}>
                            <p className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>뉘앙스</p>
                            <p className="text-xs leading-relaxed" style={{ color: "var(--c-muted)" }}>{card.enriched_data.nuance}</p>
                          </div>
                        )}
                        {card.enriched_data.example?.text && (
                          <div className="mt-3 rounded-xl p-3" style={{ background: "var(--c-bg)" }}>
                            <p className="text-[10px] font-semibold mb-1 uppercase tracking-wider" style={{ color: "var(--c-subtle)" }}>예문</p>
                            <p className="text-xs" style={{ color: "var(--c-text)" }}>{card.enriched_data.example.text}</p>
                            {card.enriched_data.example.reading && (
                              <p className="text-xs mt-0.5" style={{ color: "var(--c-subtle)" }}>{card.enriched_data.example.reading}</p>
                            )}
                            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{card.enriched_data.example.translation}</p>
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailCard(card); }}
                          className="mt-3 w-full py-2 rounded-xl text-xs font-semibold transition-colors active:opacity-70"
                          style={{ background: "var(--c-indigo-l)", color: "var(--c-indigo)" }}>
                          상세 보기
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-center leading-relaxed" style={{ color: "var(--c-teal)" }}>
                          {isKoSource ? card.translated_text : card.original_text}
                        </p>
                        {card.pronunciation && (
                          <p className="text-base text-center mt-2" style={{ color: "var(--c-muted)" }}>
                            {card.pronunciation}
                          </p>
                        )}
                        {card.pinyin_text && (
                          <p className="text-sm text-center mt-1 italic" style={{ color: "var(--c-subtle)" }}>
                            {card.pinyin_text}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs mt-3" style={{ color: "var(--c-subtle)" }}>
                📍 {card.conversation_title}
              </p>

              <div className="flex items-center gap-3 mt-6">
                <button onClick={handlePrev}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white active:opacity-70 transition-opacity"
                  style={{ border: "1.5px solid var(--c-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>

                <button onClick={() => toggleMasteredById(card.id)}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center active:opacity-70 transition-opacity"
                  style={{
                    background: card.mastered ? "oklch(94% 0.08 85)" : "oklch(97% 0.04 85)",
                    border: `1.5px solid ${card.mastered ? "oklch(85% 0.10 85)" : "oklch(90% 0.06 85)"}`,
                  }}>
                  <svg width="22" height="22" viewBox="0 0 24 24"
                    fill={card.mastered ? "oklch(55% 0.18 85)" : "none"}
                    stroke="oklch(55% 0.18 85)" strokeWidth="2" strokeLinecap="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>

                <button onClick={() => deleteCardById(card.id)}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center active:opacity-70 transition-opacity"
                  style={{ background: "oklch(97% 0.03 25)", border: "1.5px solid oklch(90% 0.06 25)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="var(--c-red)" strokeWidth="2.2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                  </svg>
                </button>

                <button onClick={handleNext}
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white active:opacity-70 transition-opacity"
                  style={{ border: "1.5px solid var(--c-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3 page-safe-bottom space-y-2">
          {filteredCards.length === 0 && (
            <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--c-subtle)" }}>
              이 언어의 카드가 없습니다
            </div>
          )}
          {filteredCards.map((c) => (
            <div key={c.id}
              className="flex items-center gap-3 p-4 rounded-2xl bg-white"
              style={{
                border: `1.5px solid ${c.mastered ? "oklch(88% 0.08 85)" : "var(--c-border)"}`,
                background: c.mastered ? "oklch(98% 0.04 85)" : "var(--c-surface)",
              }}>
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: "var(--c-text)" }}>{c.original_text}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--c-teal)" }}>{c.translated_text}</p>
                {c.pronunciation && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--c-subtle)" }}>{c.pronunciation}</p>
                )}
                <p className="text-[10px] mt-1" style={{ color: "var(--c-subtle)" }}>📍 {c.conversation_title}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {c.enriched_data && (
                  <button onClick={() => setDetailCard(c)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center active:opacity-60"
                    style={{ background: "var(--c-indigo-l)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                      stroke="var(--c-indigo)" strokeWidth="2.2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </button>
                )}
                <button onClick={() => toggleMasteredById(c.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center active:opacity-60"
                  style={{ background: c.mastered ? "oklch(94% 0.08 85)" : "var(--c-bg)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24"
                    fill={c.mastered ? "oklch(55% 0.18 85)" : "none"}
                    stroke="oklch(55% 0.18 85)" strokeWidth="2.2" strokeLinecap="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <button onClick={() => deleteCardById(c.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center active:opacity-60"
                  style={{ background: "var(--c-bg)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="var(--c-muted)" strokeWidth="2.2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BottomNav />

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
