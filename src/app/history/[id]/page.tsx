"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import MessageBubble, { Message } from "@/components/MessageBubble";

const MAX_FREE_FLASHCARDS = 20;

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

  const addToFlashcard = async (messageId: string) => {
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
      .eq("message_id", messageId);

    if (existing && existing.length > 0) {
      alert("이미 플래시카드에 추가된 문장입니다.");
      return;
    }

    const { error } = await supabase
      .from("flashcards")
      .insert({ message_id: messageId });

    if (error) {
      alert("추가에 실패했습니다.");
      return;
    }

    setFlashcardCount((prev) => prev + 1);
    alert("플래시카드에 추가했습니다!");
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
            <div className="px-4 py-2 text-xs text-gray-400 text-center">
              문장을 탭하면 플래시카드에 추가됩니다 ({flashcardCount}/{MAX_FREE_FLASHCARDS})
            </div>
            {messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => addToFlashcard(msg.id)}
                className="cursor-pointer active:opacity-70 transition-opacity"
              >
                <MessageBubble message={msg} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
