"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import ChatInput from "@/components/ChatInput";
import MessageBubble, { Message, Direction } from "@/components/MessageBubble";
import BottomNav from "@/components/BottomNav";

const STORAGE_KEY = "talkarchive_current_conversation";

type Language = "zh" | "ja" | "en";

async function translate(
  text: string,
  direction: Direction
): Promise<{ translated: string; pronunciation: string; pinyinText: string }> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, direction }),
  });
  if (!res.ok) throw new Error("번역 실패");
  const data = await res.json();
  return {
    translated: data.translatedText,
    pronunciation: data.pronunciation,
    pinyinText: data.pinyinText,
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<Language>("ja");
  const [isKoSource, setIsKoSource] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const direction: Direction = isKoSource
    ? language === "zh" ? "ko2zh" : language === "ja" ? "ko2ja" : "ko2en"
    : language === "zh" ? "zh2ko" : language === "ja" ? "ja2ko" : "en2ko";

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) {
      setConversationId(savedId);
      loadMessages(savedId);
    } else {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loaded]);

  const loadMessages = async (convId: string) => {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (msgs && msgs.length > 0) {
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
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setConversationId(null);
    }
    setLoaded(true);
  };

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const { data, error } = await supabase
      .from("conversations")
      .insert({ title: "새 대화" })
      .select("id")
      .single();
    if (error) throw error;
    setConversationId(data.id);
    localStorage.setItem(STORAGE_KEY, data.id);
    return data.id;
  }, [conversationId]);

  const handleToggleDirection = () => setIsKoSource((prev) => !prev);
  const handleChangeLanguage = (lang: Language) => setLanguage(lang);

  const handleSend = async (text: string) => {
    setIsTranslating(true);
    try {
      const result = await translate(text, direction);
      const convId = await ensureConversation();

      const { data: savedMessage, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          direction,
          original_text: text,
          translated_text: result.translated,
          pronunciation: result.pronunciation,
          pinyin_text: result.pinyinText,
        })
        .select()
        .single();

      if (error) throw error;

      if (messages.length === 0) {
        const title = text.length > 30 ? text.slice(0, 30) + "..." : text;
        await supabase.from("conversations").update({ title }).eq("id", convId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: savedMessage.id,
          direction: savedMessage.direction,
          originalText: savedMessage.original_text,
          translatedText: savedMessage.translated_text,
          pronunciation: savedMessage.pronunciation,
          pinyinText: savedMessage.pinyin_text,
          createdAt: new Date(savedMessage.created_at),
        },
      ]);
    } catch {
      alert("번역에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleNewConversation = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto" style={{ background: "var(--c-bg)" }}>
      <Header onNewConversation={handleNewConversation} />

      <div className="flex-1 overflow-y-auto py-2">
        {!loaded ? (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: "var(--c-subtle)" }}>
            로딩 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--c-indigo-l)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="var(--c-indigo)" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--c-muted)" }}>
              대화를 시작해보세요
            </p>
            <p className="text-xs text-center px-8 leading-relaxed" style={{ color: "var(--c-subtle)" }}>
              아래에서 언어를 선택하고<br />번역할 문장을 입력하세요
            </p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} />)
        )}

        {isTranslating && (
          <div className="px-4 py-1">
            <div className="inline-flex px-4 py-2.5 rounded-2xl bg-white"
              style={{ border: "1px solid var(--c-border)" }}>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: "var(--c-subtle)", animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        direction={direction}
        language={language}
        onChangeLanguage={handleChangeLanguage}
        onToggleDirection={handleToggleDirection}
        onSend={handleSend}
      />

      <BottomNav />
    </div>
  );
}
