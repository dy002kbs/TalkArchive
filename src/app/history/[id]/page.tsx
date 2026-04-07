"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import MessageBubble, { Message } from "@/components/MessageBubble";
import AddFlashcardModal from "@/components/AddFlashcardModal";
import { EnrichedData } from "@/components/EnrichModal";

const MAX_FREE_FLASHCARDS = 20;

// 내보내기 권한 (나중에 유료화 시 false로 변경)
const EXPORT_ALLOWED = true;

const DIRECTION_FLAGS: Record<string, string> = {
  ko2zh: "🇰🇷→🇨🇳",
  zh2ko: "🇨🇳→🇰🇷",
  ko2ja: "🇰🇷→🇯🇵",
  ja2ko: "🇯🇵→🇰🇷",
  ko2en: "🇰🇷→🇺🇸",
  en2ko: "🇺🇸→🇰🇷",
};

export default function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashcardCount, setFlashcardCount] = useState(0);
  const [enrichTarget, setEnrichTarget] = useState<Message | null>(null);

  useEffect(() => {
    loadConversation();
    loadFlashcardCount();
  }, [id]);

  const loadConversation = async () => {
    const { data: conv } = await supabase
      .from("conversations")
      .select("title")
      .eq("id", id)
      .single();

    if (conv) setTitle(conv.title);

    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgs) {
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          direction: m.direction,
          originalText: m.original_text,
          translatedText: m.translated_text,
          pronunciation: m.pronunciation,
          pinyinText: m.pinyin_text,
          createdAt: new Date(m.created_at),
        }))
      );
    }
    setLoading(false);
  };

  const loadFlashcardCount = async () => {
    const { count } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true });
    setFlashcardCount(count || 0);
  };

  const startAddToFlashcard = async (msg: Message) => {
    if (flashcardCount >= MAX_FREE_FLASHCARDS) {
      alert(
        `무료 플래시카드는 최대 ${MAX_FREE_FLASHCARDS}개까지 가능합니다. 기존 카드를 삭제하거나 프리미엄으로 업그레이드하세요.`
      );
      return;
    }

    // 이미 추가된 메시지인지 확인
    const { data: existing } = await supabase
      .from("flashcards")
      .select("id")
      .eq("message_id", msg.id);

    if (existing && existing.length > 0) {
      alert("이미 플래시카드에 추가된 문장입니다.");
      return;
    }

    setEnrichTarget(msg);
  };

  const saveFlashcard = async (enriched: EnrichedData | null) => {
    if (!enrichTarget) return;

    const { error } = await supabase
      .from("flashcards")
      .insert({
        message_id: enrichTarget.id,
        enriched_data: enriched,
      });

    if (error) {
      alert("추가에 실패했습니다.");
      return;
    }

    setFlashcardCount((prev) => prev + 1);
    setEnrichTarget(null);
  };

  const exportConversation = () => {
    if (!EXPORT_ALLOWED) {
      alert("프리미엄 전용 기능입니다.");
      return;
    }
    if (messages.length === 0) {
      alert("내보낼 메시지가 없습니다.");
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];
    lines.push(`TalkArchive 대화 기록`);
    lines.push(`====================`);
    lines.push(`제목: ${title}`);
    lines.push(`내보낸 날짜: ${dateStr}`);
    lines.push(`메시지 수: ${messages.length}개`);
    lines.push(``);
    lines.push(`----`);
    lines.push(``);

    messages.forEach((m) => {
      lines.push(`[${DIRECTION_FLAGS[m.direction] || m.direction}]`);
      lines.push(`원문: ${m.originalText}`);
      lines.push(`번역: ${m.translatedText}`);
      if (m.pronunciation) lines.push(`발음: ${m.pronunciation}`);
      if (m.pinyinText) lines.push(`병음: ${m.pinyinText}`);
      lines.push(``);
    });

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = title.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, "").trim() || "대화";
    a.href = url;
    a.download = `TalkArchive_${safeTitle}_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header title={title || "대화"} showBack onBack={() => router.push("/history")} />

      <div className="flex-1 overflow-y-auto pb-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            메시지가 없습니다
          </div>
        ) : (
          <>
            <div className="px-4 py-2 flex items-center justify-between gap-2">
              <p className="text-xs text-gray-400">
                문장을 탭하면 플래시카드에 추가됩니다 ({flashcardCount}/{MAX_FREE_FLASHCARDS})
              </p>
              <button
                onClick={exportConversation}
                className="px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium active:bg-blue-100 transition-colors whitespace-nowrap"
              >
                ⬇ 내보내기
              </button>
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => startAddToFlashcard(msg)}
                className="cursor-pointer active:opacity-70 transition-opacity"
              >
                <MessageBubble message={msg} />
              </div>
            ))}
          </>
        )}
      </div>

      {enrichTarget && (
        <AddFlashcardModal
          originalText={enrichTarget.originalText}
          translatedText={enrichTarget.translatedText}
          pronunciation={enrichTarget.pronunciation}
          direction={enrichTarget.direction}
          onClose={() => setEnrichTarget(null)}
          onSave={saveFlashcard}
        />
      )}
    </div>
  );
}
