"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import ChatInput from "@/components/ChatInput";
import MessageBubble, { Message, Direction } from "@/components/MessageBubble";

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

  if (!res.ok) {
    throw new Error("번역 실패");
  }

  const data = await res.json();
  return {
    translated: data.translatedText,
    pronunciation: data.pronunciation,
    pinyinText: data.pinyinText,
  };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [language, setLanguage] = useState<Language>("zh");
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

  const handleToggleDirection = () => {
    setIsKoSource((prev) => !prev);
  };

  const handleChangeLanguage = (lang: Language) => {
    setLanguage(lang);
  };

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
        await supabase
          .from("conversations")
          .update({ title })
          .eq("id", convId);
      }

      const newMessage: Message = {
        id: savedMessage.id,
        direction: savedMessage.direction,
        originalText: savedMessage.original_text,
        translatedText: savedMessage.translated_text,
        pronunciation: savedMessage.pronunciation,
        pinyinText: savedMessage.pinyin_text,
        createdAt: new Date(savedMessage.created_at),
      };
      setMessages((prev) => [...prev, newMessage]);
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
    <div className="flex flex-col h-full max-w-lg mx-auto bg-gray-50">
      <Header onNewConversation={handleNewConversation} />

      <div className="flex-1 overflow-y-auto pb-2">
        {!loaded ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            대화를 시작해보세요
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        {isTranslating && (
          <div className="px-4 py-2 text-sm text-gray-400">번역 중...</div>
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
    </div>
  );
}
